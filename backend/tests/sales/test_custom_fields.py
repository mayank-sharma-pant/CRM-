"""Company-scoped custom fields on lead, deal, and client."""
import pytest

from app.utils.rate_limit import auth_limiter
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


@pytest.fixture(autouse=True)
def _reset_auth():
    auth_limiter._buckets.clear()
    yield


def _company_admin(client, db, code="CF1"):
    company = create_company(db, name=f"Co {code}", company_code=code)
    admin = create_active_user(db, email=f"admin@{code.lower()}.com", role="admin", company_id=company.id)
    login_user(client, admin.email)
    return company, admin


def test_admin_defines_field_sales_cannot(client, db):
    company, _admin = _company_admin(client, db, "CFA")
    created = client.post("/api/custom-fields", json={
        "entity_type": "lead",
        "name": "Site type",
        "field_key": "site_type",
        "field_type": "picklist",
        "options": ["Roof", "Bathroom"],
    })
    assert created.status_code == 201, created.text
    body = created.json()
    assert body["field_key"] == "site_type"
    assert body["options"] == ["Roof", "Bathroom"]

    listed = client.get("/api/custom-fields", params={"entity_type": "lead"})
    assert listed.status_code == 200
    assert listed.json()["total"] == 1

    create_active_user(db, email="sa@cfa.com", role="sales", company_id=company.id)
    login_user(client, "sa@cfa.com")
    denied = client.post("/api/custom-fields", json={
        "entity_type": "lead", "name": "Nope", "field_key": "nope", "field_type": "text",
    })
    assert denied.status_code == 403


def test_lead_custom_value_roundtrip_and_picklist_validation(client, db):
    company, admin = _company_admin(client, db, "CFB")
    client.post("/api/custom-fields", json={
        "entity_type": "lead",
        "name": "Site type",
        "field_key": "site_type",
        "field_type": "picklist",
        "options": ["Roof", "Bathroom"],
    })
    lead_id = client.post("/api/leads", json={"name": "Ravi"}).json()["id"]

    bad = client.patch(f"/api/leads/{lead_id}", json={"custom_fields": {"site_type": "Kitchen"}})
    assert bad.status_code == 400

    ok = client.patch(f"/api/leads/{lead_id}", json={"custom_fields": {"site_type": "Roof"}})
    assert ok.status_code == 200, ok.text

    got = client.get(f"/api/leads/{lead_id}")
    assert got.status_code == 200
    assert got.json()["custom_fields"]["site_type"] == "Roof"

    other = create_company(db, name="Other", company_code="CFO")
    create_active_user(db, email="admin@cfo.com", role="admin", company_id=other.id)
    login_user(client, "admin@cfo.com")
    hidden = client.get(f"/api/leads/{lead_id}")
    assert hidden.status_code in (403, 404)
    defs = client.get("/api/custom-fields", params={"entity_type": "lead"})
    assert defs.json()["total"] == 0


def test_deal_custom_number_field(client, db):
    _company, admin = _company_admin(client, db, "CFD")
    client.post("/api/custom-fields", json={
        "entity_type": "deal",
        "name": "Sq ft",
        "field_key": "sq_ft",
        "field_type": "number",
    })
    deal_id = client.post("/api/deals", json={
        "title": "Job", "amount": "100.00", "client_id": None,
    }).json()["id"]
    bad = client.patch(f"/api/deals/{deal_id}", json={"custom_fields": {"sq_ft": "wide"}})
    assert bad.status_code == 400
    ok = client.patch(f"/api/deals/{deal_id}", json={"custom_fields": {"sq_ft": "1200"}})
    assert ok.status_code == 200, ok.text
    got = client.get(f"/api/deals/{deal_id}")
    assert got.json()["custom_fields"]["sq_ft"] == "1200"
