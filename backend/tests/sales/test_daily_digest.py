"""Daily desk in-app digest via run_due_reminders."""
from datetime import datetime, timedelta, timezone

import pytest

from app.models.core.enums import MeetingStatus
from app.models.sales.lead import Lead
from app.models.sales.meeting import Meeting
from app.models.sales.notification import Notification
from app.models.sales.whatsapp import WhatsAppMessage
from app.services.sales.reminders import run_due_reminders
from app.utils.rate_limit import auth_limiter
from tests.helpers.auth import create_active_user
from tests.helpers.factories import create_company


@pytest.fixture(autouse=True)
def _reset_auth():
    auth_limiter._buckets.clear()
    yield


def test_md_daily_digest_counts_and_idempotent(db):
    company = create_company(db, name="Digest Co", company_code="DG9")
    md = create_active_user(db, email="md@dg9.com", role="md", company_id=company.id)

    db.add(
        Lead(
            company_id=company.id,
            name="Pool lead",
            phone="111",
            status="Active",
            assigned_to_id=None,
        )
    )
    lead_wa = Lead(
        company_id=company.id,
        name="WA lead",
        phone="222",
        status="Active",
        assigned_to_id=md.id,
    )
    db.add(lead_wa)
    db.flush()

    past = datetime.utcnow() - timedelta(hours=2)
    db.add(
        Meeting(
            company_id=company.id,
            subject="Missed call",
            starts_at=past,
            status=MeetingStatus.SCHEDULED,
            created_by_id=md.id,
        )
    )
    db.add(
        WhatsAppMessage(
            company_id=company.id,
            lead_id=lead_wa.id,
            to_phone="222",
            direction="inbound",
            body="need price",
            status="received",
            created_at=datetime.now(timezone.utc),
        )
    )
    db.commit()

    first = run_due_reminders(db)
    assert first.get("digests") == 1

    rows = (
        db.query(Notification)
        .filter(Notification.user_id == md.id, Notification.title == "Daily desk")
        .all()
    )
    assert len(rows) == 1
    assert rows[0].message == "1 unassigned, 1 unanswered, 1 overdue"
    assert rows[0].link == "/md/dashboard"
    assert rows[0].type == "info"

    second = run_due_reminders(db)
    assert second.get("digests") == 0
    assert (
        db.query(Notification)
        .filter(Notification.user_id == md.id, Notification.title == "Daily desk")
        .count()
        == 1
    )
