"""Calendar OAuth and CRM→calendar push for meetings."""
from datetime import timedelta
from unittest.mock import patch

import pytest

from app.config import settings
from app.models.sales.calendar import CalendarConnection
from app.models.sales.meeting import Meeting
from app.utils.rate_limit import auth_limiter
from app.utils.totp_crypto import decrypt_secret, encrypt_secret
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


@pytest.fixture(autouse=True)
def _reset_auth():
    auth_limiter._buckets.clear()
    yield


@pytest.fixture(autouse=True)
def _clear_oauth_env(monkeypatch):
    monkeypatch.setattr(settings, "GOOGLE_OAUTH_CLIENT_ID", "")
    monkeypatch.setattr(settings, "GOOGLE_OAUTH_CLIENT_SECRET", "")
    monkeypatch.setattr(settings, "MICROSOFT_OAUTH_CLIENT_ID", "")
    monkeypatch.setattr(settings, "MICROSOFT_OAUTH_CLIENT_SECRET", "")
    monkeypatch.setattr(settings, "PUBLIC_API_URL", "http://api.test")
    monkeypatch.setattr(settings, "FRONTEND_URL", "http://frontend.test")


def _admin(client, db, code="CAL1"):
    company = create_company(db, name=f"Cal {code}", company_code=code)
    admin = create_active_user(db, email=f"admin@{code.lower()}.com", role="admin", company_id=company.id)
    login_user(client, admin.email)
    return company, admin


def _lead_id(client):
    return client.post("/api/leads", json={"name": "Ravi"}).json()["id"]


def _connect(db, company, admin, provider="google"):
    row = CalendarConnection(
        company_id=company.id,
        user_id=admin.id,
        provider=provider,
        email="me@gmail.com",
        refresh_token_encrypted=encrypt_secret("refresh"),
        access_token_encrypted=encrypt_secret("access"),
        status="active",
    )
    db.add(row)
    db.commit()
    return row


def test_calendar_status_disconnected(client, db):
    _admin(client, db, "CAD")
    res = client.get("/api/calendar")
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["connected"] is False
    assert "refresh_token" not in str(body).lower()


def test_calendar_start_503_when_unset(client, db):
    _admin(client, db, "CAS")
    res = client.get("/api/calendar/oauth/google/start", follow_redirects=False)
    assert res.status_code == 503


def test_calendar_callback_stores_encrypted_refresh(client, db, monkeypatch):
    company, admin = _admin(client, db, "CAC")
    monkeypatch.setattr(settings, "GOOGLE_OAUTH_CLIENT_ID", "gid")
    monkeypatch.setattr(settings, "GOOGLE_OAUTH_CLIENT_SECRET", "gsecret")

    from app.services.sales import calendar_sync as cal

    start = client.get("/api/calendar/oauth/google/start", follow_redirects=False)
    assert start.status_code == 302
    from urllib.parse import parse_qs, urlparse
    state = parse_qs(urlparse(start.headers["location"]).query)["state"][0]

    def fake_exchange(provider, code):
        return cal.CalendarTokens(
            refresh_token="plain-cal-refresh",
            access_token="plain-cal-access",
            expires_in=3600,
            email="me@gmail.com",
        )

    monkeypatch.setattr("app.routers.sales.calendar.exchange_calendar_code", fake_exchange)
    res = client.get(
        "/api/calendar/oauth/google/callback",
        params={"code": "ok-code", "state": state},
        follow_redirects=False,
    )
    assert res.status_code == 302
    assert "calendar=success" in res.headers["location"]
    row = db.query(CalendarConnection).filter(CalendarConnection.user_id == admin.id).one()
    assert decrypt_secret(row.refresh_token_encrypted) == "plain-cal-refresh"
    assert client.get("/api/calendar").json()["connected"] is True


def test_meeting_without_calendar_has_no_event_id(client, db):
    _admin(client, db, "CAN")
    lead_id = _lead_id(client)
    created = client.post("/api/meetings", json={
        "subject": "Site visit",
        "starts_at": "2026-09-01T10:00:00Z",
        "lead_id": lead_id,
    })
    assert created.status_code == 201, created.text
    assert created.json()["calendar_event_id"] is None
    assert created.json()["calendar_synced"] is False


@patch("app.services.sales.calendar_sync.create_calendar_event", return_value="gcal-99")
def test_meeting_create_pushes_event(mock_create, client, db):
    company, admin = _admin(client, db, "CAP")
    _connect(db, company, admin)
    lead_id = _lead_id(client)
    created = client.post("/api/meetings", json={
        "subject": "Site visit",
        "starts_at": "2026-09-01T10:00:00Z",
        "lead_id": lead_id,
    })
    assert created.status_code == 201, created.text
    assert created.json()["calendar_event_id"] == "gcal-99"
    assert created.json()["calendar_synced"] is True
    mock_create.assert_called_once()
    meeting = db.query(Meeting).one()
    assert meeting.calendar_provider == "google"


@patch("app.services.sales.calendar_sync.update_calendar_event", return_value=None)
@patch("app.services.sales.calendar_sync.create_calendar_event", return_value="gcal-1")
def test_meeting_patch_updates_event(mock_create, mock_update, client, db):
    company, admin = _admin(client, db, "CAU")
    _connect(db, company, admin)
    lead_id = _lead_id(client)
    mid = client.post("/api/meetings", json={
        "subject": "Visit",
        "starts_at": "2026-09-01T10:00:00Z",
        "lead_id": lead_id,
    }).json()["id"]
    patched = client.patch(f"/api/meetings/{mid}", json={"subject": "Visit moved"})
    assert patched.status_code == 200
    mock_update.assert_called_once()


@patch("app.services.sales.calendar_sync.delete_calendar_event", return_value=None)
@patch("app.services.sales.calendar_sync.create_calendar_event", return_value="gcal-1")
def test_meeting_delete_removes_event(mock_create, mock_delete, client, db):
    company, admin = _admin(client, db, "CAX")
    _connect(db, company, admin)
    lead_id = _lead_id(client)
    mid = client.post("/api/meetings", json={
        "subject": "Visit",
        "starts_at": "2026-09-01T10:00:00Z",
        "lead_id": lead_id,
    }).json()["id"]
    assert client.delete(f"/api/meetings/{mid}").status_code == 204
    mock_delete.assert_called_once()


@patch("app.services.sales.calendar_sync.create_calendar_event", side_effect=RuntimeError("boom"))
def test_calendar_push_failure_does_not_fail_meeting(mock_create, client, db):
    company, admin = _admin(client, db, "CAF")
    _connect(db, company, admin)
    lead_id = _lead_id(client)
    created = client.post("/api/meetings", json={
        "subject": "Visit",
        "starts_at": "2026-09-01T10:00:00Z",
        "lead_id": lead_id,
    })
    assert created.status_code == 201, created.text
    assert created.json()["calendar_event_id"] is None


def test_disconnect_calendar(client, db):
    company, admin = _admin(client, db, "CAK")
    _connect(db, company, admin)
    assert client.delete("/api/calendar").status_code == 204
    assert client.get("/api/calendar").json()["connected"] is False
