"""Sandbox HTTP API."""

import pytest

from app.models.billing import Plan
from app.services.billing.seed import seed_plans
from app.utils.rate_limit import auth_limiter
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


@pytest.fixture(autouse=True)
def _reset_and_seed(db):
    auth_limiter._buckets.clear()
    seed_plans(db)
    yield
    auth_limiter._buckets.clear()


def _admin(client, db, code="SBX"):
    company = create_company(db, name=f"Co {code}", company_code=code)
    admin = create_active_user(db, email=f"admin@{code.lower()}.com", role="admin", company_id=company.id)
    login_user(client, admin.email)
    return company, admin


def test_create_and_login_sandbox_admin(client, db):
    _admin(client, db, "S01")

    res = client.post("/api/sandbox")
    assert res.status_code == 201, res.text
    body = res.json()
    assert "password" in body
    assert body["admin_email"].endswith("@sandbox.local")

    login_user(client, body["admin_email"], password=body["password"])
    me = client.get("/api/auth/me")
    assert me.status_code == 200
    assert me.json()["is_sandbox"] is True
    assert me.json()["company_id"] == body["id"]

    leads = client.get("/api/leads")
    assert leads.status_code == 200


def test_get_status_and_second_create_400(client, db):
    _admin(client, db, "S02")
    assert client.get("/api/sandbox").json()["sandbox"] is None
    assert client.post("/api/sandbox").status_code == 201
    status = client.get("/api/sandbox").json()
    assert status["is_sandbox"] is False
    assert status["sandbox"]["admin_email"].endswith("@sandbox.local")
    again = client.post("/api/sandbox")
    assert again.status_code == 400
    assert "already exists" in again.json()["detail"]


def test_sales_cannot_create(client, db):
    company = create_company(db, name="Sales Co", company_code="S03")
    sales = create_active_user(db, email="sales@s03.com", role="sales", company_id=company.id)
    login_user(client, sales.email)
    assert client.get("/api/sandbox").status_code == 200
    assert client.post("/api/sandbox").status_code == 403


def test_destroy_from_parent(client, db):
    _admin(client, db, "S04")
    created = client.post("/api/sandbox").json()
    assert client.delete("/api/sandbox").status_code == 204
    assert client.get("/api/sandbox").json()["sandbox"] is None
    # Destroyed admin cannot login
    bad = client.post(
        "/api/auth/login",
        data={"username": created["admin_email"], "password": created["password"]},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert bad.status_code in (401, 403)


def test_checkout_blocked_for_sandbox(client, db):
    _admin(client, db, "S05")
    created = client.post("/api/sandbox").json()
    login_user(client, created["admin_email"], password=created["password"])
    plan = db.query(Plan).filter(Plan.name == "Starter").first()
    assert plan is not None
    res = client.post("/api/billing/checkout", json={"plan_id": plan.id})
    assert res.status_code == 400
    assert "sandbox" in res.json()["detail"].lower()


def test_me_is_sandbox_false_for_live(client, db):
    _admin(client, db, "S06")
    me = client.get("/api/auth/me").json()
    assert me["is_sandbox"] is False
