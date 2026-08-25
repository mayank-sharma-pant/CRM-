"""Public meeting booking config and ingest."""
from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.core.company import Company
from app.models.core.company_settings import CompanySettings
from app.models.core.user import User
from app.models.sales.lead import Lead
from app.models.sales.meeting import Meeting
from app.services.sales.activity_parents import naive_utc_now, parse_iso_datetime
from app.services.sales.cases import company_accepts_public

SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9-]{2,63}$")
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
NOT_FOUND = "Booking page not found"
DEFAULT_DURATION_MINUTES = 60


def normalize_slug(raw: Optional[str]) -> str:
    slug = (raw or "").strip().lower()
    if not SLUG_RE.match(slug):
        raise HTTPException(status_code=400, detail="Invalid booking slug")
    return slug


def get_or_create_settings(db: Session, company_id: int) -> CompanySettings:
    row = db.query(CompanySettings).filter(CompanySettings.company_id == company_id).first()
    if row is None:
        row = CompanySettings(company_id=company_id, company_name="Company")
        db.add(row)
        db.flush()
    return row


def resolve_host(db: Session, company_id: int, host_user_id: Optional[int]) -> User:
    if host_user_id is None:
        raise HTTPException(status_code=400, detail="host_user_id is required")
    user = db.query(User).filter(User.id == host_user_id).first()
    if user is None or user.company_id != company_id or not user.is_active:
        raise HTTPException(status_code=400, detail="host_user_id must be an active user in this company")
    return user


def booking_host(db: Session, company_id: int, host_user_id: Optional[int]) -> Optional[User]:
    if host_user_id is None:
        return None
    return db.query(User).filter(User.id == host_user_id, User.company_id == company_id).first()


def serialize_booking(row: CompanySettings, host: Optional[User]) -> dict:
    slug = row.booking_slug
    host_id = row.booking_host_user_id
    return {
        "slug": slug,
        "host_user_id": host_id,
        "host_name": host.full_name if host else None,
        "public_path": f"/book/{slug}" if slug else None,
        "is_live": bool(slug and host_id),
    }


def set_booking_config(
    db: Session,
    company_id: int,
    slug: Optional[str] = None,
    host_user_id: Optional[int] = None,
    *,
    slug_set: bool = True,
    host_set: bool = True,
    slug_provided: Optional[bool] = None,
    host_provided: Optional[bool] = None,
) -> tuple[CompanySettings, Optional[User]]:
    if slug_provided is not None:
        slug_set = slug_provided
    if host_provided is not None:
        host_set = host_provided
    row = get_or_create_settings(db, company_id)
    if slug_set:
        if slug is None:
            row.booking_slug = None
        else:
            normalized = normalize_slug(slug)
            taken = (
                db.query(CompanySettings)
                .filter(
                    CompanySettings.booking_slug == normalized,
                    CompanySettings.company_id != company_id,
                )
                .first()
            )
            if taken is not None:
                raise HTTPException(status_code=400, detail="This slug is already in use")
            row.booking_slug = normalized
    host = None
    if host_set:
        if host_user_id is None:
            row.booking_host_user_id = None
        else:
            host = resolve_host(db, company_id, host_user_id)
            row.booking_host_user_id = host.id
    if row.booking_host_user_id and host is None:
        host = db.query(User).filter(User.id == row.booking_host_user_id).first()
    db.commit()
    db.refresh(row)
    return row, host


def public_booking(db: Session, slug: str) -> tuple[CompanySettings, User, Company]:
    try:
        normalized = normalize_slug(slug)
    except HTTPException:
        raise HTTPException(status_code=404, detail=NOT_FOUND)
    row = (
        db.query(CompanySettings)
        .filter(CompanySettings.booking_slug == normalized)
        .order_by(CompanySettings.id.asc())
        .first()
    )
    if row is None or row.booking_host_user_id is None:
        raise HTTPException(status_code=404, detail=NOT_FOUND)
    company = db.query(Company).filter(Company.id == row.company_id).first()
    host = db.query(User).filter(User.id == row.booking_host_user_id).first()
    if (
        company is None
        or not company_accepts_public(company)
        or host is None
        or host.company_id != company.id
        or not host.is_active
    ):
        raise HTTPException(status_code=404, detail=NOT_FOUND)
    return row, host, company


def _match_lead(db: Session, company_id: int, email: str) -> Optional[Lead]:
    return (
        db.query(Lead)
        .filter(
            Lead.company_id == company_id,
            Lead.deleted_at.is_(None),
            func.lower(Lead.email) == email.lower(),
        )
        .first()
    )


def book_meeting(
    db: Session,
    settings: CompanySettings,
    host: User,
    *,
    name: Optional[str],
    email: Optional[str],
    starts_at: Optional[str],
    ends_at: Optional[str] = None,
) -> Meeting:
    name = (name or "").strip()
    email = (email or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="name is required")
    if not email or not _EMAIL_RE.match(email):
        raise HTTPException(status_code=400, detail="email is required")
    start = parse_iso_datetime(starts_at, "starts_at")
    if start is None:
        raise HTTPException(status_code=400, detail="starts_at is required")
    now = naive_utc_now()
    if start <= now:
        raise HTTPException(status_code=400, detail="starts_at must be in the future")
    end = parse_iso_datetime(ends_at, "ends_at") if ends_at else start + timedelta(minutes=DEFAULT_DURATION_MINUTES)
    if end is None:
        end = start + timedelta(minutes=DEFAULT_DURATION_MINUTES)
    if end <= start:
        raise HTTPException(status_code=400, detail="ends_at must be after starts_at")
    lead = _match_lead(db, settings.company_id, email)
    meeting = Meeting(
        company_id=settings.company_id,
        subject=f"Meeting with {name}",
        starts_at=start,
        ends_at=end,
        notes=f"{name} <{email}>",
        status="scheduled",
        lead_id=lead.id if lead else None,
        created_by_id=host.id,
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    return meeting
