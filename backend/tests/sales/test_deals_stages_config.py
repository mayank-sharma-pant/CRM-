import pytest

from app.utils.rate_limit import auth_limiter
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


@pytest.fixture(autouse=True)
def _reset_auth_rate_limit():
    auth_limiter._buckets.clear()
    yield


def _co(db, code="C1"):
    return create_company(db, name=f"Co {code}", company_code=code)


def test_list_stages_after_autoseed(client, db):
    company = _co(db)
    admin = create_active_user(db, email="admin@c1.com", role="admin", company_id=company.id)
    login_user(client, admin.email)
    client.post("/api/deals", json={"title": "seed", "amount": "1"})  # triggers seed
    stages = client.get("/api/deals/stages").json()["items"]
    assert [s["name"] for s in stages] == ["Qualification", "Proposal", "Negotiation", "Won", "Lost"]


def test_admin_can_create_stage_sales_cannot(client, db):
    company = _co(db)
    admin = create_active_user(db, email="admin@c1.com", role="admin", company_id=company.id)
    sales = create_active_user(db, email="sales@c1.com", role="sales", company_id=company.id)

    login_user(client, admin.email)
    client.post("/api/deals", json={"title": "seed", "amount": "1"})
    pipe_id = client.get("/api/deals/pipelines").json()["items"][0]["id"]
    created = client.post("/api/deals/stages", json={
        "pipeline_id": pipe_id, "name": "Discovery", "position": 2,
        "stage_type": "open", "default_probability": 25,
    })
    assert created.status_code == 201, created.text

    login_user(client, sales.email)
    denied = client.post("/api/deals/stages", json={
        "pipeline_id": pipe_id, "name": "Sneaky", "position": 9,
        "stage_type": "open", "default_probability": 0,
    })
    assert denied.status_code == 403


def test_admin_create_stage_rejects_invalid_stage_type(client, db):
    company = _co(db)
    admin = create_active_user(db, email="admin@c1.com", role="admin", company_id=company.id)
    login_user(client, admin.email)
    client.post("/api/deals", json={"title": "seed", "amount": "1"})
    pipe_id = client.get("/api/deals/pipelines").json()["items"][0]["id"]
    resp = client.post("/api/deals/stages", json={
        "pipeline_id": pipe_id, "name": "Bogus", "position": 9,
        "stage_type": "not-a-type", "default_probability": 0,
    })
    assert resp.status_code == 400


def test_admin_can_rename_stage(client, db):
    company = _co(db)
    admin = create_active_user(db, email="admin@c1.com", role="admin", company_id=company.id)
    login_user(client, admin.email)
    client.post("/api/deals", json={"title": "seed", "amount": "1"})
    stage_id = client.get("/api/deals/stages").json()["items"][0]["id"]
    resp = client.patch(f"/api/deals/stages/{stage_id}", json={"name": "Lead In"})
    assert resp.status_code == 200
    assert resp.json()["name"] == "Lead In"
