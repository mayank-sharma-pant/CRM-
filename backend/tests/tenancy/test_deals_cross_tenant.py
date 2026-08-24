"""Deals must obey the Phase-0 gate: company B cannot read/mutate/delete company A's
deal by id (404, not a 2xx). Each denial is paired with a positive control so a 404
proves the company scope, not a vacuous missing row."""
import pytest

from app.utils.rate_limit import auth_limiter
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company

NO_ACCESS = (403, 404)


@pytest.fixture(autouse=True)
def _reset_auth_rate_limit():
    auth_limiter._buckets.clear()
    yield


@pytest.fixture()
def two_companies_with_deal(client, db):
    a = create_company(db, name="A", company_code="COA")
    b = create_company(db, name="B", company_code="COB")
    admin_a = create_active_user(db, email="admin@a.com", role="admin", company_id=a.id)
    create_active_user(db, email="admin@b.com", role="admin", company_id=b.id)
    login_user(client, "admin@a.com")
    deal = client.post("/api/deals", json={"title": "A deal", "amount": "1000"}).json()
    # find a valid target stage in A's pipeline for the stage-move mutation case
    stages = client.get("/api/deals/stages").json()["items"]
    target_stage = stages[1]["id"]
    client.headers.pop("Authorization", None)
    return deal["id"], target_stage, "admin@b.com"


def test_owner_can_read_and_mutate_own_deal(client, two_companies_with_deal):
    deal_id, target_stage, _ = two_companies_with_deal
    login_user(client, "admin@a.com")
    assert client.get(f"/api/deals/{deal_id}").status_code == 200
    assert client.patch(f"/api/deals/{deal_id}", json={"amount": "2000"}).status_code == 200
    assert client.patch(f"/api/deals/{deal_id}/stage", json={"stage_id": target_stage}).status_code == 200


def test_cross_tenant_read_denied(client, two_companies_with_deal):
    deal_id, _, admin_b = two_companies_with_deal
    login_user(client, admin_b)
    assert client.get(f"/api/deals/{deal_id}").status_code in NO_ACCESS


def test_cross_tenant_patch_denied(client, two_companies_with_deal):
    deal_id, _, admin_b = two_companies_with_deal
    login_user(client, admin_b)
    assert client.patch(f"/api/deals/{deal_id}", json={"amount": "9"}).status_code in NO_ACCESS


def test_cross_tenant_stage_move_denied(client, two_companies_with_deal):
    deal_id, target_stage, admin_b = two_companies_with_deal
    login_user(client, admin_b)
    assert client.patch(f"/api/deals/{deal_id}/stage", json={"stage_id": target_stage}).status_code in NO_ACCESS


def test_cross_tenant_delete_denied(client, two_companies_with_deal):
    deal_id, _, admin_b = two_companies_with_deal
    login_user(client, admin_b)
    assert client.delete(f"/api/deals/{deal_id}").status_code in NO_ACCESS
