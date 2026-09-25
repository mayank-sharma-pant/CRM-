"""In-app daily desk digest: unassigned, unanswered WhatsApp, overdue meetings."""
from datetime import datetime, timezone

from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session

from app.models.core.enums import MeetingStatus
from app.models.core.team_membership import TeamMembership
from app.models.core.user import User
from app.models.sales.client import Client
from app.models.sales.lead import Lead
from app.models.sales.meeting import Meeting
from app.models.sales.notification import Notification
from app.models.sales.whatsapp import WhatsAppMessage
from app.utils.dependencies import apply_company_scope
from app.utils.notify import send_notification

DIGEST_TITLE = "Daily desk"
_DIGEST_ROLES = frozenset({"sales", "manager", "md"})
_DASHBOARD_LINKS = {
    "sales": "/sales/dashboard",
    "manager": "/manager/dashboard",
    "md": "/md/dashboard",
}


def _role_str(user: User) -> str:
    role = getattr(user, "role", None)
    if role is None:
        return ""
    return str(getattr(role, "value", role))


def _notification_created_utc_day(created_at: datetime | None):
    if created_at is None:
        return None
    if getattr(created_at, "tzinfo", None) is not None:
        return created_at.astimezone(timezone.utc).date()
    return created_at.date()


def _digest_sent_today(db: Session, user_id: int, utc_day) -> bool:
    rows = (
        db.query(Notification.created_at)
        .filter(Notification.user_id == user_id, Notification.title == DIGEST_TITLE)
        .all()
    )
    for (created_at,) in rows:
        if _notification_created_utc_day(created_at) == utc_day:
            return True
    return False


def _latest_thread_ids_subquery(db: Session, user: User):
    def grouped(filters, group_col):
        q = apply_company_scope(
            db.query(func.max(WhatsAppMessage.id)),
            WhatsAppMessage,
            user,
        )
        for predicate in filters:
            q = q.filter(predicate)
        return q.group_by(group_col)

    return grouped(
        [WhatsAppMessage.lead_id.isnot(None)],
        WhatsAppMessage.lead_id,
    ).union_all(
        grouped(
            [WhatsAppMessage.lead_id.is_(None), WhatsAppMessage.client_id.isnot(None)],
            WhatsAppMessage.client_id,
        ),
        grouped(
            [WhatsAppMessage.lead_id.is_(None), WhatsAppMessage.client_id.is_(None)],
            WhatsAppMessage.to_phone,
        ),
    )


def _count_unassigned_leads(db: Session, user: User) -> int | None:
    role = _role_str(user)
    if role == "manager" and user.team_id is None:
        return None
    query = (
        apply_company_scope(db.query(Lead), Lead, user)
        .filter(Lead.deleted_at.is_(None), Lead.assigned_to_id.is_(None))
    )
    if role == "manager":
        query = query.filter(Lead.team_id == user.team_id)
    elif role == "sales":
        if user.team_id is None:
            return 0
        query = query.filter(Lead.team_id == user.team_id)
    return query.count()


def _scoped_unanswered_query(db: Session, user: User):
    role = _role_str(user)
    query = (
        apply_company_scope(db.query(WhatsAppMessage), WhatsAppMessage, user)
        .filter(
            WhatsAppMessage.id.in_(_latest_thread_ids_subquery(db, user)),
            WhatsAppMessage.direction == "inbound",
        )
    )
    if role == "sales":
        return query.join(Lead, WhatsAppMessage.lead_id == Lead.id).filter(
            Lead.assigned_to_id == user.id
        )
    if role == "manager":
        if user.team_id is None:
            return query.filter(False)
        member_ids = [
            uid
            for (uid,) in apply_company_scope(
                db.query(TeamMembership.user_id), TeamMembership, user
            )
            .filter(TeamMembership.team_id == user.team_id)
            .all()
        ]
        sent_in_team = WhatsAppMessage.sent_by_id.in_(member_ids) if member_ids else False
        return (
            query.outerjoin(Lead, WhatsAppMessage.lead_id == Lead.id)
            .outerjoin(Client, WhatsAppMessage.client_id == Client.id)
            .filter(
                or_(
                    and_(
                        WhatsAppMessage.lead_id.isnot(None),
                        or_(Lead.team_id == user.team_id, sent_in_team),
                    ),
                    and_(
                        WhatsAppMessage.lead_id.is_(None),
                        WhatsAppMessage.client_id.isnot(None),
                        or_(Client.team_id == user.team_id, sent_in_team),
                    ),
                )
            )
        )
    return query


def _count_unanswered_threads(db: Session, user: User) -> int | None:
    role = _role_str(user)
    if role == "manager" and user.team_id is None:
        return None
    return _scoped_unanswered_query(db, user).count()


def _count_overdue_meetings(db: Session, user: User, now: datetime) -> int | None:
    role = _role_str(user)
    if role == "manager" and user.team_id is None:
        return None
    scheduled = Meeting.status == MeetingStatus.SCHEDULED.value
    query = apply_company_scope(db.query(Meeting), Meeting, user).filter(
        scheduled,
        Meeting.starts_at < now,
    )
    if role == "sales":
        return (
            query.outerjoin(Lead, Meeting.lead_id == Lead.id)
            .filter(
                or_(
                    Meeting.created_by_id == user.id,
                    Lead.assigned_to_id == user.id,
                )
            )
            .count()
        )
    if role == "manager":
        member_ids = [
            uid
            for (uid,) in apply_company_scope(
                db.query(TeamMembership.user_id), TeamMembership, user
            )
            .filter(TeamMembership.team_id == user.team_id)
            .all()
        ]
        created_in_team = Meeting.created_by_id.in_(member_ids) if member_ids else False
        return (
            query.outerjoin(Lead, Meeting.lead_id == Lead.id)
            .filter(or_(Lead.team_id == user.team_id, created_in_team))
            .count()
        )
    return query.count()


def run_daily_digests(db: Session, now: datetime | None = None) -> int:
    now = now or datetime.utcnow()
    utc_day = now.date()
    inserted = 0

    users = (
        db.query(User)
        .filter(
            User.is_active == True,
            User.company_id.isnot(None),
            User.role.in_(tuple(_DIGEST_ROLES)),
        )
        .all()
    )

    for user in users:
        role = _role_str(user)
        if role not in _DIGEST_ROLES:
            continue
        if role == "manager" and user.team_id is None:
            continue
        if _digest_sent_today(db, user.id, utc_day):
            continue

        unassigned = _count_unassigned_leads(db, user)
        if unassigned is None:
            continue
        unanswered = _count_unanswered_threads(db, user)
        if unanswered is None:
            continue
        overdue = _count_overdue_meetings(db, user, now)
        if overdue is None:
            continue

        if unassigned == 0 and unanswered == 0 and overdue == 0:
            continue

        message = f"{unassigned} unassigned, {unanswered} unanswered, {overdue} overdue"
        link = _DASHBOARD_LINKS[role]
        if send_notification(
            db,
            user.id,
            DIGEST_TITLE,
            message,
            type="info",
            link=link,
            category="leads",
        ):
            inserted += 1

    return inserted
