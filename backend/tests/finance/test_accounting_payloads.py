from datetime import date
from decimal import Decimal

from app.models.core.enums import InvoiceStatus
from app.models.finance.invoice import Invoice, InvoiceItem
from app.models.sales.client import Client
from app.services.accounting.payloads import (
    payload_hash,
    quickbooks_payload,
    stub_external_id,
    tally_payload,
)


def _invoice():
    inv = Invoice(
        company_id=1,
        invoice_number="INV-1",
        client_id=7,
        subtotal=Decimal("100.00"),
        tax=Decimal("18.00"),
        cgst=Decimal("9.00"),
        sgst=Decimal("9.00"),
        igst=Decimal("0.00"),
        total=Decimal("118.00"),
        status=InvoiceStatus.PAID,
        issued_date=date(2026, 8, 1),
        due_date=date(2026, 8, 31),
        notes="Site visit",
    )
    items = [
        InvoiceItem(company_id=1, description="Install", quantity=2,
                    unit_price=Decimal("50.00"), total=Decimal("100.00"), hsn="9983"),
    ]
    client = Client(company_id=1, name="Acme Pvt Ltd")
    return inv, items, client


def test_tally_sales_voucher_shape():
    inv, items, client = _invoice()
    body = tally_payload(inv, items, client)
    assert body["provider"] == "tally"
    v = body["voucher"]
    assert v["VoucherType"] == "Sales"
    assert v["VoucherNumber"] == "INV-1"
    assert v["PartyLedgerName"] == "Acme Pvt Ltd"
    names = [l["LedgerName"] for l in v["Ledgers"]]
    assert "Acme Pvt Ltd" in names
    assert "Sales" in names
    assert "CGST" in names
    assert "SGST" in names


def test_quickbooks_invoice_shape():
    inv, items, client = _invoice()
    body = quickbooks_payload(inv, items, client)
    assert body["provider"] == "quickbooks"
    q = body["Invoice"]
    assert q["DocNumber"] == "INV-1"
    assert q["CustomerRef"]["name"] == "Acme Pvt Ltd"
    assert q["TotalAmt"] == 118.0
    assert q["Line"][0]["Description"] == "Install"
    assert q["Line"][0]["Amount"] == 100.0


def test_external_id_is_deterministic():
    a = stub_external_id("tally", 1, "INV-1")
    b = stub_external_id("tally", 1, "INV-1")
    c = stub_external_id("quickbooks", 1, "INV-1")
    assert a == b
    assert len(a) == 32
    assert a != c


def test_payload_hash_stable():
    inv, items, client = _invoice()
    p = tally_payload(inv, items, client)
    assert payload_hash(p) == payload_hash(p)
    p2 = dict(p)
    p2["voucher"] = {**p["voucher"], "Narration": "changed"}
    assert payload_hash(p) != payload_hash(p2)
