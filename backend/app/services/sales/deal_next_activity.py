"""Next activity + last timeline touch for open deals (Phase 7.8)."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, time, timedelta, timezone
from typing import Optional

from sqlalchemy import Integer, cast, func, select, union_all
from sqlalchemy.orm import Session

from app.models.core.enums import DealStageType, MeetingStatus, TaskStatus
from app.models.sales.audit import AuditLog
from app.models.sales.call_log import CallLog
from app.models.sales.deal import Deal
from app.models.sales.email_log import EmailLog
from app.models.sales.meeting import Meeting
from app.models.sales.pipeline import PipelineStage
from app.models.sales.task import Task

ROTTING_DAYS = 14


class NextActivityRequired(Exception):
    pass


@dataclass(frozen=True)
class NextActivity:
    kind: str
    source_id: int
    title: str
    at: datetime


def utc_now_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def start_of_utc_day(day: datetime | None = None) -> datetime:
    ref = day or utc_now_naive()
    return datetime.combine(ref.date(), time.min)


def requires_next_activity(current: PipelineStage, target: PipelineStage) -> bool:
    if target.stage_type in (DealStageType.WON, DealStageType.LOST):
        return True
    cur_pos = current.position or 0
    tgt_pos = target.position or 0
    return tgt_pos > cur_pos


def _next_from_tasks(db: Session, company_id: int, deal_id: int) -> Optional[NextActivity]:
    cutoff = start_of_utc_day()
    row = (
        db.query(Task)
        .filter(
            Task.company_id == company_id,
            Task.deal_id == deal_id,
            Task.status != TaskStatus.COMPLETED,
            Task.due_date.isnot(None),
            Task.due_date >= cutoff,
        )
        .order_by(Task.due_date.asc())
        .first()
    )
    if row is None:
        return None
    return NextActivity("task", row.id, row.title, row.due_date)


def _next_from_meetings(db: Session, company_id: int, deal_id: int) -> Optional[NextActivity]:
    now = utc_now_naive()
    row = (
        db.query(Meeting)
        .filter(
            Meeting.company_id == company_id,
            Meeting.deal_id == deal_id,
            Meeting.status == MeetingStatus.SCHEDULED,
            Meeting.starts_at >= now,
        )
        .order_by(Meeting.starts_at.asc())
        .first()
    )
    if row is None:
        return None
    return NextActivity("meeting", row.id, row.subject, row.starts_at)


def next_activity_for_deal(db: Session, deal: Deal) -> Optional[NextActivity]:
    candidates = [
        _next_from_tasks(db, deal.company_id, deal.id),
        _next_from_meetings(db, deal.company_id, deal.id),
    ]
    candidates = [c for c in candidates if c is not None]
    if not candidates:
        return None
    return min(candidates, key=lambda c: c.at)


def has_next_activity(db: Session, deal: Deal) -> bool:
    return next_activity_for_deal(db, deal) is not None


def assert_next_activity_for_move(
    db: Session,
    *,
    deal: Deal,
    current_stage: PipelineStage,
    target_stage: PipelineStage,
) -> None:
    if deal.closed_at is not None:
        return
    if current_stage.id == target_stage.id:
        return
    if not requires_next_activity(current_stage, target_stage):
        return
    if not has_next_activity(db, deal):
        raise NextActivityRequired(
            "Schedule a next task or meeting before moving this deal"
        )


def _touch_union(company_id: int):
    parts = [
        select(EmailLog.deal_id.label("deal_id"), EmailLog.created_at.label("ts")).where(
            EmailLog.company_id == company_id,
            EmailLog.deal_id.isnot(None),
        ),
        select(CallLog.deal_id.label("deal_id"), CallLog.logged_at.label("ts")).where(
            CallLog.company_id == company_id,
            CallLog.deal_id.isnot(None),
        ),
        select(Meeting.deal_id.label("deal_id"), Meeting.starts_at.label("ts")).where(
            Meeting.company_id == company_id,
            Meeting.deal_id.isnot(None),
        ),
        select(Task.deal_id.label("deal_id"), Task.updated_at.label("ts")).where(
            Task.company_id == company_id,
            Task.deal_id.isnot(None),
        ),
        select(
            cast(AuditLog.entity_id, Integer).label("deal_id"),
            AuditLog.timestamp.label("ts"),
        ).where(
            AuditLog.company_id == company_id,
            AuditLog.entity_type == "deal",
            AuditLog.entity_id.isnot(None),
        ),
    ]
    return union_all(*parts).subquery("deal_touches")


def last_touch_map(db: Session, company_id: int, deal_ids: list[int]) -> dict[int, datetime]:
    if not deal_ids:
        return {}
    union = _touch_union(company_id)
    rows = (
        db.query(union.c.deal_id, func.max(union.c.ts))
        .filter(union.c.deal_id.in_(deal_ids))
        .group_by(union.c.deal_id)
        .all()
    )
    return {int(deal_id): ts for deal_id, ts in rows if deal_id is not None and ts is not None}


def rotting_cutoff() -> datetime:
    return utc_now_naive() - timedelta(days=ROTTING_DAYS)


def apply_rotting_by_last_touch(query, db: Session, company_id: int):
    cutoff = rotting_cutoff()
    union = _touch_union(company_id)
    touch_sq = (
        select(union.c.deal_id, func.max(union.c.ts).label("last_touch"))
        .group_by(union.c.deal_id)
        .subquery()
    )
    rotting_ids = (
        select(Deal.id)
        .outerjoin(touch_sq, Deal.id == touch_sq.c.deal_id)
        .where(
            Deal.company_id == company_id,
            Deal.closed_at.is_(None),
            func.coalesce(touch_sq.c.last_touch, Deal.created_at) < cutoff,
        )
    )
    return query.filter(Deal.id.in_(rotting_ids))


def enrich_deal_activity_fields(db: Session, deal: Deal, stage: PipelineStage) -> dict:
    next_act = next_activity_for_deal(db, deal)
    touches = last_touch_map(db, deal.company_id, [deal.id])
    last_touch = touches.get(deal.id) or deal.created_at
    missing = (
        deal.closed_at is None
        and stage is not None
        and stage.stage_type == DealStageType.OPEN
        and next_act is None
    )
    payload = {
        "last_touch_at": last_touch.isoformat() if last_touch else None,
        "missing_next_activity": missing,
    }
    if next_act:
        payload["next_activity"] = {
            "kind": next_act.kind,
            "id": next_act.source_id,
            "title": next_act.title,
            "at": next_act.at.isoformat() if next_act.at else None,
        }
    else:
        payload["next_activity"] = None
    return payload
