import pytest

from app.models.finance.invoice import Invoice, InvoiceItem
from app.models.ops.stock_item import StockItem
from app.utils.rate_limit import auth_limiter
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company, create_client


@pytest.fixture(autouse=True)
def _reset_auth_rate_limit():
    auth_limiter._buckets.clear()
    yield


def _admin(db, code="PR1"):
    company = create_company(db, name=f"Co {code}", company_code=code)
    admin = create_active_user(db, email=f"admin@{code}.com", role="admin", company_id=company.id)
    return company, admin


def test_create_list_get_patch_product(client, db):
    company, admin = _admin(db)
    login_user(client, admin.email)
    created = client.post("/api/products", json={
        "name": "Consult", "sku": "C-1", "unit": "hr", "unit_price": 1000,
        "tax_rate": 18, "hsn": "9983",
    })
    assert created.status_code == 201, created.text
    body = created.json()
    assert body["name"] == "Consult"
    assert body["tax_rate"] == 18.0
    assert body["stock_quantity"] is None
    listed = client.get("/api/products")
    assert listed.status_code == 200
    assert listed.json()["total"] == 1
    got = client.get(f"/api/products/{body['id']}")
    assert got.status_code == 200
    patched = client.patch(f"/api/products/{body['id']}", json={"tax_rate": 5, "is_active": False})
    assert patched.status_code == 200
    assert patched.json()["tax_rate"] == 5.0
    assert patched.json()["is_active"] is False
    hidden = client.get("/api/products")
    assert hidden.json()["total"] == 0
    shown = client.get("/api/products", params={"active_only": False})
    assert shown.json()["total"] == 1


def test_sales_cannot_write_purchase_can(client, db):
    company, admin = _admin(db, code="PR2")
    create_active_user(db, email="sales@pr2.com", role="sales", company_id=company.id)
    create_active_user(db, email="purchase@pr2.com", role="purchase", company_id=company.id)
    login_user(client, "sales@pr2.com")
    assert client.get("/api/products").status_code == 200
    assert client.post("/api/products", json={"name": "X", "unit_price": 1, "tax_rate": 18}).status_code == 403
    login_user(client, "purchase@pr2.com")
    assert client.post("/api/products", json={"name": "X", "unit_price": 1, "tax_rate": 18}).status_code == 201


def test_duplicate_sku_and_bad_stock_and_tax_rate(client, db):
    company, admin = _admin(db, code="PR3")
    login_user(client, admin.email)
    assert client.post("/api/products", json={"name": "A", "sku": "DUP", "unit_price": 1, "tax_rate": 18}).status_code == 201
    assert client.post("/api/products", json={"name": "B", "sku": "DUP", "unit_price": 1, "tax_rate": 18}).status_code == 400
    assert client.post("/api/products", json={"name": "C", "unit_price": 1, "tax_rate": 101}).status_code == 400
    other = create_company(db, name="O", company_code="PR3O")
    foreign_stock = StockItem(company_id=other.id, name="Chip", sku="CH", unit="pcs", quantity=5, unit_price=1)
    db.add(foreign_stock)
    db.commit()
    db.refresh(foreign_stock)
    bad = client.post("/api/products", json={
        "name": "Linked", "unit_price": 1, "tax_rate": 18, "stock_item_id": foreign_stock.id,
    })
    assert bad.status_code == 400


def test_delete_unused_204_referenced_400(client, db):
    company, admin = _admin(db, code="PR4")
    customer = create_client(db, company_id=company.id, name="Buyer", assigned_to_id=admin.id)
    login_user(client, admin.email)
    pid = client.post("/api/products", json={"name": "A", "unit_price": 1, "tax_rate": 18}).json()["id"]
    assert client.delete(f"/api/products/{pid}").status_code == 204
    pid2 = client.post("/api/products", json={"name": "B", "unit_price": 1, "tax_rate": 18}).json()["id"]
    inv = Invoice(company_id=company.id, invoice_number="INV-P", client_id=customer.id, subtotal=1, tax=0, total=1)
    db.add(inv)
    db.flush()
    db.add(InvoiceItem(company_id=company.id, invoice_id=inv.id, description="B", quantity=1, unit_price=1, total=1, product_id=pid2))
    db.commit()
    assert client.delete(f"/api/products/{pid2}").status_code == 400
