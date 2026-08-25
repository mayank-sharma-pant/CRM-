from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import pytest

from app.models.core.company_settings import CompanySettings
from app.models.core.team import Team
from app.models.sales.follow_up import FollowUp
from app.models.sales.lead import Lead
from app.models.sales.lead_form import LeadForm
from app.models.sales.whatsapp import WhatsAppMessage
from app.utils.rate_limit import auth_limiter, public_form_limiter
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


@pytest.fixture(autouse=True)
def _reset_limiters():
    auth_limiter._buckets.clear()
    public_form_limiter._buckets.clear()
    yield


def _admin(client, db, code="WI1"):
    company = create_company(db, name=f"WA {code}", company_code=code)
    admin = create_active_user(db, email=f"admin@{code.lower()}.com", role="admin", company_id=company.id)
    login_user(client, admin.email)
    return company, admin


def _connect(db, company_id, source="917834811114"):
    row = db.query(CompanySettings).filter(CompanySettings.company_id == company_id).first()
    if row is None:
        row = CompanySettings(company_id=company_id, company_name="WA Co")
        db.add(row)
    row.whatsapp_api_key = "gupshup-secret"
    row.whatsapp_source = source
    db.commit()
    return row


def _inbound_payload(*, msg_id="ABE-1", source="919876543210", text="Hi from Ravi"):
    return {
        "app": "DemoApp",
        "timestamp": 1580221383984,
        "version": 2,
        "type": "message",
        "payload": {
            "id": msg_id,
            "source": source,
            "type": "text",
            "destination": "917834811114",
            "payload": {"text": text},
            "sender": {"phone": source, "name": "Ravi"},
        },
    }


def test_inbound_matches_lead_and_logs(client, db):
    company, _ = _admin(client, db, "WIL")
    _connect(db, company.id)
    lead_id = client.post("/api/leads", json={"name": "Ravi", "phone": "9876543210"}).json()["id"]

    resp = client.post("/api/whatsapp/webhook", json=_inbound_payload())
    assert resp.status_code == 204, resp.text
    row = db.query(WhatsAppMessage).filter(WhatsAppMessage.company_id == company.id).one()
    assert row.direction == "inbound"
    assert row.lead_id == lead_id
    assert row.body == "Hi from Ravi"
    assert row.provider_message_id == "ABE-1"
    assert row.from_phone == "919876543210"
    assert row.session_expires_at is not None


def test_inbound_duplicate_provider_id_is_noop(client, db):
    company, _ = _admin(client, db, "WID")
    _connect(db, company.id)
    client.post("/api/leads", json={"name": "Ravi", "phone": "9876543210"})
    payload = _inbound_payload()
    assert client.post("/api/whatsapp/webhook", json=payload).status_code == 204
    assert client.post("/api/whatsapp/webhook", json=payload).status_code == 204
    assert db.query(WhatsAppMessage).filter(WhatsAppMessage.company_id == company.id).count() == 1


def test_inbound_unknown_destination_is_204_no_row(client, db):
    company, _ = _admin(client, db, "WIU")
    _connect(db, company.id, source="911111111111")
    payload = _inbound_payload()
    assert client.post("/api/whatsapp/webhook", json=payload).status_code == 204
    assert db.query(WhatsAppMessage).filter(WhatsAppMessage.company_id == company.id).count() == 0


def test_inbound_does_not_attach_other_company_lead(client, db):
    company_a, _ = _admin(client, db, "WIA")
    _connect(db, company_a.id)
    other = create_company(db, name="Other WA", company_code="WIB")
    db.add(Lead(company_id=other.id, name="Other Ravi", phone="9876543210"))
    db.commit()

    assert client.post("/api/whatsapp/webhook", json=_inbound_payload()).status_code == 204
    row = db.query(WhatsAppMessage).filter(WhatsAppMessage.company_id == company_a.id).one()
    assert row.lead_id is None


def test_cadence_uses_whatsapp_when_template_set(client, db):
    company, _ = _admin(client, db, "WIC")
    _connect(db, company.id)
    tpl = client.post("/api/whatsapp/templates", json={
        "name": "Cadence", "provider_template_id": "tpl_cad", "variable_keys": ["name"],
    }).json()
    settings = db.query(CompanySettings).filter(CompanySettings.company_id == company.id).one()
    settings.whatsapp_cadence_template_id = tpl["id"]
    db.commit()

    team = Team(company_id=company.id, name="Field")
    db.add(team)
    db.commit()
    db.refresh(team)
    db.add(LeadForm(
        company_id=company.id,
        slug="wa-form",
        name="Website",
        headline="Get a quote",
        is_active=True,
        default_team_id=team.id,
        default_source="Website",
    ))
    db.commit()

    resp = client.post("/api/public/forms/wa-form/submit", json={
        "name": "Ravi", "phone": "9876543210", "website": "",
    })
    assert resp.status_code == 201, resp.text
    lead = db.query(Lead).filter(Lead.company_id == company.id).one()
    channels = [
        r.channel
        for r in db.query(FollowUp).filter(FollowUp.lead_id == lead.id).order_by(FollowUp.scheduled_date.asc())
    ]
    assert channels == ["whatsapp", "call", "email"]


@patch("app.services.sales.whatsapp.post_gupshup_template", return_value=(True, "ok"))
@patch("app.services.sales.reminders.send_email", return_value=True)
def test_due_whatsapp_cadence_sends_template(mock_email, mock_post, client, db):
    company, admin = _admin(client, db, "WIR")
    _connect(db, company.id)
    tpl = client.post("/api/whatsapp/templates", json={
        "name": "Cadence", "provider_template_id": "tpl_cad", "variable_keys": ["name"],
    }).json()
    settings = db.query(CompanySettings).filter(CompanySettings.company_id == company.id).one()
    settings.whatsapp_cadence_template_id = tpl["id"]
    db.commit()

    lead = Lead(company_id=company.id, name="Asha", phone="9876543210", created_by_id=admin.id)
    db.add(lead)
    db.flush()
    db.add(FollowUp(
        company_id=company.id,
        lead_id=lead.id,
        scheduled_date=datetime.now(timezone.utc).date(),
        status="Pending",
        channel="whatsapp",
        notes="Day 1 WhatsApp",
    ))
    db.commit()

    resp = client.post("/api/reminders/run")
    assert resp.status_code == 200, resp.text
    assert resp.json()["whatsapp"] == 1
    mock_post.assert_called_once()
    row = db.query(WhatsAppMessage).filter(WhatsAppMessage.company_id == company.id).one()
    assert row.status == "sent"
    assert row.lead_id == lead.id
    again = client.post("/api/reminders/run")
    assert again.json()["whatsapp"] == 0


@patch("app.routers.sales.whatsapp.post_gupshup_session_text", return_value=(True, "ok"))
def test_session_send_requires_open_window(mock_post, client, db):
    company, _ = _admin(client, db, "WIS")
    _connect(db, company.id)
    lead_id = client.post("/api/leads", json={"name": "Ravi", "phone": "9876543210"}).json()["id"]

    closed = client.post("/api/whatsapp/session-send", json={"lead_id": lead_id, "body": "Thanks"})
    assert closed.status_code == 400

    assert client.post("/api/whatsapp/webhook", json=_inbound_payload()).status_code == 204
    listed = client.get("/api/whatsapp/messages", params={"lead_id": lead_id})
    assert listed.status_code == 200
    assert listed.json()["session_open"] is True

    sent = client.post("/api/whatsapp/session-send", json={"lead_id": lead_id, "body": "Thanks"})
    assert sent.status_code == 201, sent.text
    assert sent.json()["direction"] == "outbound"
    assert sent.json()["body"] == "Thanks"
    mock_post.assert_called_once()


def test_session_send_expired_window_is_400(client, db):
    company, _ = _admin(client, db, "WIE")
    _connect(db, company.id)
    lead_id = client.post("/api/leads", json={"name": "Ravi", "phone": "9876543210"}).json()["id"]
    db.add(WhatsAppMessage(
        company_id=company.id,
        lead_id=lead_id,
        to_phone="919876543210",
        from_phone="919876543210",
        direction="inbound",
        body="Hi",
        status="received",
        provider_message_id="old",
        session_expires_at=datetime.utcnow() - timedelta(minutes=1),
    ))
    db.commit()
    resp = client.post("/api/whatsapp/session-send", json={"lead_id": lead_id, "body": "Too late"})
    assert resp.status_code == 400
