"""Quote plans + plan-driven quotation PDF."""
import pytest

from app.utils.rate_limit import auth_limiter
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_client, create_company


@pytest.fixture(autouse=True)
def _reset_auth_rate_limit():
    auth_limiter._buckets.clear()
    yield


def _setup(client, db):
    company = create_company(db, name="Quote Plan Co", company_code="QPC")
    admin = create_active_user(db, email="admin@qpc.com", role="admin", company_id=company.id)
    customer = create_client(db, company_id=company.id, name="Acme Client", assigned_to_id=admin.id)
    login_user(client, admin.email)
    return company, admin, customer


def test_quote_plan_crud_and_plan_quote_pdf(client, db):
    _company, _admin, customer = _setup(client, db)

    created_plan = client.post("/api/quote-plans", json={
        "name": "Starter GEO",
        "tagline": "ChatGPT visibility",
        "billing_interval": "monthly",
        "default_fee": "6000.00",
        "fee_inclusive": True,
        "scope_text": "Visibility audit\nMonthly summary",
    })
    assert created_plan.status_code == 201, created_plan.text
    plan = created_plan.json()
    assert plan["name"] == "Starter GEO"
    assert plan["default_fee"] == "6000.00"

    listed = client.get("/api/quote-plans?active_only=true")
    assert listed.status_code == 200
    assert listed.json()["total"] >= 1

    quote = client.post("/api/quotes", json={
        "client_id": customer.id,
        "plan_id": plan["id"],
        "project": "Starter GEO",
        "website": "acme.test",
        "fee": "6000.00",
        "fee_inclusive": True,
        "executive_summary": "Monthly GEO engagement for Acme Client.",
        "scope_text": "Visibility audit\nMonthly summary",
    })
    assert quote.status_code == 201, quote.text
    body = quote.json()
    assert body["plan_name"] == "Starter GEO"
    assert body["website"] == "acme.test"
    assert body["total"] == "6000.00"
    assert body["billing_interval"] == "monthly"

    pdf = client.get(f"/api/quotes/{body['id']}/pdf")
    assert pdf.status_code == 200
    assert pdf.headers["content-type"].startswith("application/pdf")
    assert pdf.content.startswith(b"%PDF")
    assert b"QUOTATION" in pdf.content
    assert b"Starter GEO" in pdf.content or b"Acme" in pdf.content


def test_quote_plan_is_company_scoped(client, db):
    _company, _admin, _customer = _setup(client, db)
    plan_id = client.post("/api/quote-plans", json={
        "name": "Pro",
        "default_fee": "8500",
        "billing_interval": "monthly",
    }).json()["id"]

    other = create_company(db, name="Other Q", company_code="OTQ2")
    create_active_user(db, email="admin@otq2.com", role="admin", company_id=other.id)
    login_user(client, "admin@otq2.com")
    assert client.get(f"/api/quote-plans").json()["total"] == 0
    assert client.patch(f"/api/quote-plans/{plan_id}", json={"name": "Hijack"}).status_code == 404
