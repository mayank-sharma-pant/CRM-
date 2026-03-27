from datetime import date, timedelta

from app.models import Lead
from app.models.core.team import Team
from app.models.core.team_membership import TeamMembership
from app.models.sales.follow_up import FollowUp
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


def test_manager_cannot_create_follow_up_for_other_team_lead(client, db):
    company = create_company(db, name="Followup Co", company_code="FUP")

    team_a = Team(company_id=company.id, name="A")
    team_b = Team(company_id=company.id, name="B")
    db.add_all([team_a, team_b])
    db.commit()
    db.refresh(team_a)
    db.refresh(team_b)

    manager = create_active_user(
        db,
        email="manager@fup.com",
        role="manager",
        company_id=company.id,
        full_name="Manager",
        team_id=team_a.id,
    )
    sales_b = create_active_user(
        db,
        email="salesb@fup.com",
        role="sales",
        company_id=company.id,
        full_name="Sales B",
        team_id=team_b.id,
    )

    db.add_all(
        [
            TeamMembership(company_id=company.id, team_id=team_a.id, user_id=manager.id),
            TeamMembership(company_id=company.id, team_id=team_b.id, user_id=sales_b.id),
        ]
    )
    db.commit()

    lead_b = Lead(
        company_id=company.id,
        name="Team B Lead",
        status="New",
        team_id=team_b.id,
        assigned_to_id=sales_b.id,
    )
    db.add(lead_b)
    db.commit()
    db.refresh(lead_b)

    login_user(client, manager.email)
    scheduled_date = (date.today() + timedelta(days=1)).isoformat()
    response = client.post(
        "/api/follow-ups",
        json={
            "lead_id": lead_b.id,
            "scheduled_date": scheduled_date,
            "scheduled_time": "10:00",
            "notes": "x",
        },
    )
    assert response.status_code == 403


def test_manager_cannot_delete_follow_up_for_other_team_lead(client, db):
    company = create_company(db, name="Delete Co", company_code="DEL")

    team_a = Team(company_id=company.id, name="A")
    team_b = Team(company_id=company.id, name="B")
    db.add_all([team_a, team_b])
    db.commit()
    db.refresh(team_a)
    db.refresh(team_b)

    manager = create_active_user(
        db,
        email="manager2@fup.com",
        role="manager",
        company_id=company.id,
        full_name="Manager 2",
        team_id=team_a.id,
    )
    sales_b = create_active_user(
        db,
        email="salesb2@fup.com",
        role="sales",
        company_id=company.id,
        full_name="Sales B2",
        team_id=team_b.id,
    )

    db.add_all(
        [
            TeamMembership(company_id=company.id, team_id=team_a.id, user_id=manager.id),
            TeamMembership(company_id=company.id, team_id=team_b.id, user_id=sales_b.id),
        ]
    )
    db.commit()

    lead_b = Lead(
        company_id=company.id,
        name="Team B Lead",
        status="New",
        team_id=team_b.id,
        assigned_to_id=sales_b.id,
    )
    db.add(lead_b)
    db.flush()

    follow_up = FollowUp(
        company_id=company.id,
        lead_id=lead_b.id,
        scheduled_date=date.today(),
        status="Pending",
    )
    db.add(follow_up)
    db.commit()
    db.refresh(follow_up)

    login_user(client, manager.email)
    response = client.delete(f"/api/follow-ups/{follow_up.id}")
    assert response.status_code == 403


def test_follow_up_create_invalid_date_returns_400(client, db):
    company = create_company(db, name="Date Co", company_code="DAT")
    admin = create_active_user(
        db,
        email="admin@date.com",
        role="admin",
        company_id=company.id,
        full_name="Admin",
    )

    lead = Lead(company_id=company.id, name="Lead", status="New")
    db.add(lead)
    db.commit()
    db.refresh(lead)

    login_user(client, admin.email)
    response = client.post(
        "/api/follow-ups",
        json={"lead_id": lead.id, "scheduled_date": "27-03-2026", "scheduled_time": "10:00", "notes": "x"},
    )
    assert response.status_code == 400
    assert "Invalid scheduled_date format" in response.json()["detail"]
