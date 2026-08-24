"""Public lead form: no JWT, company-scoped capture, honeypot, rate limit."""
from datetime import datetime, timedelta, timezone

import pytest

from app.models.core.enums import CompanyStatus
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


def _seed_form(db, company, team=None, slug="slug-a", is_active=True):
    form = LeadForm(
        company_id=company.id,
        slug=slug,
        name="Website",
        headline="Get a quote",
        is_active=is_active,
        default_team_id=team.id if team else None,
        default_source="Website",
    )
    db.add(form)
    db.commit()
    db.refresh(form)
    return form


def test_submit_creates_unassigned_website_lead(client, db):
    company = create_company(db, name="Acme", company_code="ACM")
    team = Team(company_id=company.id, name="Alpha")
    db.add(team)
    db.commit()
    db.refresh(team)
    _seed_form(db, company, team)

    resp = client.post("/api/public/forms/slug-a/submit", json={
        "name": "Ravi", "phone": "9876543210", "email": "ravi@x.com",
        "company": "Ravi Homes", "service_type": "Waterproofing", "notes": "leak",
        "website": "",
    })
    assert resp.status_code == 201, resp.text
    assert resp.json() == {"ok": True}

    lead = db.query(Lead).filter(Lead.company_id == company.id).one()
    assert lead.name == "Ravi"
    assert lead.source == "Website"
    assert lead.assigned_to_id is None
    assert lead.created_by_id is None
    assert lead.team_id == team.id
    assert lead.phone == "9876543210"


def test_other_company_cannot_get_submitted_lead(client, db):
    a = create_company(db, name="A", company_code="AAA")
    b = create_company(db, name="B", company_code="BBB")
    _seed_form(db, a, slug="slug-a")
    create_active_user(db, email="admin@b.com", role="admin", company_id=b.id)

    client.post("/api/public/forms/slug-a/submit", json={"name": "Ravi", "phone": "1"})
    lead = db.query(Lead).filter(Lead.company_id == a.id).one()

    login_user(client, "admin@b.com")
    denied = client.get(f"/api/leads/{lead.id}")
    assert denied.status_code in (403, 404), denied.text


def test_unknown_slug_is_404(client, db):
    resp = client.get("/api/public/forms/no-such")
    assert resp.status_code == 404
    resp = client.post("/api/public/forms/no-such/submit", json={"name": "X", "phone": "1"})
    assert resp.status_code == 404


def test_inactive_form_is_404(client, db):
    company = create_company(db, name="Acme", company_code="INA")
    _seed_form(db, company, slug="dead", is_active=False)
    assert client.get("/api/public/forms/dead").status_code == 404
    assert client.post("/api/public/forms/dead/submit", json={"name": "X", "phone": "1"}).status_code == 404


def test_honeypot_returns_201_without_insert(client, db):
    company = create_company(db, name="Acme", company_code="HNY")
    _seed_form(db, company, slug="hny")
    resp = client.post("/api/public/forms/hny/submit", json={
        "name": "Bot", "phone": "1", "website": "http://spam",
    })
    assert resp.status_code == 201
    assert resp.json() == {"ok": True}
    assert db.query(Lead).filter(Lead.company_id == company.id).count() == 0


def test_submit_requires_name_and_contact(client, db):
    company = create_company(db, name="Acme", company_code="VAL")
    _seed_form(db, company, slug="val")
    assert client.post("/api/public/forms/val/submit", json={"phone": "1"}).status_code == 400
    assert client.post("/api/public/forms/val/submit", json={"name": "Ravi"}).status_code == 400


def test_eleventh_submit_is_429(client, db):
    company = create_company(db, name="Acme", company_code="RLM")
    _seed_form(db, company, slug="rlm")
    payload = {"name": "Ravi", "phone": "1"}
    for _ in range(10):
        assert client.post("/api/public/forms/rlm/submit", json=payload).status_code == 201
    assert client.post("/api/public/forms/rlm/submit", json=payload).status_code == 429


def test_auth_get_lead_form_is_company_scoped(client, db):
    a = create_company(db, name="A", company_code="GAA")
    b = create_company(db, name="B", company_code="GBB")
    _seed_form(db, a, slug="only-a")
    _seed_form(db, b, slug="only-b")
    create_active_user(db, email="admin@a.com", role="admin", company_id=a.id)
    login_user(client, "admin@a.com")
    resp = client.get("/api/lead-forms")
    assert resp.status_code == 200, resp.text
    assert resp.json()["slug"] == "only-a"
    assert resp.json()["public_path"] == "/f/only-a"


def test_sales_list_includes_form_lead_only_on_form_team(client, db):
    company = create_company(db, name="Co", company_code="SCP")
    team_a = Team(company_id=company.id, name="Alpha")
    team_b = Team(company_id=company.id, name="Beta")
    db.add_all([team_a, team_b])
    db.commit()
    db.refresh(team_a)
    db.refresh(team_b)
    _seed_form(db, company, team_a, slug="scp")

    sales_a = create_active_user(
        db, email="sa@scp.com", role="sales", company_id=company.id, team_id=team_a.id,
    )
    sales_b = create_active_user(
        db, email="sb@scp.com", role="sales", company_id=company.id, team_id=team_b.id,
    )
    db.add_all([
        TeamMembership(company_id=company.id, team_id=team_a.id, user_id=sales_a.id),
        TeamMembership(company_id=company.id, team_id=team_b.id, user_id=sales_b.id),
    ])
    db.commit()

    client.post("/api/public/forms/scp/submit", json={"name": "FromWeb", "phone": "1"})

    login_user(client, sales_a.email)
    client.headers["X-Team-Id"] = str(team_a.id)
    names_a = {row["name"] for row in client.get("/api/leads").json()["items"]}
    assert "FromWeb" in names_a

    login_user(client, sales_b.email)
    client.headers["X-Team-Id"] = str(team_b.id)
    names_b = {row["name"] for row in client.get("/api/leads").json()["items"]}
    assert "FromWeb" not in names_b


def test_suspended_company_form_is_404(client, db):
    company = create_company(db, name="Dead", company_code="DED", status=CompanyStatus.SUSPENDED.value)
    _seed_form(db, company, slug="ded")
    assert client.get("/api/public/forms/ded").status_code == 404


def test_expired_trial_form_is_404(client, db):
    company = create_company(db, name="Trial", company_code="TRL", status=CompanyStatus.TRIAL.value)
    company.trial_ends_at = datetime.now(timezone.utc) - timedelta(days=1)
    db.commit()
    _seed_form(db, company, slug="trl")
    assert client.get("/api/public/forms/trl").status_code == 404


def test_sales_cannot_patch_lead_form(client, db):
    company = create_company(db, name="Co", company_code="PTC")
    _seed_form(db, company, slug="ptc")
    create_active_user(db, email="s@ptc.com", role="sales", company_id=company.id)
    login_user(client, "s@ptc.com")
    resp = client.patch("/api/lead-forms", json={"headline": "nope"})
    assert resp.status_code == 403
