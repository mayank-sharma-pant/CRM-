from datetime import date
from decimal import Decimal

from app.models.core.enums import InvoiceStatus
from app.models.finance.invoice import Invoice, InvoiceItem
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_client, create_company


def test_invoice_accounting_detail_and_sync(client, db):
    company = create_company(db, name="Co AD1", company_code="AD1")
    admin = create_active_user(db, email="admin@ad1.com", role="admin", company_id=company.id)
    cl = create_client(db, company_id=company.id, name="Buyer")
    inv = Invoice(
        company_id=company.id, client_id=cl.id, invoice_number="INV-AD",
        subtotal=Decimal("5"), total=Decimal("5"),
        status=InvoiceStatus.PENDING, issued_date=date(2026, 8, 2),
    )
    db.add(inv)
    db.flush()
    db.add(InvoiceItem(
        company_id=company.id, invoice_id=inv.id, description="Line",
        quantity=1, unit_price=Decimal("5"), total=Decimal("5"),
    ))
    db.commit()
    db.refresh(inv)
    login_user(client, admin.email)

    empty = client.get(f"/api/invoices/{inv.id}/accounting")
    assert empty.status_code == 200, empty.text
    assert empty.json()["status"] is None

    assert client.post(f"/api/invoices/{inv.id}/sync").status_code == 400

    client.put("/api/accounting/connection", json={"provider": "quickbooks"})
    pushed = client.post(f"/api/invoices/{inv.id}/sync")
    assert pushed.status_code == 200, pushed.text
    assert pushed.json()["status"] == "synced"
    assert pushed.json()["provider"] == "quickbooks"

    detail = client.get(f"/api/invoices/{inv.id}/accounting").json()
    assert detail["status"] == "synced"
    assert detail["external_id"] == pushed.json()["external_id"]
