"""Phase 7.5 — live Tally transport + service wiring. httpx is faked; no real Tally."""
from datetime import date
from decimal import Decimal

import httpx
import pytest

from app.models.core.enums import InvoiceStatus
from app.models.finance.invoice import Invoice, InvoiceItem
from app.services.accounting import service as acct_service
from app.services.accounting import tally_transport
from app.services.accounting.payloads import tally_payload
from app.services.accounting.tally_transport import (
    TallyPushError,
    push_tally,
    render_tally_xml,
)
from tests.helpers.factories import create_client, create_company


# --------------------------------------------------------------------------- #
# Fakes                                                                        #
# --------------------------------------------------------------------------- #
class _FakeResponse:
    def __init__(self, status_code=200, text=""):
        self.status_code = status_code
        self.text = text


def _ok_body(vch_id="4271"):
    return (
        "<RESPONSE><CREATED>1</CREATED><ALTERED>0</ALTERED>"
        f"<LASTVCHID>{vch_id}</LASTVCHID><LINEERROR></LINEERROR></RESPONSE>"
    )


def _fake_post(captured):
    def _post(url, content=None, headers=None, timeout=None):
        captured["url"] = url
        captured["content"] = content
        captured["called"] = captured.get("called", 0) + 1
        return _FakeResponse(200, _ok_body())
    return _post


def _invoice(db, company_id, client_id, number="INV-T1", status=InvoiceStatus.PAID):
    inv = Invoice(
        company_id=company_id, client_id=client_id, invoice_number=number,
        subtotal=Decimal("100.00"), tax=Decimal("18.00"), total=Decimal("118.00"),
        cgst=Decimal("9.00"), sgst=Decimal("9.00"), igst=Decimal("0"),
        status=status, issued_date=date(2026, 8, 3), notes="Site visit",
    )
    db.add(inv)
    db.flush()
    db.add(InvoiceItem(
        company_id=company_id, invoice_id=inv.id, description="Work",
        quantity=1, unit_price=Decimal("100.00"), total=Decimal("100.00"),
    ))
    db.commit()
    db.refresh(inv)
    return inv


# --------------------------------------------------------------------------- #
# render_tally_xml                                                             #
# --------------------------------------------------------------------------- #
def test_render_contains_envelope_and_voucher_fields():
    payload = tally_payload(
        _StubInvoice(), [], _StubClient("Acme Ltd"),
    )
    xml = render_tally_xml(payload, "My Co")
    assert "<TALLYREQUEST>Import Data</TALLYREQUEST>" in xml
    assert "<REPORTNAME>Vouchers</REPORTNAME>" in xml
    assert "<SVCURRENTCOMPANY>My Co</SVCURRENTCOMPANY>" in xml
    assert "<VOUCHERNUMBER>INV-9</VOUCHERNUMBER>" in xml
    assert "<PARTYLEDGERNAME>Acme Ltd</PARTYLEDGERNAME>" in xml
    assert "<DATE>20260803</DATE>" in xml  # YYYYMMDD, no dashes


def test_render_ledger_signs():
    payload = tally_payload(_StubInvoice(), [], _StubClient("Acme Ltd"))
    xml = render_tally_xml(payload, "Co")
    # Party ledger is deemed-positive (debit) → negative amount.
    party_block = xml.split("<ALLLEDGERENTRIES.LIST>")[1]
    assert "<ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>" in party_block
    assert "<AMOUNT>-118.00</AMOUNT>" in party_block
    # Sales ledger is a credit → positive amount.
    assert "<AMOUNT>100.00</AMOUNT>" in xml


def test_render_escapes_special_chars():
    payload = tally_payload(_StubInvoice(), [], _StubClient("A & B <Co>"))
    xml = render_tally_xml(payload, "Co")
    assert "A &amp; B &lt;Co&gt;" in xml


# --------------------------------------------------------------------------- #
# push_tally                                                                   #
# --------------------------------------------------------------------------- #
def test_push_success_returns_voucher_id(monkeypatch):
    captured = {}
    monkeypatch.setattr(tally_transport.httpx, "post", _fake_post(captured))
    result = push_tally("http://tally.test:9000", "<ENVELOPE/>", voucher_number="INV-1")
    assert result["external_id"] == "4271"
    assert result["created"] == 1
    assert captured["url"] == "http://tally.test:9000"
    assert captured["called"] == 1


def test_push_line_error_raises(monkeypatch):
    body = "<RESPONSE><LINEERROR>Ledger 'Acme' does not exist</LINEERROR></RESPONSE>"
    monkeypatch.setattr(tally_transport.httpx, "post",
                        lambda *a, **k: _FakeResponse(200, body))
    with pytest.raises(TallyPushError) as ei:
        push_tally("http://tally.test:9000", "<ENVELOPE/>")
    assert "does not exist" in str(ei.value)


def test_push_http_error_raises(monkeypatch):
    monkeypatch.setattr(tally_transport.httpx, "post",
                        lambda *a, **k: _FakeResponse(500, "boom"))
    with pytest.raises(TallyPushError):
        push_tally("http://tally.test:9000", "<ENVELOPE/>")


def test_push_transport_error_raises(monkeypatch):
    def _boom(*a, **k):
        raise httpx.ConnectError("refused")
    monkeypatch.setattr(tally_transport.httpx, "post", _boom)
    with pytest.raises(TallyPushError):
        push_tally("http://tally.test:9000", "<ENVELOPE/>")


def test_push_no_created_marker_raises(monkeypatch):
    body = "<RESPONSE><CREATED>0</CREATED><ALTERED>0</ALTERED></RESPONSE>"
    monkeypatch.setattr(tally_transport.httpx, "post",
                        lambda *a, **k: _FakeResponse(200, body))
    with pytest.raises(TallyPushError):
        push_tally("http://tally.test:9000", "<ENVELOPE/>")


# --------------------------------------------------------------------------- #
# service wiring: live vs stub                                                 #
# --------------------------------------------------------------------------- #
def test_connect_persists_tally_url(db):
    company = create_company(db, name="Co", company_code="TAL1")
    row = acct_service.connect(
        db, company.id, "tally",
        tally_url="http://tally.local:9000", tally_company_name="My Books",
    )
    assert row.tally_url == "http://tally.local:9000"
    assert row.tally_company_name == "My Books"


def test_connect_rejects_bad_url(db):
    company = create_company(db, name="Co", company_code="TAL2")
    with pytest.raises(ValueError):
        acct_service.connect(db, company.id, "tally", tally_url="ftp://nope")


def test_live_sync_pushes_and_records_voucher_id(db, monkeypatch):
    company = create_company(db, name="Co", company_code="TAL3")
    client = create_client(db, company_id=company.id, name="Acme Ltd")
    inv = _invoice(db, company.id, client.id)
    acct_service.connect(db, company.id, "tally", tally_url="http://tally.test:9000")
    captured = {}
    monkeypatch.setattr(tally_transport.httpx, "post", _fake_post(captured))

    result = acct_service.sync_invoice(db, company.id, inv)
    assert result["status"] == "synced"
    assert result["mode"] == "live"
    assert result["external_id"] == "4271"
    assert captured["called"] == 1


def test_live_sync_failure_marks_failed_no_raise(db, monkeypatch):
    company = create_company(db, name="Co", company_code="TAL4")
    client = create_client(db, company_id=company.id, name="Acme Ltd")
    inv = _invoice(db, company.id, client.id)
    acct_service.connect(db, company.id, "tally", tally_url="http://tally.test:9000")
    body = "<RESPONSE><LINEERROR>bad ledger</LINEERROR></RESPONSE>"
    monkeypatch.setattr(tally_transport.httpx, "post",
                        lambda *a, **k: _FakeResponse(200, body))

    result = acct_service.sync_invoice(db, company.id, inv)
    assert result["status"] == "failed"
    assert result["mode"] == "live"
    assert not result.get("external_id")
    conn = acct_service.get_connection(db, company.id)
    assert conn.last_error and "bad ledger" in conn.last_error


def test_stub_mode_when_no_url(db, monkeypatch):
    company = create_company(db, name="Co", company_code="TAL5")
    client = create_client(db, company_id=company.id, name="Acme Ltd")
    inv = _invoice(db, company.id, client.id)
    acct_service.connect(db, company.id, "tally")  # no url → stub
    called = {"n": 0}
    def _post(*a, **k):
        called["n"] += 1
        return _FakeResponse(200, _ok_body())
    monkeypatch.setattr(tally_transport.httpx, "post", _post)

    result = acct_service.sync_invoice(db, company.id, inv)
    assert result["mode"] == "stub"
    assert result["status"] == "synced"
    assert result["external_id"] and result["external_id"] != "4271"
    assert called["n"] == 0
    # 5.4 idempotency still holds.
    second = acct_service.sync_invoice(db, company.id, inv)
    assert second["unchanged"] is True


def test_quickbooks_stays_stub_even_with_url(db, monkeypatch):
    company = create_company(db, name="Co", company_code="TAL6")
    client = create_client(db, company_id=company.id, name="Acme Ltd")
    inv = _invoice(db, company.id, client.id)
    acct_service.connect(db, company.id, "quickbooks", tally_url="http://tally.test:9000")
    called = {"n": 0}
    monkeypatch.setattr(tally_transport.httpx, "post",
                        lambda *a, **k: called.__setitem__("n", called["n"] + 1) or _FakeResponse())
    result = acct_service.sync_invoice(db, company.id, inv)
    assert result["mode"] == "stub"
    assert called["n"] == 0


# --------------------------------------------------------------------------- #
# routes                                                                       #
# --------------------------------------------------------------------------- #
def test_connection_api_reflects_tally_fields(client, db):
    from tests.helpers.auth import create_active_user, login_user

    company = create_company(db, name="Co", company_code="TAPI1")
    user = create_active_user(db, email="a@tapi1.com", role="admin", company_id=company.id)
    login_user(client, user.email)

    put = client.put(
        "/api/accounting/connection",
        json={"provider": "tally", "tally_url": "http://tally.local:9000",
              "tally_company_name": "My Books"},
    )
    assert put.status_code == 200, put.text
    body = put.json()
    assert body["tally_url"] == "http://tally.local:9000"
    assert body["tally_company_name"] == "My Books"
    assert body["live"] is True

    get = client.get("/api/accounting/connection").json()
    assert get["live"] is True

    # Reconnecting with no url clears it → back to stub.
    put2 = client.put("/api/accounting/connection", json={"provider": "tally"})
    assert put2.json()["live"] is False
    assert put2.json()["tally_url"] is None


def test_connection_api_rejects_bad_url(client, db):
    from tests.helpers.auth import create_active_user, login_user

    company = create_company(db, name="Co", company_code="TAPI2")
    user = create_active_user(db, email="a@tapi2.com", role="admin", company_id=company.id)
    login_user(client, user.email)
    resp = client.put(
        "/api/accounting/connection",
        json={"provider": "tally", "tally_url": "ftp://nope"},
    )
    assert resp.status_code == 400


# --------------------------------------------------------------------------- #
# lightweight stubs for the pure-render tests                                 #
# --------------------------------------------------------------------------- #
class _StubInvoice:
    invoice_number = "INV-9"
    total = Decimal("118.00")
    subtotal = Decimal("100.00")
    cgst = Decimal("9.00")
    sgst = Decimal("9.00")
    igst = Decimal("0")
    issued_date = date(2026, 8, 3)
    notes = "Site visit"


class _StubClient:
    def __init__(self, name):
        self.name = name
