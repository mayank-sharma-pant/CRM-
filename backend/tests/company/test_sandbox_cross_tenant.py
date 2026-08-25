"""Sandbox cross-tenant isolation."""

import pytest

from app.services.billing.seed import seed_plans
from app.utils.rate_limit import auth_limiter
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


@pytest.fixture(autouse=True)
def _reset_and_seed(db):
    auth_limiter._buckets.clear()
    seed_plans(db)
    yield


def test_company_b_cannot_see_company_a_sandbox(client, db):
    a = create_company(db, name="A Co", company_code="XA1")
    b = create_company(db, name="B Co", company_code="XB1")
    admin_a = create_active_user(db, email="a@xa1.com", role="admin", company_id=a.id)
    admin_b = create_active_user(db, email="b@xb1.com", role="admin", company_id=b.id)

    login_user(client, admin_a.email)
    created = client.post("/api/sandbox")
    assert created.status_code == 201
    sandbox_id = created.json()["id"]

    login_user(client, admin_b.email)
    status = client.get("/api/sandbox").json()
    assert status["sandbox"] is None

    # B cannot destroy A's sandbox via DELETE (destroys B's own, which is none — 204)
    assert client.delete("/api/sandbox").status_code == 204

    login_user(client, admin_a.email)
    still = client.get("/api/sandbox").json()
    assert still["sandbox"]["id"] == sandbox_id
