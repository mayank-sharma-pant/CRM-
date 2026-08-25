"""Territory CRUD API and lead-create assignment integration."""
import pytest

from app.models.core.team import Team
from app.models.core.team_membership import TeamMembership
from app.models.sales.lead import Lead
from app.models.sales.lead_form import LeadForm
from app.utils.rate_limit import auth_limiter, public_form_limiter
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


@pytest.fixture(autouse=True)
def _reset_limiters():
    auth_limiter._buckets.clear()
    public_form_limiter._buckets.clear()
    yield


def _team(db, company, name="Alpha"):
    team = Team(company_id=company.id, name=name)
    db.add(team)
    db.commit()
    db.refresh(team)
    return team


def _sales_on_team(db, email, company, team):
    user = create_active_user(db, email=email, role="sales", company_id=company.id, team_id=team.id)
    db.add(TeamMembership(company_id=company.id, team_id=team.id, user_id=user.id))
    db.commit()
    db.refresh(user)
    return user


def _setup_admin(client, db, code="TR1"):
    company = create_company(db, name=f"Co {code}", company_code=code)
    admin = create_active_user(db, email=f"admin@{code.lower()}.com", role="admin", company_id=company.id)
    login_user(client, admin.email)
    return company, admin


def test_territory_crud_and_rules(client, db):
    company, _admin = _setup_admin(client, db, "TRC")
    team = _team(db, company)
    other_team = _team(db, company, name="Beta")

    created = client.post("/api/territories", json={
        "name": "Consulting",
        "team_id": team.id,
        "priority": 10,
        "rules": [{"match_field": "service_type", "match_value": "consulting"}],
    })
    assert created.status_code == 201, created.text
    body = created.json()
    assert body["name"] == "Consulting"
    assert body["team_id"] == team.id
    assert body["priority"] == 10
    assert len(body["rules"]) == 1
    territory_id = body["id"]

    listed = client.get("/api/territories")
    assert listed.status_code == 200
    assert listed.json()["total"] == 1

    patched = client.patch(f"/api/territories/{territory_id}", json={
        "name": "Consulting West",
        "team_id": other_team.id,
        "priority": 5,
        "is_active": False,
    })
    assert patched.status_code == 200, patched.text
    assert patched.json()["name"] == "Consulting West"
    assert patched.json()["team_id"] == other_team.id
    assert patched.json()["is_active"] is False

    rule = client.post(f"/api/territories/{territory_id}/rules", json={
        "match_field": "source",
        "match_value": "Referral",
    })
    assert rule.status_code == 201, rule.text
    rule_id = rule.json()["id"]

    listed2 = client.get("/api/territories")
    assert len(listed2.json()["items"][0]["rules"]) == 2

    assert client.delete(f"/api/territories/{territory_id}/rules/{rule_id}").status_code == 204
    assert client.delete(f"/api/territories/{territory_id}").status_code == 204
    assert client.get("/api/territories").json()["total"] == 0


def test_sales_cannot_write_territories(client, db):
    company, _admin = _setup_admin(client, db, "TRS")
    team = _team(db, company)
    sales = create_active_user(db, email="sales@trs.com", role="sales", company_id=company.id)
    login_user(client, sales.email)

    assert client.get("/api/territories").status_code == 200
    denied = client.post("/api/territories", json={"name": "Nope", "team_id": team.id})
    assert denied.status_code == 403


def test_invalid_match_field_returns_400(client, db):
    company, _admin = _setup_admin(client, db, "TRB")
    team = _team(db, company)
    bad = client.post("/api/territories", json={
        "name": "Bad",
        "team_id": team.id,
        "rules": [{"match_field": "city", "match_value": "Mumbai"}],
    })
    assert bad.status_code == 400
    assert "match_field" in bad.json()["detail"]


def test_foreign_team_id_returns_400(client, db):
    company, _admin = _setup_admin(client, db, "TRF")
    other = create_company(db, name="Other", company_code="OTH")
    foreign_team = _team(db, other)
    resp = client.post("/api/territories", json={"name": "X", "team_id": foreign_team.id})
    assert resp.status_code == 400
    assert resp.json()["detail"] == "Team not found"


def test_cross_tenant_territory_is_404(client, db):
    company_a, _admin_a = _setup_admin(client, db, "TRA")
    team_a = _team(db, company_a)
    created = client.post("/api/territories", json={"name": "A", "team_id": team_a.id})
    territory_id = created.json()["id"]

    company_b = create_company(db, name="B Co", company_code="TRB2")
    create_active_user(db, email="admin@trb2.com", role="admin", company_id=company_b.id)
    login_user(client, "admin@trb2.com")
    assert client.patch(f"/api/territories/{territory_id}", json={"name": "Hack"}).status_code == 404
    assert client.delete(f"/api/territories/{territory_id}").status_code == 404
    assert client.post(
        f"/api/territories/{territory_id}/rules",
        json={"match_field": "source", "match_value": "x"},
    ).status_code == 404


def test_admin_lead_create_assigns_by_territory(client, db):
    company, _admin = _setup_admin(client, db, "TRL")
    team = _team(db, company)
    sales = _sales_on_team(db, "sales@trl.com", company, team)

    client.post("/api/territories", json={
        "name": "Consulting",
        "team_id": team.id,
        "rules": [{"match_field": "service_type", "match_value": "consulting"}],
    })

    lead_id = client.post("/api/leads", json={
        "name": "Prospect",
        "email": "p@trl.com",
        "service_type": "Consulting",
    }).json()["id"]

    lead = db.query(Lead).filter(Lead.id == lead_id).one()
    assert lead.team_id == team.id
    assert lead.assigned_to_id == sales.id


def test_public_form_assigns_by_territory(client, db):
    company, _admin = _setup_admin(client, db, "TRP")
    team = _team(db, company)
    sales = _sales_on_team(db, "sales@trp.com", company, team)
    other_team = _team(db, company, name="Default")
    form = LeadForm(
        company_id=company.id,
        slug="trp-form",
        name="Website",
        headline="Contact",
        is_active=True,
        default_team_id=other_team.id,
        default_source="Website",
    )
    db.add(form)
    db.commit()

    client.post("/api/territories", json={
        "name": "Waterproofing",
        "team_id": team.id,
        "rules": [{"match_field": "service_type", "match_value": "waterproofing"}],
    })

    assert client.post("/api/public/forms/trp-form/submit", json={
        "name": "Ravi",
        "phone": "999",
        "service_type": "Waterproofing",
    }).status_code == 201

    lead = db.query(Lead).filter(Lead.company_id == company.id).one()
    assert lead.team_id == team.id
    assert lead.assigned_to_id == sales.id
