"""Due task/follow-up reminders: in-app + email, once per item."""
from datetime import date, datetime, timedelta
from unittest.mock import patch

import pytest

from app.models.core.company_settings import CompanySettings
from app.models.sales.follow_up import FollowUp
from app.models.sales.lead import Lead
from app.models.sales.notification import Notification
from app.models.sales.task import Task
from app.models.core.enums import TaskStatus
from app.utils.rate_limit import auth_limiter
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


@pytest.fixture(autouse=True)
def _reset_auth():
    auth_limiter._buckets.clear()
    yield


def _admin(client, db, code="RM1"):
    company = create_company(db, name=f"Co {code}", company_code=code)
    admin = create_active_user(
        db, email=f"admin@{code.lower()}.com", role="admin", company_id=company.id
    )
    login_user(client, admin.email)
    return company, admin


@patch("app.services.sales.reminders.send_email", return_value=True)
def test_due_task_sends_in_app_and_email(mock_send, client, db):
    company, admin = _admin(client, db, "RMA")
    db.add(Task(
        company_id=company.id,
        title="Call site",
        assigned_to_id=admin.id,
        due_date=datetime.utcnow(),
        status=TaskStatus.PENDING,
    ))
    db.commit()

    resp = client.post("/api/reminders/run")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["tasks"] == 1
    assert db.query(Notification).filter(Notification.user_id == admin.id).count() >= 1
    mock_send.assert_called()
    assert "Call site" in mock_send.call_args[0][1]

    again = client.post("/api/reminders/run")
    assert again.json()["tasks"] == 0
    assert mock_send.call_count == 1


@patch("app.services.sales.reminders.send_email", return_value=True)
def test_future_task_is_not_reminded(mock_send, client, db):
    company, admin = _admin(client, db, "RMB")
    db.add(Task(
        company_id=company.id,
        title="Later",
        assigned_to_id=admin.id,
        due_date=datetime.utcnow() + timedelta(days=3),
        status=TaskStatus.PENDING,
    ))
    db.commit()
    assert client.post("/api/reminders/run").json()["tasks"] == 0
    mock_send.assert_not_called()


@patch("app.services.sales.reminders.send_email", return_value=True)
def test_company_can_disable_task_reminders(mock_send, client, db):
    company, admin = _admin(client, db, "RMC")
    db.add(CompanySettings(
        company_id=company.id,
        company_name="Off",
        task_reminders_enabled=0,
    ))
    db.add(Task(
        company_id=company.id,
        title="Muted",
        assigned_to_id=admin.id,
        due_date=datetime.utcnow(),
        status=TaskStatus.PENDING,
    ))
    db.commit()
    assert client.post("/api/reminders/run").json()["tasks"] == 0
    mock_send.assert_not_called()


@patch("app.services.sales.reminders.send_email", return_value=True)
def test_due_follow_up_notifies_owner(mock_send, client, db):
    company, admin = _admin(client, db, "RMD")
    lead = Lead(company_id=company.id, name="Asha", created_by_id=admin.id)
    db.add(lead)
    db.flush()
    db.add(FollowUp(
        company_id=company.id,
        lead_id=lead.id,
        scheduled_date=date.today(),
        status="Pending",
        created_by_id=admin.id,
        notes="Day 1 SMS",
    ))
    db.commit()
    resp = client.post("/api/reminders/run")
    assert resp.status_code == 200, resp.text
    assert resp.json()["follow_ups"] == 1
    mock_send.assert_called()


def test_sales_cannot_run_reminders(client, db):
    company = create_company(db, name="Co RMS", company_code="RMS")
    create_active_user(db, email="sales@rms.com", role="sales", company_id=company.id)
    login_user(client, "sales@rms.com")
    assert client.post("/api/reminders/run").status_code == 403
