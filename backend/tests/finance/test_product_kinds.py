from app.models.ops.stock_item import StockItem
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


def test_product_kinds_and_stock_rules(client, db):
    company = create_company(db, name="Kinds Co", company_code="KND")
    admin = create_active_user(db, email="admin@knd.com", role="admin", company_id=company.id)
    stock = StockItem(company_id=company.id, name="Widget", sku="W1", unit="pcs", quantity=5, unit_price=10)
    db.add(stock)
    db.commit()
    db.refresh(stock)
    login_user(client, admin.email)

    goods = client.post("/api/products", json={
        "name": "Widget SKU", "unit_price": 50, "tax_rate": 18, "kind": "goods", "stock_item_id": stock.id,
    })
    assert goods.status_code == 201, goods.text
    assert goods.json()["kind"] == "goods"
    assert goods.json()["stock_item_id"] == stock.id

    service = client.post("/api/products", json={
        "name": "Install", "unit_price": 500, "tax_rate": 18, "kind": "service", "stock_item_id": stock.id,
    })
    assert service.status_code == 201, service.text
    body = service.json()
    assert body["kind"] == "service"
    assert body["stock_item_id"] is None
    assert body["unit"] == "job"

    sub = client.post("/api/products", json={
        "name": "CRM Seat", "unit_price": 999, "tax_rate": 18, "kind": "subscription",
    })
    assert sub.status_code == 201, sub.text
    s = sub.json()
    assert s["kind"] == "subscription"
    assert s["billing_interval"] == "monthly"
    assert s["stock_item_id"] is None

    bad = client.post("/api/products", json={
        "name": "X", "unit_price": 1, "tax_rate": 18, "kind": "bundle",
    })
    assert bad.status_code == 400
