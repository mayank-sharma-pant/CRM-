"""CRM outbound email: SMTP send + company-scoped log."""
from unittest.mock import patch

import pytest

from app.models.sales.email_log import EmailLog
from app.utils.rate_limit import auth_limiter
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


@pytest.fixture(autouse=True)
def _reset_auth():
    auth_limiter._buckets.clear()
    yield


def _admin(client, db, code="EM1"):
    company = create_company(db, name=f"Mail {code}", company_code=code)
    admin = create_active_user(db, email=f"admin@{code.lower()}.com", role="admin", company_id=company.id)
    login_user(client, admin.email)
    return company, admin


@patch("app.services.sales.crm_email.send_email", return_value=True)
def test_send_email_to_lead_is_logged(mock_send, client, db):
    company, admin = _admin(client, db, "EMA")
    lead_id = client.post("/api/leads", json={"name": "Ravi", "email": "ravi@x.com"}).json()["id"]

    resp = client.post("/api/emails", json={
        "lead_id": lead_id,
        "subject": "Site visit",
        "body": "Can we come Tuesday?",
    })
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["status"] == "sent"
    assert body["to_email"] == "ravi@x.com"
    mock_send.assert_called_once()

    listed = client.get("/api/emails", params={"lead_id": lead_id})
    assert listed.status_code == 200
    assert listed.json()["total"] == 1
    assert listed.json()["items"][0]["subject"] == "Site visit"

    row = db.query(EmailLog).filter(EmailLog.company_id == company.id).one()
    assert row.sent_by_id == admin.id
    assert row.lead_id == lead_id


@patch("app.services.sales.crm_email.send_email", return_value=False)
def test_failed_send_is_still_logged(mock_send, client, db):
    _admin(client, db, "EMB")
    lead_id = client.post("/api/leads", json={"name": "Meera", "email": "m@x.com"}).json()["id"]
    resp = client.post("/api/emails", json={
        "lead_id": lead_id, "subject": "Hi", "body": "Hello",
    })
    assert resp.status_code == 201
    assert resp.json()["status"] == "failed"


def test_lead_without_email_requires_to_email(client, db):
    _admin(client, db, "EMD")
    lead_id = client.post("/api/leads", json={"name": "No Mail"}).json()["id"]
    resp = client.post("/api/emails", json={
        "lead_id": lead_id, "subject": "Hi", "body": "Hello",
    })
    assert resp.status_code == 400
    assert db.query(EmailLog).count() == 0


@patch("app.services.sales.crm_email.send_email", return_value=True)
def test_email_log_is_company_scoped(mock_send, client, db):
    _admin(client, db, "EMC")
    lead_id = client.post("/api/leads", json={"name": "A", "email": "a@x.com"}).json()["id"]
    email_id = client.post("/api/emails", json={
        "lead_id": lead_id, "subject": "Hi", "body": "Hello",
    }).json()["id"]

    other = create_company(db, name="Other", company_code="EMO")
    create_active_user(db, email="admin@emo.com", role="admin", company_id=other.id)
    login_user(client, "admin@emo.com")
    assert client.get(f"/api/emails/{email_id}").status_code == 404
    listed = client.get("/api/emails", params={"lead_id": lead_id})
    assert listed.json()["total"] == 0
