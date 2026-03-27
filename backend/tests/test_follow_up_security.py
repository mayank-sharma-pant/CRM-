from datetime import date

from app.models import Company, User, Lead
from app.models.core.team import Team
from app.models.core.team_membership import TeamMembership
from app.models.sales.follow_up import FollowUp
from app.utils.security import get_password_hash


def login_user(client, email):
    response = client.post(
        "/api/auth/login",
        data={"username": email, "password": "pw"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert response.status_code == 200, f"Login failed for {email}: {response.text}"
    token = response.json()["access_token"]
    client.headers["Authorization"] = f"Bearer {token}"
    return response


def test_manager_cannot_create_follow_up_for_other_team_lead(client, db):
    company = Company(name="Followup Co", company_code="FUP", status="active")
    db.add(company)
    db.commit()
    db.refresh(company)

    team_a = Team(company_id=company.id, name="A")
    team_b = Team(company_id=company.id, name="B")
    db.add_all([team_a, team_b])
    db.commit()
    db.refresh(team_a)
    db.refresh(team_b)

    manager = User(
        email="manager@fup.com",
        full_name="Manager",
        hashed_password=get_password_hash("pw"),
        role="manager",
        company_id=company.id,
        is_active=True,
        status="active",
        team_id=team_a.id,
    )
    sales_b = User(
        email="salesb@fup.com",
        full_name="Sales B",
        hashed_password=get_password_hash("pw"),
        role="sales",
        company_id=company.id,
        is_active=True,
        status="active",
        team_id=team_b.id,
    )
    db.add_all([manager, sales_b])
    db.commit()
    db.refresh(manager)
    db.refresh(sales_b)

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
    response = client.post(
        "/api/follow-ups",
        json={"lead_id": lead_b.id, "scheduled_date": "2026-03-27", "scheduled_time": "10:00", "notes": "x"},
    )

    assert response.status_code == 403


def test_manager_cannot_delete_follow_up_for_other_team_lead(client, db):
    company = Company(name="Delete Co", company_code="DEL", status="active")
    db.add(company)
    db.commit()
    db.refresh(company)

    team_a = Team(company_id=company.id, name="A")
    team_b = Team(company_id=company.id, name="B")
    db.add_all([team_a, team_b])
    db.commit()
    db.refresh(team_a)
    db.refresh(team_b)

    manager = User(
        email="manager2@fup.com",
        full_name="Manager 2",
        hashed_password=get_password_hash("pw"),
        role="manager",
        company_id=company.id,
        is_active=True,
        status="active",
        team_id=team_a.id,
    )
    sales_b = User(
        email="salesb2@fup.com",
        full_name="Sales B2",
        hashed_password=get_password_hash("pw"),
        role="sales",
        company_id=company.id,
        is_active=True,
        status="active",
        team_id=team_b.id,
    )
    db.add_all([manager, sales_b])
    db.commit()
    db.refresh(manager)
    db.refresh(sales_b)

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
    company = Company(name="Date Co", company_code="DAT", status="active")
    db.add(company)
    db.commit()
    db.refresh(company)

    admin = User(
        email="admin@date.com",
        full_name="Admin",
        hashed_password=get_password_hash("pw"),
        role="admin",
        company_id=company.id,
        is_active=True,
        status="active",
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)

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
