"""Exotel click-to-call."""
from unittest.mock import patch

import pytest

from app.models.core.company_settings import CompanySettings
from app.models.sales.call_log import CallLog
from app.utils.rate_limit import auth_limiter
from app.utils.totp_crypto import encrypt_secret
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company, create_client


@pytest.fixture(autouse=True)
def _reset_auth():
    auth_limiter._buckets.clear()
    yield


def _admin(client, db, code="TEL1", phone="919876543210"):
    company = create_company(db, name=f"Tel {code}", company_code=code)
    admin = create_active_user(
        db, email=f"admin@{code.lower()}.com", role="admin", company_id=company.id, phone=phone,
    )
    login_user(client, admin.email)
    return company, admin


def _configure(db, company):
    row = db.query(CompanySettings).filter(CompanySettings.company_id == company.id).first()
    if row is None:
        row = CompanySettings(company_id=company.id, company_name="Co")
        db.add(row)
        db.flush()
    row.exotel_sid = "sid1"
    row.exotel_api_key = "sid1"
    row.exotel_api_token_encrypted = encrypt_secret("tok")
    row.exotel_caller_id = "080471XXXX"
    row.exotel_subdomain = "api.exotel.com"
    db.commit()
    return row


def test_telephony_connection_not_configured(client, db):
    _admin(client, db, "TNA")
    res = client.get("/api/telephony/connection")
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["configured"] is False
    assert body["has_agent_phone"] is True
    assert "token" not in str(body).lower() or body.get("exotel_api_token") is None


def test_click_to_call_requires_configuration(client, db):
    _admin(client, db, "TNB")
    lead_id = client.post("/api/leads", json={"name": "Ravi", "phone": "9876543210"}).json()["id"]
    res = client.post("/api/telephony/click-to-call", json={"lead_id": lead_id})
    assert res.status_code == 400


def test_click_to_call_requires_destination_phone(client, db):
    company, _ = _admin(client, db, "TNC")
    _configure(db, company)
    lead_id = client.post("/api/leads", json={"name": "No Phone"}).json()["id"]
    res = client.post("/api/telephony/click-to-call", json={"lead_id": lead_id})
    assert res.status_code == 400


@patch("app.routers.sales.telephony.place_exotel_call", return_value="CA123")
def test_click_to_call_creates_log(mock_place, client, db):
    company, admin = _admin(client, db, "TND")
    _configure(db, company)
    lead_id = client.post("/api/leads", json={"name": "Ravi", "phone": "9876543210"}).json()["id"]
    res = client.post("/api/telephony/click-to-call", json={"lead_id": lead_id})
    assert res.status_code == 201, res.text
    body = res.json()
    assert body["provider"] == "exotel"
    assert body["provider_call_id"] == "CA123"
    assert body["direction"] == "outbound"
    assert body["outcome"] == "initiated"
    mock_place.assert_called_once()
    row = db.query(CallLog).filter(CallLog.company_id == company.id).one()
    assert row.lead_id == lead_id
    assert row.created_by_id == admin.id


@patch("app.routers.sales.telephony.place_exotel_call", return_value="CA999")
def test_webhook_updates_duration(mock_place, client, db):
    company, _ = _admin(client, db, "TNE")
    _configure(db, company)
    lead_id = client.post("/api/leads", json={"name": "Ravi", "phone": "9876543210"}).json()["id"]
    client.post("/api/telephony/click-to-call", json={"lead_id": lead_id})
    hook = client.post("/api/telephony/exotel/webhook", data={
        "CallSid": "CA999",
        "Status": "completed",
        "DialCallDuration": "95",
    })
    assert hook.status_code == 204
    row = db.query(CallLog).filter(CallLog.provider_call_id == "CA999").one()
    assert row.duration_seconds == 95
    assert row.outcome == "completed"


def test_webhook_unknown_sid_is_204(client, db):
    res = client.post("/api/telephony/exotel/webhook", data={"CallSid": "nope"})
    assert res.status_code == 204


@patch("app.routers.sales.telephony.place_exotel_call", return_value="CAX")
def test_click_to_call_foreign_lead_rejected(mock_place, client, db):
    company, _ = _admin(client, db, "TNF")
    _configure(db, company)
    other = create_company(db, name="Other", company_code="TNG")
    create_active_user(db, email="admin@tng.com", role="admin", company_id=other.id, phone="911111111111")
    login_user(client, "admin@tng.com")
    foreign_lead = client.post("/api/leads", json={"name": "X", "phone": "9000000000"}).json()["id"]
    login_user(client, "admin@tnf.com")
    res = client.post("/api/telephony/click-to-call", json={"lead_id": foreign_lead})
    assert res.status_code == 400
    mock_place.assert_not_called()


def test_put_connection_encrypts_token(client, db):
    company, _ = _admin(client, db, "TNH")
    res = client.put("/api/telephony/connection", json={
        "sid": "sidZ",
        "api_token": "super-secret",
        "caller_id": "080111",
    })
    assert res.status_code == 200, res.text
    assert res.json()["configured"] is True
    assert "super-secret" not in res.text
    row = db.query(CompanySettings).filter(CompanySettings.company_id == company.id).one()
    assert row.exotel_api_token_encrypted != "super-secret"
    assert row.exotel_sid == "sidZ"
