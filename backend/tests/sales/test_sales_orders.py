"""Phase 7.9 — quote → sales order → invoice."""
import pytest

from app.models.finance.invoice import Invoice
from app.models.ops.stock_item import StockItem
from app.models.sales.sales_order import SalesOrder
from app.utils.rate_limit import auth_limiter
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_client, create_company


@pytest.fixture(autouse=True)
def _reset_auth():
    auth_limiter._buckets.clear()
    yield


def _setup(client, db):
    company = create_company(db, name="SO Co", company_code="SOC")
    admin = create_active_user(db, email="admin@soc.com", role="admin", company_id=company.id)
    customer = create_client(db, company_id=company.id, name="Buyer", assigned_to_id=admin.id)
    login_user(client, admin.email)
    deal = client.post("/api/deals", json={
        "title": "Job", "amount": "1000", "client_id": customer.id,
    }).json()
    return company, admin, customer, deal


def _quote(client, deal, customer, **extra):
    payload = {
        "deal_id": deal["id"],
        "client_id": customer.id,
        "items": [{"description": "Work", "quantity": 1, "unit_price": "1000.00"}],
        **extra,
    }
    return client.post("/api/quotes", json=payload)


def test_accept_quote_creates_sales_order_not_invoice(client, db):
    _company, _admin, customer, deal = _setup(client, db)
    q = _quote(client, deal, customer).json()
    accepted = client.post(f"/api/quotes/{q['id']}/accept")
    assert accepted.status_code == 200, accepted.text
    body = accepted.json()
    assert body["status"] == "accepted"
    assert body["sales_order_id"] is not None
    assert body["invoice_id"] is None

    so = client.get(f"/api/sales-orders/{body['sales_order_id']}")
    assert so.status_code == 200, so.text
    detail = so.json()
    assert detail["status"] == "open"
    assert detail["quote_id"] == q["id"]
    assert detail["total"] == "1180.00"
    assert detail["invoice_id"] is None


def test_convert_sales_order_to_invoice(client, db):
    _company, _admin, customer, deal = _setup(client, db)
    qid = _quote(client, deal, customer).json()["id"]
    so_id = client.post(f"/api/quotes/{qid}/accept").json()["sales_order_id"]
    converted = client.post(f"/api/sales-orders/{so_id}/invoice")
    assert converted.status_code == 200, converted.text
    out = converted.json()
    assert out["invoice_id"] is not None
    assert out["status"] == "invoiced"

    quote = client.get(f"/api/quotes/{qid}").json()
    assert quote["invoice_id"] == out["invoice_id"]

    invoice = db.query(Invoice).filter(Invoice.id == out["invoice_id"]).one()
    assert str(invoice.total) == "1180.00"


def test_convert_deducts_stock(client, db):
    company, admin, customer, deal = _setup(client, db)
    product = client.post("/api/products", json={
        "name": "Widget", "unit_price": "100", "tax_rate": 18, "hsn": "9983",
    }).json()
    stock = StockItem(company_id=company.id, name="Widget", sku="W1", unit="pcs", quantity=5, unit_price=100)
    db.add(stock)
    db.commit()
    client.patch(f"/api/products/{product['id']}", json={"stock_item_id": stock.id})

    qid = client.post("/api/quotes", json={
        "deal_id": deal["id"],
        "client_id": customer.id,
        "items": [{"product_id": product["id"], "quantity": 2, "unit_price": "100", "description": "W"}],
    }).json()["id"]
    so_id = client.post(f"/api/quotes/{qid}/accept").json()["sales_order_id"]
    db.refresh(stock)
    assert stock.quantity == 5

    client.post(f"/api/sales-orders/{so_id}/invoice")
    db.refresh(stock)
    assert stock.quantity == 3


def test_double_convert_is_400(client, db):
    _company, _admin, customer, deal = _setup(client, db)
    qid = _quote(client, deal, customer).json()["id"]
    so_id = client.post(f"/api/quotes/{qid}/accept").json()["sales_order_id"]
    assert client.post(f"/api/sales-orders/{so_id}/invoice").status_code == 200
    again = client.post(f"/api/sales-orders/{so_id}/invoice")
    assert again.status_code == 400


def test_sales_order_company_scoped(client, db):
    _company, _admin, customer, deal = _setup(client, db)
    so_id = client.post(f"/api/quotes/{_quote(client, deal, customer).json()['id']}/accept").json()["sales_order_id"]

    other = create_company(db, name="Other", company_code="OTH")
    create_active_user(db, email="admin@oth.com", role="admin", company_id=other.id)
    login_user(client, "admin@oth.com")
    assert client.get(f"/api/sales-orders/{so_id}").status_code == 404
    assert client.post(f"/api/sales-orders/{so_id}/invoice").status_code == 404
