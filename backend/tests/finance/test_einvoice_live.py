"""Phase 7.6 — live GST IRN transport + wiring. httpx is faked; no real NIC."""
import httpx
import pytest

from app.models.core.company_settings import CompanySettings
from app.models.finance.invoice import Invoice
from app.services.finance.einvoice_transport import (
    EinvoicePushError,
    auth_token,
    generate_live_irn,
)
from app.utils.totp_crypto import encrypt_secret
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_client, create_company


class _FakeResponse:
    def __init__(self, status_code=200, payload=None):
        self.status_code = status_code
        self._payload = payload if payload is not None else {}

    def json(self):
        return self._payload


def _fake_post(captured, handler):
    def _post(url, json=None, headers=None, timeout=None, content=None):
        captured.append({"url": url, "json": json, "headers": headers})
        return handler(url, json=json, headers=headers)

    return _post


# --------------------------------------------------------------------------- #
# Transport                                                                    #
# --------------------------------------------------------------------------- #


def test_auth_token_posts_nic_shaped_body(monkeypatch):
    captured = []

    def handler(url, json=None, headers=None):
        return _FakeResponse(200, {"Data": {"AuthToken": "tok-1"}})

    monkeypatch.setattr(httpx, "post", _fake_post(captured, handler))
    token = auth_token(
        "https://nic.example/",
        gstin="27AABCU9603R1ZM",
        username="u1",
        password="p1",
        client_id="cid",
        client_secret="sec",
    )
    assert token == "tok-1"
    assert captured[0]["url"] == "https://nic.example/eivital/v1.04/auth"
    assert captured[0]["json"]["UserName"] == "u1"
    assert captured[0]["json"]["Password"] == "p1"
    assert captured[0]["json"]["Gstin"] == "27AABCU9603R1ZM"
    assert captured[0]["headers"]["client_id"] == "cid"
    assert captured[0]["headers"]["client_secret"] == "sec"


def test_auth_token_raises_on_http_error(monkeypatch):
    monkeypatch.setattr(
        httpx,
        "post",
        lambda *a, **k: _FakeResponse(401, {"error": "no"}),
    )
    with pytest.raises(EinvoicePushError, match="HTTP 401"):
        auth_token(
            "https://nic.example",
            gstin="27AABCU9603R1ZM",
            username="u",
            password="p",
            client_id="c",
            client_secret="s",
        )


def test_auth_token_raises_on_transport_error(monkeypatch):
    def boom(*a, **k):
        raise httpx.ConnectError("down")

    monkeypatch.setattr(httpx, "post", boom)
    with pytest.raises(EinvoicePushError, match="transport"):
        auth_token(
            "https://nic.example",
            gstin="27AABCU9603R1ZM",
            username="u",
            password="p",
            client_id="c",
            client_secret="s",
        )


def test_generate_live_irn_parses_data(monkeypatch):
    captured = []

    def handler(url, json=None, headers=None):
        return _FakeResponse(
            200,
            {
                "Data": {
                    "Irn": "a" * 64,
                    "AckNo": "112233",
                    "AckDt": "2026-08-26 10:00:00",
                    "SignedQRCode": "QRDATA" + ("x" * 200),
                }
            },
        )

    monkeypatch.setattr(httpx, "post", _fake_post(captured, handler))
    result = generate_live_irn(
        "https://nic.example",
        token="tok-1",
        payload={"Version": "1.1"},
    )
    assert result["irn"] == "a" * 64
    assert result["ack_no"] == "112233"
    assert result["ack_date"] == "2026-08-26 10:00:00"
    assert result["signed_qr"].startswith("QRDATA")
    assert captured[0]["url"] == "https://nic.example/eicore/v1.03/Invoice"
    assert captured[0]["headers"]["Authorization"] == "tok-1"


def test_generate_live_irn_raises_without_irn(monkeypatch):
    monkeypatch.setattr(
        httpx,
        "post",
        lambda *a, **k: _FakeResponse(200, {"Data": {}}),
    )
    with pytest.raises(EinvoicePushError, match="missing Irn"):
        generate_live_irn("https://nic.example", token="t", payload={})


# --------------------------------------------------------------------------- #
# Helpers                                                                      #
# --------------------------------------------------------------------------- #


def _setup_invoice(client, db, code="IRN1", buyer_gstin="29AAAAA0000A1Z5"):
    company = create_company(db, name=f"Co {code}", company_code=code)
    admin = create_active_user(
        db, email=f"admin@{code.lower()}.com", role="admin", company_id=company.id
    )
    db.add(
        CompanySettings(
            company_id=company.id,
            company_name="Perioxia Demo",
            gst_number="27AABCU9603R1ZM",
            tax_rate=18.0,
        )
    )
    customer = create_client(db, company_id=company.id, name="Buyer Co", email=f"b@{code.lower()}.com")
    customer.gstin = buyer_gstin
    db.commit()
    login_user(client, admin.email)
    created = client.post(
        "/api/invoices",
        json={
            "client_id": customer.id,
            "items": [{"description": "Site visit", "quantity": 1, "unit_price": 1000, "hsn": "9983"}],
        },
    )
    assert created.status_code == 201, created.text
    return company, admin, created.json()


def _set_live_creds(db, company_id, *, base_url="https://nic.example"):
    row = db.query(CompanySettings).filter(CompanySettings.company_id == company_id).first()
    row.einvoice_base_url = base_url
    row.einvoice_username = "portal-user"
    row.einvoice_password_encrypted = encrypt_secret("portal-pass")
    row.einvoice_client_id = "client-id"
    row.einvoice_client_secret_encrypted = encrypt_secret("client-sec")
    db.commit()
    return row


def _live_http_ok(monkeypatch, captured):
    def handler(url, json=None, headers=None):
        if url.endswith("/eivital/v1.04/auth"):
            return _FakeResponse(200, {"Data": {"AuthToken": "live-tok"}})
        return _FakeResponse(
            200,
            {
                "Data": {
                    "Irn": "b" * 64,
                    "AckNo": "998877",
                    "AckDt": "2026-08-26 12:00:00",
                    "SignedQRCode": "LIVE-QR",
                }
            },
        )

    monkeypatch.setattr(httpx, "post", _fake_post(captured, handler))


# --------------------------------------------------------------------------- #
# Service / API                                                                #
# --------------------------------------------------------------------------- #


def test_stub_mode_when_no_creds(client, db, monkeypatch):
    captured = []
    monkeypatch.setattr(httpx, "post", _fake_post(captured, lambda *a, **k: _FakeResponse(500)))
    _, _, inv = _setup_invoice(client, db, "STB")
    resp = client.post(f"/api/invoices/{inv['id']}/einvoice")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["mode"] == "stub"
    assert len(body["irn"]) == 64
    assert captured == []


def test_live_success_sets_provider_irn(client, db, monkeypatch):
    captured = []
    _live_http_ok(monkeypatch, captured)
    company, _, inv = _setup_invoice(client, db, "LIV")
    _set_live_creds(db, company.id)
    resp = client.post(f"/api/invoices/{inv['id']}/einvoice")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["mode"] == "live"
    assert body["irn"] == "b" * 64
    assert body["ack_no"] == "998877"
    assert any(c["url"].endswith("/eivital/v1.04/auth") for c in captured)
    assert any(c["url"].endswith("/eicore/v1.03/Invoice") for c in captured)
    detail = client.get(f"/api/invoices/{inv['id']}").json()
    assert detail["irn"] == "b" * 64


def test_live_failure_is_502_and_leaves_irn_null(client, db, monkeypatch):
    captured = []

    def handler(url, json=None, headers=None):
        return _FakeResponse(503, {"error": "down"})

    monkeypatch.setattr(httpx, "post", _fake_post(captured, handler))
    company, _, inv = _setup_invoice(client, db, "FL")
    _set_live_creds(db, company.id)
    resp = client.post(f"/api/invoices/{inv['id']}/einvoice")
    assert resp.status_code == 502
    row = db.query(Invoice).filter(Invoice.id == inv["id"]).first()
    assert row.irn is None


def test_idempotent_einvoice_skips_http(client, db, monkeypatch):
    captured = []
    _live_http_ok(monkeypatch, captured)
    company, _, inv = _setup_invoice(client, db, "IDM")
    _set_live_creds(db, company.id)
    first = client.post(f"/api/invoices/{inv['id']}/einvoice")
    assert first.status_code == 200
    n = len(captured)
    again = client.post(f"/api/invoices/{inv['id']}/einvoice")
    assert again.status_code == 200
    assert again.json()["irn"] == first.json()["irn"]
    assert len(captured) == n


def test_put_connection_encrypts_and_get_omits_secrets(client, db):
    company = create_company(db, name="Sec Co", company_code="SEC")
    admin = create_active_user(db, email="admin@sec.com", role="admin", company_id=company.id)
    db.add(CompanySettings(company_id=company.id, company_name="Sec", gst_number="27AABCU9603R1ZM"))
    db.commit()
    login_user(client, admin.email)

    bad = client.put("/api/einvoice/connection", json={"base_url": "ftp://bad"})
    assert bad.status_code == 400

    put = client.put(
        "/api/einvoice/connection",
        json={
            "base_url": "https://nic.example/",
            "username": "u",
            "password": "secret-pass",
            "client_id": "cid",
            "client_secret": "secret-sec",
        },
    )
    assert put.status_code == 200, put.text
    body = put.json()
    assert body["live"] is True
    assert body["base_url"] == "https://nic.example"
    assert body["password_set"] is True
    assert body["client_secret_set"] is True
    assert "password" not in body
    assert "client_secret" not in body
    dumped = str(body).lower()
    assert "secret-pass" not in dumped
    assert "secret-sec" not in dumped

    row = db.query(CompanySettings).filter(CompanySettings.company_id == company.id).first()
    assert row.einvoice_password_encrypted != "secret-pass"
    assert row.einvoice_client_secret_encrypted != "secret-sec"

    cleared = client.put("/api/einvoice/connection", json={"password": ""})
    assert cleared.status_code == 200
    assert cleared.json()["password_set"] is False
    assert cleared.json()["live"] is False


def test_foreign_invoice_einvoice_404(client, db):
    _, _, inv = _setup_invoice(client, db, "OWN")
    other = create_company(db, name="Else", company_code="ELS")
    spy = create_active_user(db, email="spy@els.com", role="admin", company_id=other.id)
    login_user(client, spy.email)
    assert client.post(f"/api/invoices/{inv['id']}/einvoice").status_code == 404
