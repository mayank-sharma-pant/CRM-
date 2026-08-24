"""Workflow engine v0: in-request rules on lead created / stage changed / quote accepted."""
import pytest

from app.models.core.team import Team
from app.models.core.team_membership import TeamMembership
from app.models.sales.lead import Lead
from app.models.sales.lead_form import LeadForm
from app.models.sales.notification import Notification
from app.models.sales.task import Task
from app.models.sales.workflow_rule import WorkflowRule
from app.utils.rate_limit import auth_limiter, public_form_limiter
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_client, create_company


@pytest.fixture(autouse=True)
def _reset_limiters():
    auth_limiter._buckets.clear()
    public_form_limiter._buckets.clear()
    yield


def _team(db, company, name="Field"):
    team = Team(company_id=company.id, name=name)
    db.add(team)
    db.commit()
    db.refresh(team)
    return team


def _form(db, company, team, slug="wf-form"):
    form = LeadForm(
        company_id=company.id,
        slug=slug,
        name="Website",
        headline="Get a quote",
        is_active=True,
        default_team_id=team.id,
        default_source="Website",
    )
    db.add(form)
    db.commit()
    db.refresh(form)
    return form


def _sales_on_team(db, email, company, team):
    user = create_active_user(db, email=email, role="sales", company_id=company.id, team_id=team.id)
    db.add(TeamMembership(company_id=company.id, team_id=team.id, user_id=user.id))
    db.commit()
    return user


def test_public_lead_is_round_robin_assigned_and_gets_a_task(client, db):
    company = create_company(db, name="WF Co", company_code="WFC")
    team = _team(db, company)
    _form(db, company, team)
    a = _sales_on_team(db, "a@wfc.com", company, team)
    b = _sales_on_team(db, "b@wfc.com", company, team)

    first = client.post("/api/public/forms/wf-form/submit", json={"name": "Ravi", "phone": "1"})
    assert first.status_code == 201, first.text
    second = client.post("/api/public/forms/wf-form/submit", json={"name": "Meera", "phone": "2"})
    assert second.status_code == 201, second.text

    leads = db.query(Lead).filter(Lead.company_id == company.id).order_by(Lead.id.asc()).all()
    assert {leads[0].assigned_to_id, leads[1].assigned_to_id} == {a.id, b.id}
    assert leads[0].assigned_to_id != leads[1].assigned_to_id

    tasks = db.query(Task).filter(Task.company_id == company.id).all()
    assert len(tasks) == 2
    assert {t.lead_id for t in tasks} == {leads[0].id, leads[1].id}


def test_inactive_assign_rule_leaves_lead_unassigned(client, db):
    company = create_company(db, name="Off Co", company_code="OFF")
    team = _team(db, company)
    _form(db, company, team, slug="off-form")
    _sales_on_team(db, "s@off.com", company, team)

    assert client.post("/api/public/forms/off-form/submit", json={"name": "One", "phone": "1"}).status_code == 201
    for rule in db.query(WorkflowRule).filter(WorkflowRule.company_id == company.id).all():
        if rule.action == "assign_round_robin":
            rule.is_active = False
    db.commit()

    assert client.post("/api/public/forms/off-form/submit", json={"name": "Two", "phone": "2"}).status_code == 201
    two = db.query(Lead).filter(Lead.company_id == company.id, Lead.name == "Two").one()
    assert two.assigned_to_id is None


def test_quote_accepted_notifies_admin(client, db):
    company = create_company(db, name="NQ Co", company_code="NQC")
    admin = create_active_user(db, email="admin@nqc.com", role="admin", company_id=company.id)
    customer = create_client(db, company_id=company.id, name="Client", assigned_to_id=admin.id)
    login_user(client, admin.email)
    deal = client.post("/api/deals", json={
        "title": "Job", "amount": "10.00", "client_id": customer.id,
    }).json()
    qid = client.post("/api/quotes", json={
        "deal_id": deal["id"],
        "client_id": customer.id,
        "items": [{"description": "Work", "quantity": 1, "unit_price": "10.00"}],
    }).json()["id"]

    before = db.query(Notification).filter(Notification.user_id == admin.id).count()
    accepted = client.post(f"/api/quotes/{qid}/accept")
    assert accepted.status_code == 200, accepted.text
    after = db.query(Notification).filter(Notification.user_id == admin.id).count()
    assert after > before


def test_stage_change_notifies_assignee(client, db):
    company = create_company(db, name="St Co", company_code="STC")
    team = _team(db, company)
    _form(db, company, team, slug="st-form")
    sales = _sales_on_team(db, "sa@stc.com", company, team)
    admin = create_active_user(db, email="admin@stc.com", role="admin", company_id=company.id)

    client.post("/api/public/forms/st-form/submit", json={"name": "Ravi", "phone": "1"})
    lead = db.query(Lead).filter(Lead.company_id == company.id).one()
    assert lead.assigned_to_id == sales.id

    before = db.query(Notification).filter(Notification.user_id == sales.id).count()
    login_user(client, admin.email)
    patched = client.patch(f"/api/leads/{lead.id}", json={"status": "Contacted"})
    assert patched.status_code == 200, patched.text
    after = db.query(Notification).filter(Notification.user_id == sales.id).count()
    assert after > before
