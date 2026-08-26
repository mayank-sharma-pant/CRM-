from app.models.core.company_settings import CompanySettings
from app.models.ops.stock_item import StockItem
from app.utils.rate_limit import auth_limiter
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_client, create_company


def _setup(client, db, *, gst_number=None, tax_rate=18.0):
    company = create_company(db, name="PG", company_code="PG1")
    admin = create_active_user(db, email="admin@pg1.com", role="admin", company_id=company.id)
    db.add(CompanySettings(
        company_id=company.id, company_name="PG", gst_number=gst_number, tax_rate=tax_rate,
    ))
    customer = create_client(db, company_id=company.id, name="Buyer", assigned_to_id=admin.id)
    db.commit()
    login_user(client, admin.email)
    p18 = client.post("/api/products", json={"name": "Std", "unit_price": 200, "tax_rate": 18, "hsn": "9983"}).json()
    p5 = client.post("/api/products", json={"name": "Food", "unit_price": 1000, "tax_rate": 5, "hsn": "2106"}).json()
    return company, admin, customer, p18, p5


def test_mixed_rates_sum_and_free_text_uses_company_rate(client, db):
    _company, _admin, customer, p18, p5 = _setup(client, db)
    created = client.post("/api/invoices", json={
        "client_id": customer.id,
        "items": [
            {"product_id": p5["id"], "quantity": 1, "unit_price": 1000, "description": "Food"},
            {"product_id": p18["id"], "quantity": 1, "unit_price": 200, "description": "Std"},
            {"description": "Extra", "quantity": 1, "unit_price": 100},
        ],
    })
    assert created.status_code == 201, created.text
    body = created.json()
    assert body["tax"] == 104.0  # 50 + 36 + 18
    assert body["tax_mode"] == "legacy"
    detail = client.get(f"/api/invoices/{body['id']}").json()
    rates = sorted(float(i["tax_rate"]) for i in detail["items"])
    assert rates == [5.0, 18.0, 18.0]


def test_quote_snapshots_then_accept_copies_and_deducts_stock(client, db):
    company, admin, customer, p18, _p5 = _setup(client, db)
    stock = StockItem(company_id=company.id, name="Kit", sku="KIT", unit="pcs", quantity=10, unit_price=200)
    db.add(stock)
    db.commit()
    db.refresh(stock)
    client.patch(f"/api/products/{p18['id']}", json={"stock_item_id": stock.id})
    deal = client.post("/api/deals", json={"title": "Job", "amount": "200.00", "client_id": customer.id}).json()
    quote = client.post("/api/quotes", json={
        "deal_id": deal["id"],
        "client_id": customer.id,
        "items": [{"product_id": p18["id"], "quantity": 3, "unit_price": 200, "description": "Std"}],
    })
    assert quote.status_code == 201, quote.text
    q = quote.json()
    assert q["tax"] == "108.00"
    assert q["total"] == "708.00"
    db.refresh(stock)
    assert stock.quantity == 10
    accepted = client.post(f"/api/quotes/{q['id']}/accept")
    assert accepted.status_code == 200, accepted.text
    db.refresh(stock)
    assert stock.quantity == 10
    so_id = accepted.json()["sales_order_id"]
    invoiced = client.post(f"/api/sales-orders/{so_id}/invoice")
    assert invoiced.status_code == 200, invoiced.text
    db.refresh(stock)
    assert stock.quantity == 7
    invoice = client.get(f"/api/invoices/{invoiced.json()['invoice_id']}").json()
    assert invoice["tax"] == 108.0
    assert invoice["items"][0]["product_id"] == p18["id"]
    assert invoice["items"][0]["hsn"] == "9983"


def test_invoice_omitted_unit_price_fills_from_catalog(client, db):
    _company, _admin, customer, p18, _p5 = _setup(client, db)
    created = client.post("/api/invoices", json={
        "client_id": customer.id,
        "items": [{"product_id": p18["id"], "description": "", "quantity": 2}],
    })
    assert created.status_code == 201, created.text
    detail = client.get(f"/api/invoices/{created.json()['id']}").json()
    line = detail["items"][0]
    assert float(line["total"]) == 400.0
    assert float(line["tax"]) == 72.0
    assert float(line["unit_price"]) == 200.0
