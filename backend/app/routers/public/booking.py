"""Public meeting booking page: unauthenticated, resolved from the slug only."""
from typing import Optional

from fastapi import APIRouter, Depends, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.sales.booking import DEFAULT_DURATION_MINUTES, book_meeting, public_booking
from app.services.sales.calendar_sync import sync_meeting_outbound
from app.utils.datetime_json import isoformat_utc
from app.utils.rate_limit import public_form_limiter

router = APIRouter()


class PublicBookingIn(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    starts_at: Optional[str] = None
    ends_at: Optional[str] = None
    notes: Optional[str] = None
    website: Optional[str] = None


@router.get("/{slug}")
def get_public_booking_page(slug: str, db: Session = Depends(get_db)):
    row, host, company = public_booking(db, slug)
    return {
        "company_name": company.name,
        "host_name": host.full_name,
        "headline": f"Book a meeting with {host.full_name}",
        "duration_minutes": DEFAULT_DURATION_MINUTES,
    }


@router.post("/{slug}/submit", status_code=status.HTTP_201_CREATED)
def submit_public_booking(
    slug: str,
    payload: PublicBookingIn,
    request: Request,
    db: Session = Depends(get_db),
):
    row, host, _company = public_booking(db, slug)
    public_form_limiter.check(request, f"booking:{slug}", max_attempts=10, window_seconds=600)
    if (payload.website or "").strip():
        return {"ok": True}
    meeting = book_meeting(
        db,
        row,
        host,
        name=payload.name,
        email=payload.email,
        starts_at=payload.starts_at,
        ends_at=payload.ends_at,
        notes=payload.notes,
    )
    # 6.2 push, after the commit: a provider timeout must not lose the booking.
    sync_meeting_outbound(db, host, meeting)
    db.refresh(meeting)
    return {
        "ok": True,
        "meeting_id": meeting.id,
        "starts_at": isoformat_utc(meeting.starts_at),
        "ends_at": isoformat_utc(meeting.ends_at),
    }
