from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models.core.company_settings import CompanySettings
from app.models.sales.follow_up import FollowUp
from app.models.sales.lead import Lead

DEFAULT_CADENCE_STEPS = (
    (1, "sms", "Day 1 SMS check-in"),
    (3, "call", "Day 3 qualification call"),
    (7, "email", "Day 7 quote reminder"),
)


def enroll_lead_in_default_cadence(db: Session, lead: Lead) -> None:
    today = datetime.now(timezone.utc).date()
    steps = list(DEFAULT_CADENCE_STEPS)
    settings = db.query(CompanySettings).filter(CompanySettings.company_id == lead.company_id).first()
    if settings and getattr(settings, "whatsapp_cadence_template_id", None):
        steps[0] = (1, "whatsapp", "Day 1 WhatsApp")
    for offset, channel, notes in steps:
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
