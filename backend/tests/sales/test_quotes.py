"""Quote → invoice → payment link (Phase 2 item 4)."""
import pytest

from app.models.finance.invoice import Invoice
from app.utils.rate_limit import auth_limiter
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_client, create_company


@pytest.fixture(autouse=True)
def _reset_auth_rate_limit():
    auth_limiter._buckets.clear()
    yield


def _setup(client, db):
    company = create_company(db, name="Quote Co", company_code="QCO")
    admin = create_active_user(db, email="admin@qco.com", role="admin", company_id=company.id)
    customer = create_client(db, company_id=company.id, name="Roof Client", assigned_to_id=admin.id)
    login_user(client, admin.email)
    deal = client.post("/api/deals", json={
        "title": "Roof job", "amount": "15000.00", "client_id": customer.id,
    }).json()
    return company, admin, customer, deal


def test_create_and_accept_quote_creates_sales_order(client, db):
    _company, _admin, customer, deal = _setup(client, db)
    created = client.post("/api/quotes", json={
        "deal_id": deal["id"],
        "client_id": customer.id,
        "items": [{"description": "Roof waterproofing", "quantity": 1, "unit_price": "15000.00"}],
    })
    assert created.status_code == 201, created.text
    body = created.json()
    assert body["status"] == "draft"
    assert body["subtotal"] == "15000.00"
    assert body["tax"] == "2700.00"
    assert body["total"] == "17700.00"
    assert body["invoice_id"] is None
    assert body["sales_order_id"] is None

    accepted = client.post(f"/api/quotes/{body['id']}/accept")
    assert accepted.status_code == 200, accepted.text
    out = accepted.json()
    assert out["status"] == "accepted"
    assert out["sales_order_id"] is not None
    assert out["invoice_id"] is None

    converted = client.post(f"/api/sales-orders/{out['sales_order_id']}/invoice")
    assert converted.status_code == 200, converted.text
    invoice_id = converted.json()["invoice_id"]
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).one()
    assert invoice.client_id == customer.id
    assert str(invoice.total) == "17700.00"

    again = client.post(f"/api/quotes/{body['id']}/accept")
    assert again.status_code == 400


def test_reject_quote_blocks_accept(client, db):
    _company, _admin, customer, deal = _setup(client, db)
    qid = client.post("/api/quotes", json={
        "deal_id": deal["id"],
        "client_id": customer.id,
        "items": [{"description": "Work", "quantity": 1, "unit_price": "10.00"}],
    }).json()["id"]
    assert client.post(f"/api/quotes/{qid}/reject").status_code == 200
    assert client.post(f"/api/quotes/{qid}/accept").status_code == 400


def test_quote_is_company_scoped(client, db):
    _company, _admin, customer, deal = _setup(client, db)
    qid = client.post("/api/quotes", json={
        "deal_id": deal["id"],
        "client_id": customer.id,
        "items": [{"description": "Work", "quantity": 1, "unit_price": "10.00"}],
    }).json()["id"]

    other = create_company(db, name="Other", company_code="OTQ")
    create_active_user(db, email="admin@otq.com", role="admin", company_id=other.id)
    login_user(client, "admin@otq.com")
    assert client.get(f"/api/quotes/{qid}").status_code == 404
    assert client.post(f"/api/quotes/{qid}/accept").status_code == 404


def test_payment_link_after_accept(client, db):
    _company, _admin, customer, deal = _setup(client, db)
    qid = client.post("/api/quotes", json={
        "deal_id": deal["id"],
        "client_id": customer.id,
        "items": [{"description": "Work", "quantity": 2, "unit_price": "100.00"}],
    }).json()["id"]
    invoice_id = client.post(
        f"/api/sales-orders/{client.post(f'/api/quotes/{qid}/accept').json()['sales_order_id']}/invoice"
    ).json()["invoice_id"]
    link = client.post(f"/api/invoices/{invoice_id}/payment-link")
    assert link.status_code == 200, link.text
    url = link.json()["payment_url"]
    assert url
    db.refresh(db.query(Invoice).filter(Invoice.id == invoice_id).one())
    stored = db.query(Invoice).filter(Invoice.id == invoice_id).one()
    assert stored.payment_url == url


def test_list_quotes_by_deal(client, db):
    _company, _admin, customer, deal = _setup(client, db)
    client.post("/api/quotes", json={
        "deal_id": deal["id"],
        "client_id": customer.id,
        "items": [{"description": "A", "quantity": 1, "unit_price": "1.00"}],
    })
    listed = client.get("/api/quotes", params={"deal_id": deal["id"]})
    assert listed.status_code == 200
    assert listed.json()["total"] == 1


def test_quote_free_text_without_unit_price_rejected(client, db):
    _company, _admin, customer, deal = _setup(client, db)
    created = client.post("/api/quotes", json={
        "deal_id": deal["id"],
        "client_id": customer.id,
        "items": [{"description": "Work", "quantity": 1}],
    })
    assert created.status_code == 400
    assert created.json()["detail"] == "unit_price is required when product_id is not set"
