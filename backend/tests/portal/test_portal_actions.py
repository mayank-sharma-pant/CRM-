"""Public portal: accept/reject quote and pay invoice via share token."""
import pytest

from app.models.core.enums import InvoiceStatus, QuoteStatus
from app.models.finance.invoice import Invoice
from app.models.sales.quote import Quote
from app.utils.rate_limit import auth_limiter, portal_limiter
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_client, create_company


@pytest.fixture(autouse=True)
def _reset():
    auth_limiter._buckets.clear()
    portal_limiter._buckets.clear()
    yield


def _clear_auth(client):
    client.cookies.clear()
    client.headers.pop("Authorization", None)


def _quote_token(client, db):
    company = create_company(db, name="Portal Pay", company_code="PPQ")
    admin = create_active_user(db, email="admin@ppq.com", role="admin", company_id=company.id)
    buyer = create_client(db, company_id=company.id, name="Buyer", assigned_to_id=admin.id)
    login_user(client, admin.email)
    deal = client.post("/api/deals", json={"title": "Job", "amount": "100", "client_id": buyer.id}).json()
    q = client.post("/api/quotes", json={
        "deal_id": deal["id"],
        "client_id": buyer.id,
        "items": [{"description": "Line", "quantity": 1, "unit_price": "50.00"}],
    })
    assert q.status_code == 201, q.text
    qid = q.json()["id"]
    token = client.post(f"/api/quotes/{qid}/share").json()["token"]
    return company, admin, qid, token


def test_portal_accept_quote_creates_sales_order(client, db):
    _company, _admin, qid, token = _quote_token(client, db)
    _clear_auth(client)
    got = client.get(f"/api/portal/quotes/{token}")
    assert got.status_code == 200
    assert got.json()["can_accept"] is True
    acc = client.post(f"/api/portal/quotes/{token}/accept")
    assert acc.status_code == 200, acc.text
    assert acc.json()["status"] == "accepted"
    assert acc.json()["can_accept"] is False
    row = db.query(Quote).filter(Quote.id == qid).one()
    assert row.status == QuoteStatus.ACCEPTED
    assert row.sales_order_id is not None
    assert row.invoice_id is None
    again = client.post(f"/api/portal/quotes/{token}/accept")
    assert again.status_code == 400


def test_portal_reject_quote(client, db):
    _company, _admin, qid, token = _quote_token(client, db)
    _clear_auth(client)
    res = client.post(f"/api/portal/quotes/{token}/reject")
    assert res.status_code == 200
    assert res.json()["status"] == "rejected"
    assert client.post(f"/api/portal/quotes/{token}/accept").status_code == 400


def test_portal_quote_unknown_token_404(client, db):
    _quote_token(client, db)
    _clear_auth(client)
    assert client.post("/api/portal/quotes/not-real/accept").status_code == 404


def test_portal_pay_invoice_stub_and_complete(client, db):
    company = create_company(db, name="Pay Co", company_code="PPI")
    admin = create_active_user(db, email="admin@ppi.com", role="admin", company_id=company.id)
    buyer = create_client(db, company_id=company.id, name="Buyer", assigned_to_id=admin.id)
    login_user(client, admin.email)
    inv = client.post("/api/invoices", json={
        "client_id": buyer.id,
        "items": [{"description": "Job", "quantity": 1, "unit_price": 200}],
    }).json()
    iid = inv["id"]
    token = client.post(f"/api/invoices/{iid}/share").json()["token"]
    _clear_auth(client)
    public = client.get(f"/api/portal/invoices/{token}")
    assert public.status_code == 200
    assert public.json()["payable"] is True
    pay = client.post(f"/api/portal/invoices/{token}/pay")
    assert pay.status_code == 200, pay.text
    url = pay.json()["payment_url"]
    assert url.startswith("/p/pay/")
    pay_token = url.rsplit("/", 1)[-1]
    done = client.post(f"/api/portal/pay-stub/{pay_token}")
    assert done.status_code == 200, done.text
    db.expire_all()
    row = db.query(Invoice).filter(Invoice.id == iid).one()
    assert row.status == InvoiceStatus.PAID
    assert client.get(f"/api/portal/invoices/{token}").json()["payable"] is False


def test_portal_pay_unknown_404(client, db):
    _quote_token(client, db)
    _clear_auth(client)
    assert client.post("/api/portal/invoices/nope/pay").status_code == 404
