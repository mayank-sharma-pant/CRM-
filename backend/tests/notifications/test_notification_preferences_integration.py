from app.models.core.team import Team
from app.models.core.team_membership import TeamMembership
from app.models.sales.lead import Lead
from app.models.sales.notification import Notification
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


def test_muted_tasks_category_blocks_task_assignment_notification(client, db):
    company = create_company(db, name="Pref Task Co", company_code="PTC")
    admin = create_active_user(db, email="admin@ptc.com", role="admin", company_id=company.id, full_name="Admin One")
    sales = create_active_user(db, email="sales@ptc.com", role="sales", company_id=company.id, full_name="Sales One")

    login_user(client, sales.email)
    prefs = client.put("/api/notifications/preferences", json={"muted_categories": ["tasks"]})
    assert prefs.status_code == 200, prefs.text

    login_user(client, admin.email)
    create_task = client.post(
        "/api/tasks",
        json={
            "title": "Follow up incoming RAM order",
            "priority": "high",
            "due_date": "2026-06-01",
            "assigned_to_id": sales.id,
        },
    )
    assert create_task.status_code == 201, create_task.text

    sales_notifications = db.query(Notification).filter(Notification.user_id == sales.id).all()
    assert len(sales_notifications) == 0


def test_muted_leads_category_blocks_reassign_notification(client, db):
    company = create_company(db, name="Pref Lead Co", company_code="PLC")
    manager = create_active_user(
        db, email="manager@plc.com", role="manager", company_id=company.id, full_name="Manager One"
    )
    sales_a = create_active_user(db, email="salesa@plc.com", role="sales", company_id=company.id, full_name="Sales A")
    sales_b = create_active_user(db, email="salesb@plc.com", role="sales", company_id=company.id, full_name="Sales B")

    team = Team(company_id=company.id, name="Lead Team")
    db.add(team)
    db.commit()
    db.refresh(team)
    db.add_all(
        [
            TeamMembership(company_id=company.id, team_id=team.id, user_id=manager.id),
            TeamMembership(company_id=company.id, team_id=team.id, user_id=sales_a.id),
            TeamMembership(company_id=company.id, team_id=team.id, user_id=sales_b.id),
        ]
    )
    db.commit()

    lead = Lead(
        company_id=company.id,
        name="Server Rack Expansion",
        status="New",
        team_id=team.id,
        assigned_to_id=sales_a.id,
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)

    login_user(client, sales_b.email)
    prefs = client.put("/api/notifications/preferences", json={"muted_categories": ["leads"]})
    assert prefs.status_code == 200, prefs.text

    login_user(client, manager.email)
    reassign = client.post(f"/api/manager/leads/{lead.id}/reassign?new_assignee_id={sales_b.id}")
    assert reassign.status_code == 200, reassign.text

    sales_b_notifications = db.query(Notification).filter(Notification.user_id == sales_b.id).all()
    assert len(sales_b_notifications) == 0


def test_muted_leave_category_blocks_leave_approval_notification(client, db):
    company = create_company(db, name="Pref Leave Co", company_code="PFC")
    manager = create_active_user(
        db, email="manager@pfc.com", role="manager", company_id=company.id, full_name="Manager One"
    )
    sales = create_active_user(db, email="sales@pfc.com", role="sales", company_id=company.id, full_name="Sales One")

    team = Team(company_id=company.id, name="Leave Team")
    db.add(team)
    db.commit()
    db.refresh(team)
    db.add_all(
        [
            TeamMembership(company_id=company.id, team_id=team.id, user_id=manager.id),
            TeamMembership(company_id=company.id, team_id=team.id, user_id=sales.id),
        ]
    )
    db.commit()

    login_user(client, sales.email)
    prefs = client.put("/api/notifications/preferences", json={"muted_categories": ["leave"]})
    assert prefs.status_code == 200, prefs.text

    leave_req = client.post(
        "/api/leaves",
        json={
            "from_date": "2026-06-10T00:00:00Z",
            "to_date": "2026-06-12T00:00:00Z",
            "reason": "Family event",
        },
    )
    assert leave_req.status_code == 200, leave_req.text
    leave_id = leave_req.json()["id"]

    login_user(client, manager.email)
    approve = client.post(f"/api/leaves/{leave_id}/approve", json={"status": "Approved"})
    assert approve.status_code == 200, approve.text

    sales_notifications = db.query(Notification).filter(Notification.user_id == sales.id).all()
    assert len(sales_notifications) == 0
