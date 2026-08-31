"""Projected activity feed for lead / client / deal (no extra table)."""
from datetime import datetime, time, timezone
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.core.user import User
from app.models.sales.audit import AuditLog
from app.models.sales.call_log import CallLog
from app.models.sales.client import Client
from app.models.sales.deal import Deal
from app.models.sales.email_log import EmailLog
from app.models.sales.follow_up import FollowUp
from app.models.sales.lead import Lead
from app.models.sales.meeting import Meeting
from app.models.sales.note import Note
from app.models.sales.task import Task
from app.models.sales.whatsapp import WhatsAppMessage
from app.utils.datetime_json import isoformat_utc
from app.utils.dependencies import apply_company_scope

_PARENTS = {"lead": Lead, "client": Client, "deal": Deal}


def _naive(dt: Optional[datetime]) -> datetime:
    if dt is None:
        return datetime.min
    if dt.tzinfo is not None:
        return dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


def _clip(text: Optional[str], n: int = 500) -> Optional[str]:
    if text is None:
        return None
    value = str(text).strip()
    if not value:
        return None
    return value if len(value) <= n else value[: n - 1] + "…"


def _item(kind: str, source_id: int, title: str, body: Optional[str], occurred_at) -> dict:
    when = occurred_at
    if not isinstance(when, datetime):
        when = datetime.min
    return {
        "id": f"{kind}:{source_id}",
        "kind": kind,
        "title": title,
        "body": body,
        "occurred_at": isoformat_utc(when),
        "source_id": source_id,
    }


def _enum_val(value) -> str:
    return value.value if hasattr(value, "value") else str(value or "")


def require_timeline_parent(db: Session, current_user: User, entity_type: str, entity_id: int):
    model = _PARENTS[entity_type]
    row = apply_company_scope(db.query(model), model, current_user).filter(model.id == entity_id).first()
    if row is None:
        raise HTTPException(status_code=404, detail="Not found")
    return row


def _filter_parent(query, model, entity_type: str, entity_id: int):
    col = getattr(model, f"{entity_type}_id")
    return query.filter(col == entity_id)


def build_activity_feed(
    db: Session,
    current_user: User,
    entity_type: str,
    entity_id: int,
    skip: int,
    limit: int,
) -> dict:
    require_timeline_parent(db, current_user, entity_type, entity_id)
    items = []

    def scoped(model):
        return apply_company_scope(db.query(model), model, current_user)

    emails = _filter_parent(scoped(EmailLog), EmailLog, entity_type, entity_id).all()
    for row in emails:
        direction = row.direction or "outbound"
        items.append(_item(
            "email",
            row.id,
            row.subject or "(no subject)",
            _clip(row.body),
            row.created_at,
        ))
        items[-1]["title"] = f"{direction.capitalize()} · {items[-1]['title']}"

    calls = _filter_parent(scoped(CallLog), CallLog, entity_type, entity_id).all()
    for row in calls:
        direction = _enum_val(row.direction) or "call"
        bits = [row.outcome, f"{row.duration_seconds}s" if row.duration_seconds is not None else None]
        items.append(_item(
            "call",
            row.id,
            f"{direction.capitalize()} call",
            _clip(" · ".join(b for b in bits if b) or row.notes),
            row.logged_at or row.created_at,
        ))

    meetings = _filter_parent(scoped(Meeting), Meeting, entity_type, entity_id).all()
    for row in meetings:
        status = _enum_val(row.status)
        loc = f" · {row.location}" if row.location else ""
        items.append(_item(
            "meeting",
            row.id,
            row.subject,
            _clip(f"{status}{loc}".strip() or row.notes),
            row.starts_at or row.created_at,
        ))

    if entity_type in ("lead", "client", "deal"):
        tasks = _filter_parent(scoped(Task), Task, entity_type, entity_id).all()
        for row in tasks:
            items.append(_item(
                "task",
                row.id,
                row.title,
                _clip(_enum_val(row.status)),
                row.due_date or row.created_at,
            ))

    # Notes and WhatsApp messages are only linked to leads/clients, not deals.
    if entity_type in ("lead", "client"):
        notes = _filter_parent(scoped(Note), Note, entity_type, entity_id).all()
        for row in notes:
            items.append(_item("note", row.id, "Note", _clip(row.content), row.created_at))

        wa = _filter_parent(scoped(WhatsAppMessage), WhatsAppMessage, entity_type, entity_id).all()
        for row in wa:
            items.append(_item(
                "whatsapp",
                row.id,
                f"WhatsApp · {getattr(row, 'direction', None) or 'outbound'} · {row.to_phone}",
                _clip(getattr(row, "body", None) or row.status + (f" — {row.error}" if row.error else "")),
                row.created_at,
            ))

    if entity_type == "lead":
        fus = apply_company_scope(db.query(FollowUp), FollowUp, current_user).filter(
            FollowUp.lead_id == entity_id
        ).all()
        for row in fus:
            when = row.created_at
            if row.scheduled_date:
                when = datetime.combine(row.scheduled_date, row.scheduled_time or time.min)
            items.append(_item(
                "follow_up",
                row.id,
                f"Follow-up ({row.status or 'Pending'})",
                _clip(row.outcome or row.notes or row.channel),
                when,
            ))

    audits = apply_company_scope(db.query(AuditLog), AuditLog, current_user).filter(
        AuditLog.entity_type == entity_type,
        AuditLog.entity_id == str(entity_id),
    ).all()
    for row in audits:
        title = row.action
        if row.action == "status_changed":
            title = f"Status: {row.before_value} → {row.after_value}"
        elif row.after_value and row.action == "updated":
            title = str(row.after_value)[:200]
        items.append(_item(
            "audit",
            row.id,
            title,
            _clip(f"by {row.admin_name}" if row.admin_name else None),
            row.timestamp,
        ))

    items.sort(key=lambda i: _naive(datetime.fromisoformat(i["occurred_at"].replace("Z", "+00:00"))), reverse=True)
    total = len(items)
    page = items[skip: skip + limit]
    return {"items": page, "events": page, "total": total}
