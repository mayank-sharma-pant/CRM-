"""Default cadence: public form enrolls day-1 SMS, day-3 call, day-7 email."""
from datetime import datetime, timedelta, timezone

import pytest

from app.models.core.team import Team
from app.models.core.team_membership import TeamMembership
from app.models.sales.follow_up import FollowUp
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


def _seed_form(db, company, team=None, slug="cad-form"):
    form = LeadForm(
        company_id=company.id,
        slug=slug,
        name="Website",
        headline="Get a quote",
        is_active=True,
        default_team_id=team.id if team else None,
        default_source="Website",
    )
    db.add(form)
    db.commit()
    db.refresh(form)
    return form


def test_public_submit_creates_three_cadence_follow_ups(client, db):
    company = create_company(db, name="Cadence Co", company_code="CAD")
    team = Team(company_id=company.id, name="Field")
    db.add(team)
    db.commit()
    db.refresh(team)
    _seed_form(db, company, team)

    resp = client.post("/api/public/forms/cad-form/submit", json={
        "name": "Ravi", "phone": "999", "website": "",
    })
    assert resp.status_code == 201, resp.text

    lead = db.query(Lead).filter(Lead.company_id == company.id).one()
    rows = (
        db.query(FollowUp)
        .filter(FollowUp.lead_id == lead.id)
        .order_by(FollowUp.scheduled_date.asc())
        .all()
    )
    assert [r.channel for r in rows] == ["sms", "call", "email"]
    today = datetime.now(timezone.utc).date()
    assert [r.scheduled_date for r in rows] == [
        today + timedelta(days=1),
        today + timedelta(days=3),
        today + timedelta(days=7),
    ]
    assert all(r.status == "Pending" for r in rows)
    assert all(r.company_id == company.id for r in rows)


def test_honeypot_does_not_enroll_cadence(client, db):
    company = create_company(db, name="Bot Co", company_code="BOT")
    _seed_form(db, company, slug="bot-form")
    resp = client.post("/api/public/forms/bot-form/submit", json={
        "name": "Spam", "phone": "1", "website": "http://spam",
    })
    assert resp.status_code == 201
    assert db.query(FollowUp).filter(FollowUp.company_id == company.id).count() == 0


def test_sales_on_form_team_sees_unassigned_cadence(client, db):
    company = create_company(db, name="See Co", company_code="SEE")
    team = Team(company_id=company.id, name="Alpha")
    db.add(team)
    db.commit()
    db.refresh(team)
    _seed_form(db, company, team, slug="see-form")

    sales = create_active_user(
        db, email="sa@see.com", role="sales", company_id=company.id, team_id=team.id,
    )
    db.add(TeamMembership(company_id=company.id, team_id=team.id, user_id=sales.id))
    db.commit()

    client.post("/api/public/forms/see-form/submit", json={"name": "FromWeb", "phone": "1"})

    login_user(client, sales.email)
    client.headers["X-Team-Id"] = str(team.id)
    listed = client.get("/api/follow-ups")
    assert listed.status_code == 200, listed.text
    names = {row["lead_name"] for row in listed.json()["items"]}
    assert any("FromWeb" in n for n in names)
    assert listed.json()["total"] == 3
    channels = {row["channel"] for row in listed.json()["items"]}
    assert channels == {"sms", "call", "email"}
