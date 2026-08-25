from datetime import date
from decimal import Decimal

import pytest

from app.models.core.enums import InvoiceStatus
from app.models.finance.accounting import AccountingConnection, AccountingSyncItem
from app.models.finance.invoice import Invoice, InvoiceItem
from app.services.accounting.service import (
    AccountingNotConnected,
    connect,
    disconnect,
    get_connection,
    sync_all,
    sync_invoice,
)
from tests.helpers.factories import create_client, create_company


def _paid_invoice(db, company_id, client_id, number="INV-A"):
    inv = Invoice(
        company_id=company_id, client_id=client_id, invoice_number=number,
        subtotal=Decimal("10.00"), tax=Decimal("0"), total=Decimal("10.00"),
        status=InvoiceStatus.PAID, issued_date=date(2026, 8, 1),
    )
    db.add(inv)
    db.flush()
    db.add(InvoiceItem(
        company_id=company_id, invoice_id=inv.id, description="Work",
        quantity=1, unit_price=Decimal("10.00"), total=Decimal("10.00"),
    ))
    db.commit()
    db.refresh(inv)
    return inv


def test_connect_and_disconnect(db):
    company = create_company(db, name="Co", company_code="ACC1")
    row = connect(db, company.id, "tally")
    assert row.status == "connected"
    assert row.provider == "tally"
    assert get_connection(db, company.id).status == "connected"
    disconnect(db, company.id)
    assert get_connection(db, company.id).status == "disconnected"


def test_connect_rejects_unknown_provider(db):
    company = create_company(db, name="Co", company_code="ACC2")
    with pytest.raises(ValueError):
        connect(db, company.id, "xero")


def test_sync_requires_connection(db):
    company = create_company(db, name="Co", company_code="ACC3")
    cl = create_client(db, company_id=company.id, name="C")
    inv = _paid_invoice(db, company.id, cl.id)
    with pytest.raises(AccountingNotConnected):
        sync_invoice(db, company.id, inv)


def test_draft_is_skipped(db):
    company = create_company(db, name="Co", company_code="ACC4")
    connect(db, company.id, "tally")
    cl = create_client(db, company_id=company.id, name="C")
    inv = Invoice(
        company_id=company.id, client_id=cl.id, invoice_number="INV-D",
        total=Decimal("1"), status=InvoiceStatus.DRAFT,
    )
    db.add(inv)
    db.commit()
    result = sync_invoice(db, company.id, inv)
    assert result["status"] == "skipped"
    assert result["unchanged"] is False


def test_paid_push_is_idempotent(db):
    company = create_company(db, name="Co", company_code="ACC5")
    connect(db, company.id, "quickbooks")
    cl = create_client(db, company_id=company.id, name="C")
    inv = _paid_invoice(db, company.id, cl.id, "INV-P")
    first = sync_invoice(db, company.id, inv)
    assert first["status"] == "synced"
    assert first["external_id"]
    assert first["unchanged"] is False
    second = sync_invoice(db, company.id, inv)
    assert second["unchanged"] is True
    assert second["external_id"] == first["external_id"]
    assert db.query(AccountingSyncItem).count() == 1


def test_payload_change_keeps_external_id(db):
    company = create_company(db, name="Co", company_code="ACC6")
    connect(db, company.id, "tally")
    cl = create_client(db, company_id=company.id, name="C")
    inv = _paid_invoice(db, company.id, cl.id, "INV-U")
    first = sync_invoice(db, company.id, inv)
    inv.notes = "updated"
    db.commit()
    second = sync_invoice(db, company.id, inv)
    assert second["unchanged"] is False
    assert second["external_id"] == first["external_id"]
    assert second["status"] == "synced"


def test_sync_all_counts(db):
    company = create_company(db, name="Co", company_code="ACC7")
    connect(db, company.id, "tally")
    cl = create_client(db, company_id=company.id, name="C")
    _paid_invoice(db, company.id, cl.id, "INV-1")
    draft = Invoice(
        company_id=company.id, client_id=cl.id, invoice_number="INV-D",
        total=Decimal("1"), status=InvoiceStatus.DRAFT,
    )
    db.add(draft)
    db.commit()
    summary = sync_all(db, company.id)
    assert summary["pushed"] == 1
    assert summary["skipped"] == 1
    assert summary["unchanged"] == 0
    assert get_connection(db, company.id).last_sync_at is not None
