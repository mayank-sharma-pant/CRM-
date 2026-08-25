from datetime import date
from decimal import Decimal

from app.models.core.enums import InvoiceStatus
from app.models.finance.invoice import Invoice
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_client, create_company


def _admin(client, db, code):
    company = create_company(db, name=f"Co {code}", company_code=code)
    user = create_active_user(
        db, email=f"admin@{code.lower()}.com", role="admin", company_id=company.id
    )
    login_user(client, user.email)
    return company, user


def test_foreign_invoice_accounting_404(client, db):
    company_a, _ = _admin(client, db, "ABX")
    company_b, admin_b = _admin(client, db, "ABY")
    cl = create_client(db, company_id=company_a.id, name="A")
    inv = Invoice(
        company_id=company_a.id, client_id=cl.id, invoice_number="INV-X",
        total=Decimal("1"), status=InvoiceStatus.PAID, issued_date=date(2026, 8, 1),
    )
    db.add(inv)
    db.commit()
    db.refresh(inv)

    login_user(client, admin_b.email)
    assert client.get(f"/api/invoices/{inv.id}/accounting").status_code == 404
    assert client.post(f"/api/invoices/{inv.id}/sync").status_code == 404

    company_a_admin = create_active_user(
        db, email="a2@abx.com", role="admin", company_id=company_a.id
    )
    login_user(client, company_a_admin.email)
    client.put("/api/accounting/connection", json={"provider": "tally"})
    assert client.get(f"/api/invoices/{inv.id}/accounting").status_code == 200
    assert client.post(f"/api/invoices/{inv.id}/sync").status_code == 200
