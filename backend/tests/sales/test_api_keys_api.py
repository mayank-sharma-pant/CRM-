from datetime import date, timedelta

import pytest

from app.models.billing import Plan, Subscription
from app.models.core.api_key import ApiUsageDaily
from app.services.billing.seed import seed_plans, backfill_api_quotas
from app.utils.rate_limit import auth_limiter
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company, create_client


@pytest.fixture(autouse=True)
def _reset_auth_rate_limit():
    auth_limiter._buckets.clear()
    yield


def _company_with_admin(db, code="K1"):
    company = create_company(db, name=f"Co {code}", company_code=code)
    admin = create_active_user(db, email=f"admin@{code}.com", role="admin", company_id=company.id)
    return company, admin


def _mint(client, name="CI", access="write"):
    resp = client.post("/api/api-keys", json={"name": name, "access": access})
    assert resp.status_code == 201, resp.text
    return resp.json()


def _bearer(client, token):
    client.headers["Authorization"] = f"Bearer {token}"


def test_mint_shows_token_once_list_hides_secret(client, db):
    _, admin = _company_with_admin(db)
    login_user(client, admin.email)
    body = _mint(client, name="Zapier", access="read")
    assert body["token"].startswith("crm_live_")
    assert len(body["token"]) == len("crm_live_") + 64
    assert body["prefix"] == body["token"][: len("crm_live_") + 8]
    assert body["access"] == "read"
    listed = client.get("/api/api-keys")
    assert listed.status_code == 200
    items = listed.json()["items"]
    assert len(items) == 1
    assert items[0]["prefix"] == body["prefix"]
    assert "token" not in items[0]
    assert "token_hash" not in items[0]


def test_sales_cannot_mint_md_can(client, db):
    company, admin = _company_with_admin(db)
    create_active_user(db, email="sales@k1.com", role="sales", company_id=company.id)
    create_active_user(db, email="md@k1.com", role="md", company_id=company.id)
    login_user(client, "sales@k1.com")
    assert client.post("/api/api-keys", json={"name": "nope", "access": "read"}).status_code == 403
    client.headers.pop("Authorization", None)
    login_user(client, "md@k1.com")
    assert client.post("/api/api-keys", json={"name": "ok", "access": "read"}).status_code == 201


def test_empty_name_and_eleventh_live_key_rejected(client, db):
    _, admin = _company_with_admin(db)
    login_user(client, admin.email)
    assert client.post("/api/api-keys", json={"name": "  ", "access": "read"}).status_code == 400
    for i in range(10):
        assert _mint(client, name=f"k{i}", access="read")
    eleventh = client.post("/api/api-keys", json={"name": "k10", "access": "read"})
    assert eleventh.status_code == 400


def test_revoke_then_key_is_401(client, db):
    _, admin = _company_with_admin(db)
    login_user(client, admin.email)
    minted = _mint(client)
    kid, token = minted["id"], minted["token"]
    assert client.delete(f"/api/api-keys/{kid}").status_code == 204
    assert client.delete(f"/api/api-keys/{kid}").status_code == 404
    listed = client.get("/api/api-keys").json()["items"]
    assert listed == []
    _bearer(client, token)
    assert client.get("/api/v1/leads").status_code == 401


def test_jwt_ignored_on_v1_and_read_cannot_write(client, db):
    _, admin = _company_with_admin(db)
    login_user(client, admin.email)
    assert client.get("/api/v1/leads").status_code == 401
    read = _mint(client, name="reader", access="read")
    write = _mint(client, name="writer", access="write")
    _bearer(client, read["token"])
    listed = client.get("/api/v1/leads")
    assert listed.status_code == 200
    assert listed.json()["items"] == []
    assert client.post("/api/v1/leads", json={"name": "Nope"}).status_code == 403
    _bearer(client, write["token"])
    created = client.post("/api/v1/leads", json={"name": "Ada", "email": "ada@x.com"})
    assert created.status_code == 201, created.text
    assert created.json()["name"] == "Ada"
    assert created.json()["assigned_to_id"] is None
    lead_id = created.json()["id"]
    patched = client.patch(f"/api/v1/leads/{lead_id}", json={"status": "Contacted"})
    assert patched.status_code == 200
    assert patched.json()["status"] == "Contacted"


def test_public_client_deal_invoice_and_foreign_fk(client, db):
    company, admin = _company_with_admin(db, code="K2")
    other = create_company(db, name="Other", company_code="K2O")
    foreign_client = create_client(db, company_id=other.id, name="Foreign")
    login_user(client, admin.email)
    token = _mint(client)["token"]
    _bearer(client, token)

    client_resp = client.post("/api/v1/clients", json={"name": "Acme", "email": "a@acme.com"})
    assert client_resp.status_code == 201, client_resp.text
    cid = client_resp.json()["id"]
    got = client.get(f"/api/v1/clients/{cid}")
    assert got.status_code == 200
    assert got.json()["name"] == "Acme"

    deal = client.post("/api/v1/deals", json={"title": "Roof", "amount": "1500"})
    assert deal.status_code == 201, deal.text
    did = deal.json()["id"]
    assert deal.json()["pipeline_id"] is not None
    patched = client.patch(f"/api/v1/deals/{did}", json={"amount": "2000"})
    assert patched.status_code == 200

    inv = client.post("/api/v1/invoices", json={
        "client_id": cid,
        "items": [{"description": "Job", "quantity": 1, "unit_price": 100}],
    })
    assert inv.status_code == 201, inv.text
    iid = inv.json()["id"]
    fetched = client.get(f"/api/v1/invoices/{iid}")
    assert fetched.status_code == 200
    assert len(fetched.json()["items"]) == 1
    assert client.patch(f"/api/v1/invoices/{iid}", json={"notes": "x"}).status_code == 405

    bad = client.post("/api/v1/invoices", json={
        "client_id": foreign_client.id,
        "items": [{"description": "Nope", "quantity": 1, "unit_price": 1}],
    })
    assert bad.status_code == 400


def test_quota_429_then_next_utc_day_allowed(client, db):
    company, admin = _company_with_admin(db, code="KQ")
    seed_plans(db)
    backfill_api_quotas(db)
    plan = db.query(Plan).filter(Plan.name == "Starter").one()
    plan.max_api_requests_per_day = 1
    db.add(Subscription(company_id=company.id, plan_id=plan.id, status="active"))
    db.commit()
    login_user(client, admin.email)
    token = _mint(client)["token"]
    _bearer(client, token)
    first = client.get("/api/v1/leads")
    assert first.status_code == 200, first.text
    second = client.get("/api/v1/leads")
    assert second.status_code == 429
    assert "Retry-After" in second.headers
    yesterday = date.today() - timedelta(days=1)
    row = db.query(ApiUsageDaily).filter(ApiUsageDaily.company_id == company.id).one()
    row.usage_date = yesterday
    db.commit()
    third = client.get("/api/v1/leads")
    assert third.status_code == 200, third.text
