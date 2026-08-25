from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.core.enums import MeetingStatus
from app.models.core.user import User
from app.models.sales.meeting import Meeting
from app.services.sales.activity_parents import (
    naive_utc_now,
    parse_iso_datetime,
    require_parent_in_company,
)
from app.utils.audit import log_activity
from app.utils.datetime_json import isoformat_utc
from app.utils.dependencies import apply_company_scope, ensure_company_access, get_current_user

router = APIRouter()

_VALID_STATUSES = {s.value for s in MeetingStatus}


class MeetingCreate(BaseModel):
    subject: str
    starts_at: str
    ends_at: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    lead_id: Optional[int] = None
    client_id: Optional[int] = None
    deal_id: Optional[int] = None


class MeetingUpdate(BaseModel):
    subject: Optional[str] = None
    starts_at: Optional[str] = None
    ends_at: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    lead_id: Optional[int] = None
    client_id: Optional[int] = None
    deal_id: Optional[int] = None


def _normalize_status(raw: Optional[str], *, required: bool) -> Optional[str]:
    if raw is None or not str(raw).strip():
        if required:
            raise HTTPException(status_code=400, detail="status is required")
        return None
    value = str(raw).strip().lower()
    if value not in _VALID_STATUSES:
        raise HTTPException(
            status_code=400,
            detail="Invalid status. Allowed: scheduled, completed, cancelled.",
        )
    return value


def _assert_time_order(starts_at, ends_at):
    if starts_at is not None and ends_at is not None and ends_at <= starts_at:
        raise HTTPException(status_code=400, detail="ends_at must be after starts_at")


def _serialize(meeting: Meeting) -> dict:
    status_val = meeting.status
    if hasattr(status_val, "value"):
        status_val = status_val.value
    return {
        "id": meeting.id,
        "company_id": meeting.company_id,
        "subject": meeting.subject,
        "starts_at": isoformat_utc(meeting.starts_at),
        "ends_at": isoformat_utc(meeting.ends_at),
        "location": meeting.location,
        "notes": meeting.notes,
        "status": status_val,
        "lead_id": meeting.lead_id,
        "client_id": meeting.client_id,
        "deal_id": meeting.deal_id,
        "created_by_id": meeting.created_by_id,
        "created_at": isoformat_utc(meeting.created_at),
        "updated_at": isoformat_utc(meeting.updated_at),
    }


def _get_or_404(db: Session, current_user, meeting_id: int) -> Meeting:
    meeting = apply_company_scope(db.query(Meeting), Meeting, current_user).filter(
        Meeting.id == meeting_id
    ).first()
    if meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")
    ensure_company_access(meeting, current_user)
    return meeting


@router.post("", status_code=status.HTTP_201_CREATED)
def create_meeting(
    payload: MeetingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_parent_in_company(
        db, current_user,
        lead_id=payload.lead_id, client_id=payload.client_id, deal_id=payload.deal_id,
    )
    starts_at = parse_iso_datetime(payload.starts_at, "starts_at")
    if starts_at is None:
        raise HTTPException(status_code=400, detail="starts_at is required")
    ends_at = parse_iso_datetime(payload.ends_at, "ends_at")
    _assert_time_order(starts_at, ends_at)
    status_val = _normalize_status(payload.status, required=False) or MeetingStatus.SCHEDULED.value
    if not (payload.subject or "").strip():
        raise HTTPException(status_code=400, detail="subject is required")
    meeting = Meeting(
        company_id=current_user.company_id,
        subject=payload.subject.strip(),
        starts_at=starts_at,
        ends_at=ends_at,
        location=(payload.location or None),
        notes=payload.notes,
        status=status_val,
        lead_id=payload.lead_id,
        client_id=payload.client_id,
        deal_id=payload.deal_id,
        created_by_id=current_user.id,
    )
    db.add(meeting)
    db.flush()
    log_activity(
        db, user=current_user, action="created", entity_type="meeting",
        entity_id=meeting.id, entity_name=meeting.subject,
    )
    db.commit()
    db.refresh(meeting)
    return _serialize(meeting)


@router.get("")
def list_meetings(
    lead_id: Optional[int] = Query(None),
    client_id: Optional[int] = Query(None),
    deal_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = apply_company_scope(db.query(Meeting), Meeting, current_user)
    if lead_id is not None:
        query = query.filter(Meeting.lead_id == lead_id)
    if client_id is not None:
        query = query.filter(Meeting.client_id == client_id)
    if deal_id is not None:
        query = query.filter(Meeting.deal_id == deal_id)
    if status_filter:
        query = query.filter(Meeting.status == _normalize_status(status_filter, required=True))
    total = query.count()
    rows = query.order_by(Meeting.starts_at.desc()).offset(skip).limit(limit).all()
    return {"items": [_serialize(m) for m in rows], "total": total}


@router.get("/{meeting_id:int}")
def get_meeting(
    meeting_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return _serialize(_get_or_404(db, current_user, meeting_id))


@router.patch("/{meeting_id:int}")
def update_meeting(
    meeting_id: int,
    payload: MeetingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    meeting = _get_or_404(db, current_user, meeting_id)
    data = payload.model_dump(exclude_unset=True)
    parent_keys = {"lead_id", "client_id", "deal_id"}
    if parent_keys & data.keys():
        require_parent_in_company(
            db, current_user,
            lead_id=data.get("lead_id", meeting.lead_id),
            client_id=data.get("client_id", meeting.client_id),
            deal_id=data.get("deal_id", meeting.deal_id),
        )
    if "starts_at" in data:
        parsed = parse_iso_datetime(data["starts_at"], "starts_at")
        if parsed is None:
            raise HTTPException(status_code=400, detail="starts_at is required")
        meeting.starts_at = parsed
        data.pop("starts_at")
    if "ends_at" in data:
        meeting.ends_at = parse_iso_datetime(data["ends_at"], "ends_at")
        data.pop("ends_at")
    if "status" in data:
        meeting.status = _normalize_status(data["status"], required=True)
        data.pop("status")
    if "subject" in data:
        subject = (data["subject"] or "").strip()
        if not subject:
            raise HTTPException(status_code=400, detail="subject is required")
        meeting.subject = subject
        data.pop("subject")
    for field, value in data.items():
        setattr(meeting, field, value)
    _assert_time_order(meeting.starts_at, meeting.ends_at)
    meeting.updated_at = naive_utc_now()
    log_activity(
        db, user=current_user, action="updated", entity_type="meeting",
        entity_id=meeting.id, entity_name=meeting.subject,
    )
    db.commit()
    db.refresh(meeting)
    return _serialize(meeting)


@router.delete("/{meeting_id:int}", status_code=status.HTTP_204_NO_CONTENT)
def delete_meeting(
    meeting_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    meeting = _get_or_404(db, current_user, meeting_id)
    log_activity(
        db, user=current_user, action="deleted", entity_type="meeting",
        entity_id=meeting.id, entity_name=meeting.subject,
    )
    db.delete(meeting)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
