"""Territories must obey the Phase-0 gate: company B cannot PATCH/DELETE company A's
territory or add rules (404, not a 2xx). Each denial is paired with a positive control."""
import pytest

from app.models.core.team import Team
from app.utils.rate_limit import auth_limiter
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company

NO_ACCESS = (403, 404)


@pytest.fixture(autouse=True)
def _reset_auth_rate_limit():
    auth_limiter._buckets.clear()
    yield


def _team(db, company, name="Alpha"):
    team = Team(company_id=company.id, name=name)
    db.add(team)
    db.commit()
    db.refresh(team)
    return team


@pytest.fixture()
def two_companies_with_territory(client, db):
    a = create_company(db, name="A", company_code="TCA")
    b = create_company(db, name="B", company_code="TCB")
    create_active_user(db, email="admin@a.com", role="admin", company_id=a.id)
    create_active_user(db, email="admin@b.com", role="admin", company_id=b.id)
    team_a = _team(db, a)
    login_user(client, "admin@a.com")
    territory = client.post("/api/territories", json={
        "name": "A territory",
        "team_id": team_a.id,
        "rules": [{"match_field": "service_type", "match_value": "consulting"}],
    }).json()
    client.headers.pop("Authorization", None)
    return territory["id"], "admin@b.com"


def test_owner_can_patch_delete_and_add_rules(client, two_companies_with_territory):
    territory_id, _ = two_companies_with_territory
    login_user(client, "admin@a.com")
    assert client.patch(f"/api/territories/{territory_id}", json={
        "name": "A territory updated",
    }).status_code == 200
    rule = client.post(f"/api/territories/{territory_id}/rules", json={
        "match_field": "source",
        "match_value": "Referral",
    })
    assert rule.status_code == 201
    assert client.delete(f"/api/territories/{territory_id}/rules/{rule.json()['id']}").status_code == 204
    assert client.delete(f"/api/territories/{territory_id}").status_code == 204


def test_cross_tenant_patch_denied(client, two_companies_with_territory):
    territory_id, admin_b = two_companies_with_territory
    login_user(client, admin_b)
    assert client.patch(f"/api/territories/{territory_id}", json={
        "name": "Hack",
    }).status_code in NO_ACCESS


def test_cross_tenant_delete_denied(client, two_companies_with_territory):
    territory_id, admin_b = two_companies_with_territory
    login_user(client, admin_b)
    assert client.delete(f"/api/territories/{territory_id}").status_code in NO_ACCESS


def test_cross_tenant_add_rule_denied(client, two_companies_with_territory):
    territory_id, admin_b = two_companies_with_territory
    login_user(client, admin_b)
    assert client.post(f"/api/territories/{territory_id}/rules", json={
        "match_field": "source",
        "match_value": "x",
    }).status_code in NO_ACCESS
