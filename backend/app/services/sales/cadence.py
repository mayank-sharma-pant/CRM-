from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models.sales.follow_up import FollowUp
from app.models.sales.lead import Lead

DEFAULT_CADENCE_STEPS = (
    (1, "sms", "Day 1 SMS check-in"),
    (3, "call", "Day 3 qualification call"),
    (7, "email", "Day 7 quote reminder"),
)


def enroll_lead_in_default_cadence(db: Session, lead: Lead) -> None:
    today = datetime.now(timezone.utc).date()
    for offset, channel, notes in DEFAULT_CADENCE_STEPS:
        db.add(
            FollowUp(
                company_id=lead.company_id,
                lead_id=lead.id,
                scheduled_date=today + timedelta(days=offset),
                status="Pending",
                channel=channel,
                notes=notes,
            )
        )
