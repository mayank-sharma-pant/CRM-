from datetime import datetime, timedelta, timezone

from app.models.core.team import Team
from app.models.core.team_membership import TeamMembership
from app.models.sales.lead import Lead
from app.models.sales.notification import Notification
from app.models.sales.task import Task
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


def test_task_create_notifies_assignee(client, db):
    company = create_company(db, name="Task Notif Co", company_code="TNF")
    admin = create_active_user(db, email="admin@tnf.com", role="admin", company_id=company.id, full_name="Admin One")
    sales = create_active_user(db, email="sales@tnf.com", role="sales", company_id=company.id, full_name="Sales One")

    login_user(client, admin.email)
    response = client.post(
        "/api/tasks",
        json={
            "title": "Follow up with RAM vendor",
            "priority": "high",
            "due_date": "2026-05-01",
            "assigned_to_id": sales.id,
        },
    )
    assert response.status_code == 201, response.text

    notifications = db.query(Notification).filter(Notification.user_id == sales.id).all()
    assert len(notifications) == 1
    assert notifications[0].title.startswith("New Task Assigned:")
    assert notifications[0].type == "info"
    assert notifications[0].link == "/sales/tasks"


def test_task_complete_notifies_assigner(client, db):
    company = create_company(db, name="Task Complete Co", company_code="TCF")
    manager = create_active_user(
        db, email="manager@tcf.com", role="manager", company_id=company.id, full_name="Manager One"
    )
    sales = create_active_user(db, email="sales@tcf.com", role="sales", company_id=company.id, full_name="Sales One")

    task = Task(
        company_id=company.id,
        title="Close warm lead",
        status="Pending",
        priority="Medium",
        assigned_to_id=sales.id,
        assigned_by_id=manager.id,
        due_date=datetime(2026, 5, 3, tzinfo=timezone.utc),
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    login_user(client, sales.email)
    complete = client.post(f"/api/tasks/{task.id}/complete")
    assert complete.status_code == 200, complete.text

    notifications = db.query(Notification).filter(Notification.user_id == manager.id).all()
    assert len(notifications) == 1
    assert notifications[0].title.startswith("Task Completed:")
    assert notifications[0].type == "success"
    assert notifications[0].link == "/manager/tasks"


def test_manager_task_create_notifies_sales_assignee(client, db):
    company = create_company(db, name="Manager Task Co", company_code="MTC")
    manager = create_active_user(
        db, email="manager@mtc.com", role="manager", company_id=company.id, full_name="Manager One"
    )
    sales = create_active_user(db, email="sales@mtc.com", role="sales", company_id=company.id, full_name="Sales One")
    team = Team(company_id=company.id, name="Alpha Team")
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

    # Future date relative to now — the manager endpoint rejects past due dates,
    # so a hardcoded date would time-bomb the test once that date passes.
    due_date = (datetime.now(timezone.utc).date() + timedelta(days=30)).isoformat()
    login_user(client, manager.email)
    response = client.post(
        f"/api/manager/tasks?title=Prepare quotation&assignee_id={sales.id}&due_date={due_date}&priority=medium"
    )
    assert response.status_code == 200, response.text

    notifications = db.query(Notification).filter(Notification.user_id == sales.id).all()
    assert len(notifications) == 1
    assert notifications[0].title.startswith("New Task Assigned:")
    assert notifications[0].type == "info"
    assert notifications[0].link == "/sales/tasks"


def test_manager_reassign_lead_notifies_new_assignee(client, db):
    company = create_company(db, name="Lead Notif Co", company_code="LNF2")
    manager = create_active_user(
        db, email="manager@lnf2.com", role="manager", company_id=company.id, full_name="Manager One"
    )
    sales_a = create_active_user(db, email="salesa@lnf2.com", role="sales", company_id=company.id, full_name="Sales A")
    sales_b = create_active_user(db, email="salesb@lnf2.com", role="sales", company_id=company.id, full_name="Sales B")
    team = Team(company_id=company.id, name="Blue Team")
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
        name="RAM Expansion Lead",
        status="New",
        team_id=team.id,
        assigned_to_id=sales_a.id,
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)

    login_user(client, manager.email)
    response = client.post(f"/api/manager/leads/{lead.id}/reassign?new_assignee_id={sales_b.id}")
    assert response.status_code == 200, response.text

    notifications = db.query(Notification).filter(Notification.user_id == sales_b.id).all()
    assert len(notifications) == 1
    assert notifications[0].title.startswith("Lead Reassigned:")
    assert notifications[0].type == "info"
    assert notifications[0].link == f"/sales/leads/{lead.id}"


def test_task_assignment_updates_notifications_unread_count(client, db):
    company = create_company(db, name="Unread Notif Co", company_code="UNC")
    admin = create_active_user(db, email="admin@unc.com", role="admin", company_id=company.id, full_name="Admin One")
    sales = create_active_user(db, email="sales@unc.com", role="sales", company_id=company.id, full_name="Sales One")

    login_user(client, admin.email)
    created = client.post(
        "/api/tasks",
        json={
            "title": "Call supplier for SSD stock",
            "priority": "medium",
            "due_date": "2026-05-12",
            "assigned_to_id": sales.id,
        },
    )
    assert created.status_code == 201, created.text

    login_user(client, sales.email)
    notifications = client.get("/api/notifications")
    assert notifications.status_code == 200, notifications.text
    payload = notifications.json()
    assert payload["unread_count"] == 1
    assert payload["total"] == 1
    assert payload["notifications"][0]["title"].startswith("New Task Assigned:")
