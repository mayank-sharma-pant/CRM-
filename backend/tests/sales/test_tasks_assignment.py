from app.models.core.team import Team
from app.models.core.team_membership import TeamMembership
from app.models.sales.lead import Lead
from app.models.sales.task import Task
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


def test_admin_can_assign_task_to_another_user(client, db):
    company = create_company(db, name="Assign Co", company_code="ASN")
    admin = create_active_user(
        db,
        email="admin@asn.co",
        role="admin",
        company_id=company.id,
        full_name="Assign Admin",
    )
    sales = create_active_user(
        db,
        email="sales@asn.co",
        role="sales",
        company_id=company.id,
        full_name="Assign Sales",
    )
    lead = Lead(name="Assign Lead", company_id=company.id, status="New")
    db.add(lead)
    db.commit()
    db.refresh(lead)

    login_user(client, admin.email)
    response = client.post(
        "/api/tasks",
        json={
            "title": "Assigned task",
            "priority": "medium",
            "due_date": "2026-04-20",
            "lead_id": lead.id,
            "assigned_to_id": sales.id,
        },
    )
    assert response.status_code == 201

    task_id = response.json()["id"]
    task = db.query(Task).filter(Task.id == task_id).first()
    assert task is not None
    assert task.assigned_to_id == sales.id
    assert task.assigned_by_id == admin.id


def test_sales_cannot_assign_task_to_other_user(client, db):
    company = create_company(db, name="Assign Sales Co", company_code="ASC")
    sales_1 = create_active_user(
        db,
        email="sales1@asc.co",
        role="sales",
        company_id=company.id,
        full_name="Sales One",
    )
    sales_2 = create_active_user(
        db,
        email="sales2@asc.co",
        role="sales",
        company_id=company.id,
        full_name="Sales Two",
    )
    lead = Lead(name="Sales Assign Lead", company_id=company.id, status="New")
    db.add(lead)
    db.commit()
    db.refresh(lead)

    login_user(client, sales_1.email)
    response = client.post(
        "/api/tasks",
        json={
            "title": "Not allowed assignment",
            "priority": "medium",
            "due_date": "2026-04-20",
            "lead_id": lead.id,
            "assigned_to_id": sales_2.id,
        },
    )
    assert response.status_code == 403
    assert "only assign tasks to themselves" in response.json()["detail"].lower()


def test_manager_can_assign_only_within_own_team(client, db):
    company = create_company(db, name="Assign Manager Co", company_code="AMC")
    manager = create_active_user(
        db,
        email="manager@amc.co",
        role="manager",
        company_id=company.id,
        full_name="Assign Manager",
    )
    sales_a = create_active_user(
        db,
        email="salesa@amc.co",
        role="sales",
        company_id=company.id,
        full_name="Sales A",
    )
    sales_b = create_active_user(
        db,
        email="salesb@amc.co",
        role="sales",
        company_id=company.id,
        full_name="Sales B",
    )

    team_a = Team(company_id=company.id, name="Team A")
    team_b = Team(company_id=company.id, name="Team B")
    db.add_all([team_a, team_b])
    db.commit()
    db.refresh(team_a)
    db.refresh(team_b)

    db.add_all(
        [
            TeamMembership(company_id=company.id, team_id=team_a.id, user_id=manager.id),
            TeamMembership(company_id=company.id, team_id=team_a.id, user_id=sales_a.id),
            TeamMembership(company_id=company.id, team_id=team_b.id, user_id=sales_b.id),
        ]
    )
    lead = Lead(name="Manager Assign Lead", company_id=company.id, status="New")
    db.add(lead)
    db.commit()
    db.refresh(lead)

    login_user(client, manager.email)

    allowed = client.post(
        "/api/tasks",
        json={
            "title": "Team A task",
            "priority": "high",
            "due_date": "2026-04-20",
            "lead_id": lead.id,
            "assigned_to_id": sales_a.id,
        },
    )
    assert allowed.status_code == 201

    denied = client.post(
        "/api/tasks",
        json={
            "title": "Team B task",
            "priority": "high",
            "due_date": "2026-04-20",
            "lead_id": lead.id,
            "assigned_to_id": sales_b.id,
        },
    )
    assert denied.status_code == 403
    assert "within their team" in denied.json()["detail"].lower()
