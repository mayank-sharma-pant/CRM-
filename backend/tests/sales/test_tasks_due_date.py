from datetime import datetime, timedelta, timezone

from app.models.core.enums import TaskPriority, TaskStatus
from app.models.sales.lead import Lead
from app.models.sales.task import Task
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


def _setup_admin(client, db):
    company = create_company(db, name="Task Due Date Co", company_code="TDD")
    admin = create_active_user(
        db,
        email="admin@tdd.co",
        role="admin",
        company_id=company.id,
        full_name="Task Admin",
    )
    login_user(client, admin.email)
    return company, admin


def test_create_task_rejects_invalid_due_date(client, db):
    company, _admin = _setup_admin(client, db)
    lead = Lead(name="Due Date Lead", company_id=company.id, status="New")
    db.add(lead)
    db.commit()
    db.refresh(lead)

    response = client.post(
        "/api/tasks",
        json={
            "title": "Bad due date",
            "priority": "medium",
            "due_date": "not-a-date",
            "lead_id": lead.id,
        },
    )
    assert response.status_code == 400
    assert "invalid due_date format" in response.json()["detail"].lower()


def test_update_task_due_date_and_clear(client, db):
    company, _admin = _setup_admin(client, db)
    lead = Lead(name="Update Due Date Lead", company_id=company.id, status="New")
    db.add(lead)
    db.commit()
    db.refresh(lead)

    create_response = client.post(
        "/api/tasks",
        json={
            "title": "Initial due date",
            "priority": "high",
            "due_date": "2026-03-28",
            "lead_id": lead.id,
        },
    )
    assert create_response.status_code == 201
    task_id = create_response.json()["id"]

    update_response = client.put(
        f"/api/tasks/{task_id}",
        json={"due_date": "2026-04-01T10:30:00Z"},
    )
    assert update_response.status_code == 200

    task = db.query(Task).filter(Task.id == task_id).first()
    assert task is not None
    assert task.due_date is not None
    assert task.due_date.year == 2026
    assert task.due_date.month == 4
    assert task.due_date.day == 1

    clear_response = client.put(f"/api/tasks/{task_id}", json={"due_date": ""})
    assert clear_response.status_code == 200

    db.refresh(task)
    assert task.due_date is None


def test_update_task_rejects_invalid_due_date_and_preserves_existing(client, db):
    company, _admin = _setup_admin(client, db)
    lead = Lead(name="Invalid Update Due Date Lead", company_id=company.id, status="New")
    db.add(lead)
    db.commit()
    db.refresh(lead)

    create_response = client.post(
        "/api/tasks",
        json={
            "title": "Task with valid due date",
            "priority": "medium",
            "due_date": "2026-04-15",
            "lead_id": lead.id,
        },
    )
    assert create_response.status_code == 201
    task_id = create_response.json()["id"]

    update_response = client.put(
        f"/api/tasks/{task_id}",
        json={"due_date": "invalid-date-value"},
    )
    assert update_response.status_code == 400
    assert "invalid due_date format" in update_response.json()["detail"].lower()

    task = db.query(Task).filter(Task.id == task_id).first()
    assert task is not None
    assert task.due_date is not None
    assert task.due_date.year == 2026
    assert task.due_date.month == 4
    assert task.due_date.day == 15


def test_tasks_list_includes_due_date_iso(client, db):
    company, _admin = _setup_admin(client, db)
    lead = Lead(name="List Due Date Lead", company_id=company.id, status="New")
    db.add(lead)
    db.commit()
    db.refresh(lead)

    create_response = client.post(
        "/api/tasks",
        json={
            "title": "List due date",
            "priority": "medium",
            "due_date": "2026-04-10T09:15:00Z",
            "lead_id": lead.id,
        },
    )
    assert create_response.status_code == 201
    task_id = create_response.json()["id"]

    list_response = client.get("/api/tasks/list")
    assert list_response.status_code == 200
    payload = list_response.json()
    items = payload["items"]
    row = next((x for x in items if x["id"] == task_id), None)
    assert row is not None
    assert row["due_date_iso"] is not None
    assert "2026-04-10" in row["due_date_iso"]


def test_tasks_list_handles_timezone_aware_due_date_without_crash(client, db):
    company, admin = _setup_admin(client, db)
    aware_due_date = datetime.now(timezone.utc) + timedelta(days=2)
    task = Task(
        company_id=company.id,
        title="Timezone-safe list task",
        description="Ensures due-date math handles aware datetimes",
        status=TaskStatus.PENDING,
        priority=TaskPriority.MEDIUM,
        due_date=aware_due_date,
        assigned_to_id=admin.id,
        assigned_by_id=admin.id,
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    response = client.get("/api/tasks/list")
    assert response.status_code == 200
    payload = response.json()
    row = next((x for x in payload["items"] if x["id"] == task.id), None)
    assert row is not None
    assert row["due_date_iso"] is not None
