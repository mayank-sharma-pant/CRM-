from datetime import datetime, timedelta, timezone

import pytest

from app.models.core.company_settings import CompanySettings
from app.models.core.invite import Invite, InviteStatus
from app.models.sales.deal import Deal
from app.models.sales.lead import Lead
from app.models.sales.meeting import Meeting
from app.models.sales.lead_form import LeadForm
from app.models.sales.mailbox import MailboxConnection
from app.utils.rate_limit import auth_limiter
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_client, create_company


@pytest.fixture(autouse=True)
def _reset_auth():
    auth_limiter._buckets.clear()
    yield


def _admin(client, db, code="ON1"):
    company = create_company(db, name=f"On {code}", company_code=code)
    admin = create_active_user(db, email=f"admin@{code.lower()}.com", role="admin", company_id=company.id)
    login_user(client, admin.email)
    return company, admin


def test_empty_status_all_pending(client, db):
    _admin(client, db, "ONA")
    resp = client.get("/api/onboarding/status")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["dismissed"] is False
    assert body["complete"] is False
    by_key = {s["key"]: s["done"] for s in body["steps"]}
    assert by_key["sample_data"] is False
    assert by_key["import_csv"] is False
    assert by_key["connect_email"] is False
    assert by_key["create_form"] is False
    assert by_key["send_quote"] is False
    assert by_key["invite_teammate"] is False
    assert by_key["connect_whatsapp"] is False


def test_sample_data_is_idempotent_and_assigned(client, db):
    company, admin = _admin(client, db, "ONB")
    first = client.post("/api/onboarding/sample-data")
    assert first.status_code == 200, first.text
    assert first.json()["leads_created"] == 3
    assert first.json()["deals_created"] == 1
    assert db.query(Meeting).filter(Meeting.company_id == company.id).count() == 1
    again = client.post("/api/onboarding/sample-data")
    assert again.json()["leads_created"] == 0
    assert db.query(Lead).filter(Lead.company_id == company.id).count() == 3
    assert db.query(Deal).filter(Deal.company_id == company.id).count() == 1
    assert db.query(Meeting).filter(Meeting.company_id == company.id).count() == 1
    sample_leads = (
        db.query(Lead)
        .filter(Lead.company_id == company.id, Lead.source == "Sample", Lead.deleted_at.is_(None))
        .all()
    )
    assert len(sample_leads) == 3
    assert sum(1 for row in sample_leads if row.assigned_to_id is None) >= 1
    assert sum(1 for row in sample_leads if row.assigned_to_id == admin.id) == 2
    walk_in = next(row for row in sample_leads if row.name == "Sample — Walk-in kitchen")
    assert walk_in.assigned_to_id is None
    status = client.get("/api/onboarding/status").json()
    assert {s["key"]: s["done"] for s in status["steps"]}["sample_data"] is True


def test_csv_import_marks_import_step(client, db):
    company, _ = _admin(client, db, "ONC")
    db.add(Lead(company_id=company.id, name="From file", source="CSV Import"))
    db.commit()
    by_key = {s["key"]: s["done"] for s in client.get("/api/onboarding/status").json()["steps"]}
    assert by_key["import_csv"] is True
    assert by_key["sample_data"] is True


def test_mailbox_form_quote_and_dismiss(client, db):
    company, admin = _admin(client, db, "OND")
    db.add(MailboxConnection(
        company_id=company.id,
        user_id=admin.id,
        provider="google",
        email="admin@ond.com",
        refresh_token_encrypted="x",
        status="active",
    ))
    db.add(LeadForm(company_id=company.id, slug="ond-form", name="Website", is_active=True))
    db.commit()
    client_row = create_client(db, company_id=company.id, name="Buyer")
    q = client.post("/api/quotes", json={
        "client_id": client_row.id,
        "title": "First",
        "items": [{"description": "Job", "quantity": 1, "unit_price": 1000}],
    })
    assert q.status_code in (200, 201), q.text
    steps = {s["key"]: s["done"] for s in client.get("/api/onboarding/status").json()["steps"]}
    assert steps["connect_email"] is True
    assert steps["create_form"] is True
    assert steps["send_quote"] is True

    dismiss = client.post("/api/onboarding/dismiss")
    assert dismiss.status_code == 200
    body = client.get("/api/onboarding/status").json()
    assert body["dismissed"] is True
    assert body["complete"] is True


def test_connect_whatsapp_step_when_configured(client, db):
    company, _ = _admin(client, db, "ONW")
    row = db.query(CompanySettings).filter(CompanySettings.company_id == company.id).first()
    if row is None:
        row = CompanySettings(company_id=company.id, company_name="On W")
        db.add(row)
    row.whatsapp_api_key = "gupshup-secret"
    row.whatsapp_source = "917834811114"
    db.commit()
    by_key = {s["key"]: s["done"] for s in client.get("/api/onboarding/status").json()["steps"]}
    assert by_key["connect_whatsapp"] is True


def test_invite_teammate_step_with_pending_invite(client, db):
    company, _ = _admin(client, db, "ONI")
    db.add(
        Invite(
            company_id=company.id,
            email="teammate@oni.com",
            full_name="Teammate",
            role="sales",
            token="invite-tok-oni",
            hashed_password="x",
            status=InviteStatus.PENDING,
            expires_at=datetime.now(timezone.utc) + timedelta(days=7),
        )
    )
    db.commit()
    by_key = {s["key"]: s["done"] for s in client.get("/api/onboarding/status").json()["steps"]}
    assert by_key["invite_teammate"] is True


def test_invite_teammate_step_with_two_active_users(client, db):
    company, _ = _admin(client, db, "ONT")
    create_active_user(db, email="sales@ont.com", role="sales", company_id=company.id)
    by_key = {s["key"]: s["done"] for s in client.get("/api/onboarding/status").json()["steps"]}
    assert by_key["invite_teammate"] is True


def test_complete_when_smb_steps_done_without_legacy_steps(client, db):
    company, admin = _admin(client, db, "ONM")
    client.post("/api/onboarding/sample-data")
    db.add(Lead(company_id=company.id, name="CSV row", source="CSV Import"))
    create_active_user(db, email="mate@onm.com", role="sales", company_id=company.id)
    row = db.query(CompanySettings).filter(CompanySettings.company_id == company.id).first()
    if row is None:
        row = CompanySettings(company_id=company.id, company_name="On M")
        db.add(row)
    row.whatsapp_api_key = "key"
    row.whatsapp_source = "919999999999"
    db.commit()
    login_user(client, admin.email)
    body = client.get("/api/onboarding/status").json()
    by_key = {s["key"]: s["done"] for s in body["steps"]}
    assert by_key["connect_email"] is False
    assert by_key["create_form"] is False
    assert by_key["send_quote"] is False
    assert body["complete"] is True
    assert body["dismissed"] is False


def test_sample_does_not_leak_to_other_company(client, db):
    company_a, _ = _admin(client, db, "ONE")
    client.post("/api/onboarding/sample-data")
    other = create_company(db, name="Other On", company_code="ONF")
    create_active_user(db, email="admin@onf.com", role="admin", company_id=other.id)
    login_user(client, "admin@onf.com")
    assert db.query(Lead).filter(Lead.company_id == other.id).count() == 0
    assert client.get("/api/onboarding/status").json()["steps"][0]["done"] is False
    assert db.query(Lead).filter(Lead.company_id == company_a.id).count() == 3
