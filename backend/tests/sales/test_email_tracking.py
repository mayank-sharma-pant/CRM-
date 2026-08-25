"""Phase 7.1 — email open pixel + click redirect on outbound CRM mail."""
import html as html_mod
import re
from unittest.mock import patch

import pytest

from app.config import Settings, settings
from app.models.sales.email_log import EmailLog
from app.models.sales.mailbox import MailboxConnection
from app.services.sales.crm_email import serialize_email
from app.services.sales.email_tracking import tracking_base
from app.utils.rate_limit import auth_limiter, tracking_limiter
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company

BASE = "http://api.test"
LINK = "https://perioxia.com/site-visit?ref=7"
SHIPPED_DEFAULT = Settings.model_fields["PUBLIC_API_URL"].default


@pytest.fixture(autouse=True)
def _reset(monkeypatch):
    auth_limiter._buckets.clear()
    tracking_limiter._buckets.clear()
    monkeypatch.setattr(settings, "PUBLIC_API_URL", BASE)
    yield


def _admin(client, db, code):
    company = create_company(db, name=f"Track {code}", company_code=code)
    admin = create_active_user(
        db, email=f"admin@{code.lower()}.com", role="admin", company_id=company.id
    )
    login_user(client, admin.email)
    return company, admin


def _send(client, *, body="Hello", to_email="buyer@x.com", subject="Site visit"):
    """POST /api/emails with SMTP captured. Returns (payload, sent_html)."""
    captured = {}

    def fake_send(to, subj, content):
        captured["html"] = content
        return True

    with patch("app.services.sales.crm_email.send_email", side_effect=fake_send):
        resp = client.post(
            "/api/emails", json={"to_email": to_email, "subject": subject, "body": body}
        )
    assert resp.status_code == 201, resp.text
    return resp.json(), captured.get("html", "")


def _path(url: str) -> str:
    assert url.startswith(BASE), url
    return url[len(BASE):]


def _pixel_path(sent_html: str) -> str:
    match = re.search(r'<img[^>]*\ssrc="([^"]+)"', sent_html)
    assert match, sent_html
    return _path(html_mod.unescape(match.group(1)))


def _click_path(sent_html: str) -> str:
    match = re.search(r'<a[^>]*\shref="([^"]+)"', sent_html)
    assert match, sent_html
    return _path(html_mod.unescape(match.group(1)))


def test_open_pixel_is_injected_and_increments_open_count(client, db):
    _admin(client, db, "TKA")
    payload, sent_html = _send(client)
    assert payload["open_count"] == 0

    pixel = _pixel_path(sent_html)
    assert pixel.startswith("/api/public/track/o/")
    assert pixel.endswith(".gif")

    hit = client.get(pixel)
    assert hit.status_code == 200
    assert hit.headers["content-type"].startswith("image/gif")
    assert hit.content.startswith(b"GIF89a")

    after = client.get(f"/api/emails/{payload['id']}").json()
    assert after["open_count"] == 1
    assert after["click_count"] == 0

    client.get(pixel)
    assert client.get(f"/api/emails/{payload['id']}").json()["open_count"] == 2


def test_click_link_redirects_to_original_and_increments_click_count(client, db):
    _admin(client, db, "TKB")
    payload, sent_html = _send(client, body=f"Book here: {LINK}")

    click = _click_path(sent_html)
    assert click.startswith("/api/public/track/c/")

    hit = client.get(click, follow_redirects=False)
    assert hit.status_code == 302
    assert hit.headers["location"] == LINK

    after = client.get(f"/api/emails/{payload['id']}").json()
    assert after["click_count"] == 1
    assert after["open_count"] == 0


def test_stored_body_keeps_the_original_unwrapped_text(client, db):
    _admin(client, db, "TKC")
    payload, sent_html = _send(client, body=f"Book here: {LINK}")
    assert payload["body"] == f"Book here: {LINK}"
    assert "/api/public/track/c/" in sent_html

    row = db.query(EmailLog).filter(EmailLog.id == payload["id"]).one()
    assert row.body == f"Book here: {LINK}"
    assert "track" not in row.body


def test_unknown_open_token_returns_gif_without_incrementing(client, db):
    _admin(client, db, "TKD")
    payload, _ = _send(client)

    hit = client.get("/api/public/track/o/not-a-real-token.gif")
    assert hit.status_code == 200
    assert hit.content.startswith(b"GIF89a")

    assert client.get(f"/api/emails/{payload['id']}").json()["open_count"] == 0


def test_unknown_or_tampered_click_token_is_404(client, db):
    _admin(client, db, "TKE")
    payload, sent_html = _send(client, body=f"Book here: {LINK}")
    click = _click_path(sent_html)

    assert client.get("/api/public/track/c/nope?u=aHR0cDovL3g=&s=deadbeef").status_code == 404

    token = click.split("/api/public/track/c/")[1].split("?")[0]
    assert client.get(f"/api/public/track/c/{token}").status_code == 404

    tampered = re.sub(r"u=[^&]+", "u=aHR0cHM6Ly9ldmlsLmV4YW1wbGUuY29t", click)
    assert client.get(tampered, follow_redirects=False).status_code == 404

    assert client.get(f"/api/emails/{payload['id']}").json()["click_count"] == 0


def test_tracking_urls_do_not_leak_another_companys_email(client, db):
    company_a, _ = _admin(client, db, "TKF")
    payload, sent_html = _send(client, body=f"Secret plan {LINK}", subject="Confidential")
    pixel = _pixel_path(sent_html)
    click = _click_path(sent_html)

    other = create_company(db, name="Other", company_code="TKG")
    create_active_user(db, email="admin@tkg.com", role="admin", company_id=other.id)
    login_user(client, "admin@tkg.com")

    assert client.get(f"/api/emails/{payload['id']}").status_code == 404
    assert client.get("/api/emails").json()["total"] == 0

    opened = client.get(pixel)
    assert opened.status_code == 200
    assert b"Confidential" not in opened.content
    assert b"Secret plan" not in opened.content

    clicked = client.get(click, follow_redirects=False)
    assert clicked.status_code == 302
    assert "Confidential" not in clicked.text
    assert "Secret plan" not in clicked.text

    # Counters moved on company A's row, and company B still cannot read them.
    assert client.get(f"/api/emails/{payload['id']}").status_code == 404
    row = db.query(EmailLog).filter(EmailLog.id == payload["id"]).one()
    assert row.company_id == company_a.id
    assert row.open_count == 1
    assert row.click_count == 1


def test_serialize_email_exposes_counts_and_never_hashes(client, db):
    company, _ = _admin(client, db, "TKH")
    payload, _ = _send(client)
    row = db.query(EmailLog).filter(EmailLog.id == payload["id"]).one()
    assert row.open_token_hash and len(row.open_token_hash) == 64
    assert row.click_token_hash and len(row.click_token_hash) == 64

    data = serialize_email(row)
    assert data["open_count"] == 0
    assert data["click_count"] == 0
    assert not any("token" in key or "hash" in key for key in data)

    listed = client.get("/api/emails").json()["items"][0]
    assert listed["open_count"] == 0
    assert row.open_token_hash not in client.get("/api/emails").text


@pytest.mark.parametrize(
    "public_api_url",
    [
        "",
        SHIPPED_DEFAULT,
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://[::1]:8000",
        "https://localhost",
        "api.test",
    ],
)
def test_no_injection_when_base_is_empty_or_unreachable(client, db, monkeypatch, public_api_url):
    """A loopback or scheme-less origin is dead in a recipient's mail client.

    `PUBLIC_API_URL` ships as http://localhost:8000, so an install that never set
    it must send links unwrapped rather than rewriting them to localhost.
    """
    _admin(client, db, "TKI")
    monkeypatch.setattr(settings, "PUBLIC_API_URL", public_api_url)
    payload, sent_html = _send(client, body=f"Book here: {LINK}")

    assert "/api/public/track" not in sent_html
    assert "<img" not in sent_html
    assert "<a " not in sent_html
    assert LINK in html_mod.unescape(sent_html)

    row = db.query(EmailLog).filter(EmailLog.id == payload["id"]).one()
    assert row.open_token_hash is None
    assert row.click_token_hash is None
    assert row.open_count == 0


def test_shipped_default_public_api_url_is_loopback(monkeypatch):
    """Guards the parametrised case above against a future default change."""
    monkeypatch.setattr(settings, "PUBLIC_API_URL", SHIPPED_DEFAULT)
    assert tracking_base() is None

    monkeypatch.setattr(settings, "PUBLIC_API_URL", "https://api.perioxia.com/")
    assert tracking_base() == "https://api.perioxia.com"


def test_non_loopback_base_injects_both_pixel_and_click(client, db, monkeypatch):
    _admin(client, db, "TKK")
    monkeypatch.setattr(settings, "PUBLIC_API_URL", "https://api.perioxia.com")
    payload, sent_html = _send(client, body=f"Book here: {LINK}")

    assert 'src="https://api.perioxia.com/api/public/track/o/' in sent_html
    assert 'href="https://api.perioxia.com/api/public/track/c/' in sent_html

    row = db.query(EmailLog).filter(EmailLog.id == payload["id"]).one()
    assert row.open_token_hash and row.click_token_hash


def test_mailbox_transport_sends_the_tracked_html(client, db, monkeypatch):
    company, admin = _admin(client, db, "TKJ")
    db.add(MailboxConnection(
        company_id=company.id,
        user_id=admin.id,
        provider="google",
        email="me@gmail.com",
        refresh_token_encrypted="x",
        status="active",
    ))
    db.commit()

    captured = {}

    def fake_send(connection, *, to_email, subject, body, db=None):
        captured["body"] = body
        return "gmail-msg-track"

    monkeypatch.setattr("app.services.sales.crm_email.send_via_mailbox", fake_send)
    resp = client.post("/api/emails", json={
        "to_email": "buyer@x.com", "subject": "Visit", "body": f"Book: {LINK}",
    })
    assert resp.status_code == 201, resp.text
    assert resp.json()["provider"] == "google"

    sent_html = captured["body"]
    assert "/api/public/track/o/" in sent_html
    assert "/api/public/track/c/" in sent_html

    hit = client.get(_pixel_path(sent_html))
    assert hit.status_code == 200
    assert client.get(f"/api/emails/{resp.json()['id']}").json()["open_count"] == 1
