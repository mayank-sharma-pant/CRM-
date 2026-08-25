from datetime import date
from decimal import Decimal

from app.models.core.enums import InvoiceStatus
from app.models.finance.invoice import Invoice, InvoiceItem
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_client, create_company


def _admin(client, db, code, role="admin"):
    company = create_company(db, name=f"Co {code}", company_code=code)
    user = create_active_user(
        db, email=f"{role}@{code.lower()}.com", role=role, company_id=company.id
    )
    login_user(client, user.email)
    return company, user


def _paid(db, company_id, number="INV-1"):
    cl = create_client(db, company_id=company_id, name="Acme")
    inv = Invoice(
        company_id=company_id, client_id=cl.id, invoice_number=number,
        subtotal=Decimal("10"), total=Decimal("10"),
        status=InvoiceStatus.PAID, issued_date=date(2026, 8, 1),
    )
    db.add(inv)
    db.flush()
    db.add(InvoiceItem(
        company_id=company_id, invoice_id=inv.id, description="Work",
        quantity=1, unit_price=Decimal("10"), total=Decimal("10"),
    ))
    db.commit()
    db.refresh(inv)
    return inv


def test_connection_starts_disconnected(client, db):
    _admin(client, db, "AA1")
    resp = client.get("/api/accounting/connection")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["status"] == "disconnected"
    assert body["provider"] is None


def test_connect_and_sync(client, db):
    company, _ = _admin(client, db, "AA2")
    inv = _paid(db, company.id)
    put = client.put("/api/accounting/connection", json={"provider": "tally"})
    assert put.status_code == 200, put.text
    assert put.json()["status"] == "connected"
    assert put.json()["provider"] == "tally"
    sync = client.post("/api/accounting/sync")
    assert sync.status_code == 200, sync.text
    body = sync.json()
    assert body["pushed"] == 1
    items = client.get("/api/accounting/items").json()["items"]
    assert len(items) == 1
    assert items[0]["invoice_id"] == inv.id
    assert items[0]["status"] == "synced"
    again = client.post("/api/accounting/sync")
    assert again.json()["unchanged"] == 1


def test_sync_without_connection_is_400(client, db):
    _admin(client, db, "AA3")
    resp = client.post("/api/accounting/sync")
    assert resp.status_code == 400


def test_unknown_provider_is_400(client, db):
    _admin(client, db, "AA4")
    resp = client.put("/api/accounting/connection", json={"provider": "xero"})
    assert resp.status_code == 400


def test_sales_cannot_manage_connection(client, db):
    _admin(client, db, "AA5", role="sales")
    assert client.get("/api/accounting/connection").status_code == 403
    assert client.put("/api/accounting/connection", json={"provider": "tally"}).status_code == 403
    assert client.post("/api/accounting/sync").status_code == 403


def test_disconnect(client, db):
    _admin(client, db, "AA6")
    client.put("/api/accounting/connection", json={"provider": "quickbooks"})
    resp = client.delete("/api/accounting/connection")
    assert resp.status_code == 200
    assert resp.json()["status"] == "disconnected"
