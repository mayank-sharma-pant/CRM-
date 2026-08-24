from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.models.core.user import User
from app.models.core.invite import Invite, InviteStatus
from app.models.billing import Plan, Subscription

_UPGRADE_PATH = "/settings/billing"


def resolve_plan(db: Session, company_id: int) -> Plan:
    sub = db.query(Subscription).filter(Subscription.company_id == company_id).first()
    if sub:
        plan = db.query(Plan).filter(Plan.id == sub.plan_id).first()
        if plan:
            return plan
    return db.query(Plan).filter(Plan.name == "Starter").one()


def current_seat_usage(db: Session, company_id: int) -> int:
    users = db.query(User).filter(User.company_id == company_id, User.status != "disabled").count()
    invites = db.query(Invite).filter(Invite.company_id == company_id,
                                       Invite.status == InviteStatus.PENDING).count()
    return users + invites


def _deny(limit, current, resource):
    raise HTTPException(status_code=402, detail={
        "message": f"{resource} limit reached for your plan.",
        "limit": limit, "current": current, "upgrade_path": _UPGRADE_PATH,
    })


def assert_can_add_user(db: Session, company_id: int) -> None:
    plan = resolve_plan(db, company_id)
    used = current_seat_usage(db, company_id)
    if used >= plan.max_users:
        _deny(plan.max_users, used, "Seat")


def assert_can_add_team(db: Session, company_id: int) -> None:
    from app.models.core.team import Team
    plan = resolve_plan(db, company_id)
    used = db.query(Team).filter(Team.company_id == company_id).count()
    if used >= plan.max_teams:
        _deny(plan.max_teams, used, "Team")


def assert_can_upload(db: Session, company_id: int, incoming_bytes: int) -> None:
    from app.models.ops.document import Document
    plan = resolve_plan(db, company_id)
    if plan.max_storage_gb is None:
        return
    used = db.query(func.coalesce(func.sum(Document.file_size), 0)).filter(
        Document.company_id == company_id).scalar() or 0
    cap = plan.max_storage_gb * (1024 ** 3)
    if used + incoming_bytes > cap:
        _deny(cap, used, "Storage")
