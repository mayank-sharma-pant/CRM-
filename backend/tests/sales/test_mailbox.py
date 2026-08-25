"""Mailbox OAuth, send-via-Gmail/Graph, inbound match-and-log."""
from unittest.mock import patch

import pytest

from app.config import settings
from app.models.sales.email_log import EmailLog
from app.models.sales.mailbox import MailboxConnection
from app.utils.rate_limit import auth_limiter
from app.utils.totp_crypto import decrypt_secret
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


def _admin(client, db, code="MB1"):
    company = create_company(db, name=f"Mail {code}", company_code=code)
    admin = create_active_user(db, email=f"admin@{code.lower()}.com", role="admin", company_id=company.id)
    login_user(client, admin.email)
    return company, admin


def test_mailbox_status_disconnected(client, db):
    _admin(client, db, "MBD")
    res = client.get("/api/mailbox")
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["connected"] is False
    assert body["providers"]["google"] is False
    assert "refresh_token" not in str(body).lower()


def test_mailbox_start_requires_auth(client, db):
    client.headers.pop("Authorization", None)
    res = client.get("/api/mailbox/oauth/google/start", follow_redirects=False)
    assert res.status_code == 401


def test_mailbox_start_503_when_unset(client, db):
    _admin(client, db, "MBS")
    res = client.get("/api/mailbox/oauth/google/start", follow_redirects=False)
    assert res.status_code == 503


def test_mailbox_callback_stores_encrypted_refresh(client, db, monkeypatch):
    company, admin = _admin(client, db, "MBC")
    monkeypatch.setattr(settings, "GOOGLE_OAUTH_CLIENT_ID", "gid")
    monkeypatch.setattr(settings, "GOOGLE_OAUTH_CLIENT_SECRET", "gsecret")

    from app.services.sales import mailbox as mailbox_svc

    start = client.get("/api/mailbox/oauth/google/start", follow_redirects=False)
    assert start.status_code == 302
    from urllib.parse import parse_qs, urlparse

    state = parse_qs(urlparse(start.headers["location"]).query)["state"][0]

    def fake_exchange(provider, code):
        assert provider == "google"
        assert code == "ok-code"
        return mailbox_svc.MailboxTokens(
            refresh_token="plain-refresh",
            access_token="plain-access",
            expires_in=3600,
            email="sales@gmail.com",
        )

    monkeypatch.setattr("app.routers.sales.mailbox.exchange_mailbox_code", fake_exchange)

    res = client.get(
        "/api/mailbox/oauth/google/callback",
        params={"code": "ok-code", "state": state},
        follow_redirects=False,
    )
    assert res.status_code == 302
    assert "mailbox=success" in res.headers["location"]

    row = db.query(MailboxConnection).filter(MailboxConnection.user_id == admin.id).one()
    assert row.company_id == company.id
    assert row.provider == "google"
    assert row.email == "sales@gmail.com"
    assert row.refresh_token_encrypted != "plain-refresh"
    assert decrypt_secret(row.refresh_token_encrypted) == "plain-refresh"

    status = client.get("/api/mailbox")
    assert status.json()["connected"] is True
    assert status.json()["email"] == "sales@gmail.com"
    assert "plain-refresh" not in status.text


@patch("app.services.sales.crm_email.send_email", return_value=True)
def test_send_uses_mailbox_when_connected(mock_smtp, client, db, monkeypatch):
    company, admin = _admin(client, db, "MBX")
    conn = MailboxConnection(
        company_id=company.id,
        user_id=admin.id,
        provider="google",
        email="me@gmail.com",
        refresh_token_encrypted="x",
        status="active",
    )
    db.add(conn)
    db.commit()
    lead_id = client.post("/api/leads", json={"name": "Ravi", "email": "ravi@x.com"}).json()["id"]

    def fake_send(connection, *, to_email, subject, body, db=None):
        return "gmail-msg-1"

    monkeypatch.setattr("app.services.sales.crm_email.send_via_mailbox", fake_send)

    resp = client.post("/api/emails", json={
        "lead_id": lead_id,
        "subject": "Site visit",
        "body": "Tuesday?",
    })
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["status"] == "sent"
    assert body["provider"] == "google"
    assert body["direction"] == "outbound"
    assert body["provider_message_id"] == "gmail-msg-1"
    mock_smtp.assert_not_called()


@patch("app.services.sales.crm_email.send_email", return_value=True)
def test_send_smtp_when_not_connected(mock_smtp, client, db):
    _admin(client, db, "MBY")
    lead_id = client.post("/api/leads", json={"name": "Ravi", "email": "ravi@x.com"}).json()["id"]
    resp = client.post("/api/emails", json={
        "lead_id": lead_id, "subject": "Hi", "body": "Hello",
    })
    assert resp.status_code == 201
    assert resp.json()["provider"] == "smtp"
    mock_smtp.assert_called_once()


def test_sync_imports_matching_inbound_and_skips_unknown(client, db, monkeypatch):
    company, admin = _admin(client, db, "MBZ")
    conn = MailboxConnection(
        company_id=company.id,
        user_id=admin.id,
        provider="google",
        email="me@gmail.com",
        refresh_token_encrypted="x",
        status="active",
    )
    db.add(conn)
    db.commit()
    lead_id = client.post("/api/leads", json={"name": "Ravi", "email": "ravi@x.com"}).json()["id"]

    from app.services.sales.mailbox import MailboxMessage

    def fake_list(connection, db=None):
        return [
            MailboxMessage(
                provider_message_id="in-1",
                from_email="ravi@x.com",
                to_emails=["me@gmail.com"],
                cc_emails=[],
                subject="Re: visit",
                body="Yes Tuesday",
            ),
            MailboxMessage(
                provider_message_id="in-2",
                from_email="stranger@zz.com",
                to_emails=["me@gmail.com"],
                cc_emails=[],
                subject="Spam",
                body="Buy now",
            ),
        ]

    monkeypatch.setattr("app.services.sales.mailbox.list_mailbox_messages", fake_list)

    res = client.post("/api/mailbox/sync")
    assert res.status_code == 200, res.text
    assert res.json()["imported"] == 1

    items = client.get("/api/emails", params={"lead_id": lead_id}).json()["items"]
    assert len(items) == 1
    assert items[0]["direction"] == "inbound"
    assert items[0]["from_email"] == "ravi@x.com"
    assert items[0]["subject"] == "Re: visit"

    again = client.post("/api/mailbox/sync")
    assert again.json()["imported"] == 0


def test_email_deal_id(client, db):
    _admin(client, db, "MBW")
    with patch("app.services.sales.crm_email.send_email", return_value=True):
        deal_id = client.post("/api/deals", json={"title": "Roof", "amount": "100"}).json()["id"]
        resp = client.post("/api/emails", json={
            "deal_id": deal_id,
            "to_email": "buyer@x.com",
            "subject": "Quote",
            "body": "Please see attached",
        })
    assert resp.status_code == 201, resp.text
    assert resp.json()["deal_id"] == deal_id
    listed = client.get("/api/emails", params={"deal_id": deal_id})
    assert listed.json()["total"] == 1


def test_mailbox_is_company_scoped(client, db):
    company, admin = _admin(client, db, "MBA")
    db.add(MailboxConnection(
        company_id=company.id,
        user_id=admin.id,
        provider="google",
        email="a@gmail.com",
        refresh_token_encrypted="x",
        status="active",
    ))
    db.commit()

    other = create_company(db, name="Other", company_code="MBO")
    create_active_user(db, email="admin@mbo.com", role="admin", company_id=other.id)
    login_user(client, "admin@mbo.com")
    body = client.get("/api/mailbox").json()
    assert body["connected"] is False


def test_disconnect_mailbox(client, db):
    company, admin = _admin(client, db, "MBK")
    db.add(MailboxConnection(
        company_id=company.id,
        user_id=admin.id,
        provider="google",
        email="a@gmail.com",
        refresh_token_encrypted="x",
        status="active",
    ))
    db.commit()
    assert client.delete("/api/mailbox").status_code == 204
    assert client.get("/api/mailbox").json()["connected"] is False
    assert db.query(MailboxConnection).count() == 0
    assert client.delete("/api/mailbox").status_code == 204
