"""Phase 7.8 — next activity nag, rotting by timeline touch, due email."""
from datetime import datetime, timedelta, timezone

import pytest

from app.models.sales.deal import Deal
from app.models.sales.email_log import EmailLog
from app.models.sales.pipeline import PipelineStage
from app.services.sales.deal_views import utc_today
from app.services.sales.reminders import run_due_reminders
from app.utils.rate_limit import auth_limiter
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


@pytest.fixture(autouse=True)
def _reset_auth():
    auth_limiter._buckets.clear()
    yield


def _admin(client, db, code="NA1"):
    company = create_company(db, name=f"Co {code}", company_code=code)
    admin = create_active_user(
        db, email=f"admin@{code.lower()}.com", role="admin", company_id=company.id
    )
    login_user(client, admin.email)
    return company, admin


def _stages(db, company_id, pipeline_id):
    return (
        db.query(PipelineStage)
        .filter(PipelineStage.company_id == company_id, PipelineStage.pipeline_id == pipeline_id)
        .order_by(PipelineStage.position)
        .all()
    )


def test_stage_move_blocked_without_next_activity(client, db):
    company, admin = _admin(client, db, "NA2")
    deal = client.post("/api/deals", json={"title": "Move me", "amount": "100"}).json()
    stages = _stages(db, company.id, deal["pipeline_id"])
    assert len(stages) >= 2
    target = stages[1].id
    denied = client.patch(f"/api/deals/{deal['id']}/stage", json={"stage_id": target})
    assert denied.status_code == 400
    assert "next task or meeting" in str(denied.json()["detail"]).lower()

    tomorrow = (datetime.now(timezone.utc) + timedelta(days=1)).date().isoformat()
    client.post("/api/tasks", json={
        "title": "Follow up",
        "due_date": tomorrow,
        "deal_id": deal["id"],
        "assigned_to_id": admin.id,
    })
    ok = client.patch(f"/api/deals/{deal['id']}/stage", json={"stage_id": target})
    assert ok.status_code == 200, ok.text


def test_deal_detail_shows_missing_next_activity(client, db):
    _admin(client, db, "NA3")
    deal = client.post("/api/deals", json={"title": "Empty", "amount": "1"}).json()
    detail = client.get(f"/api/deals/{deal['id']}").json()
    assert detail["missing_next_activity"] is True
    assert detail["next_activity"] is None


def test_rotting_uses_timeline_touch_not_updated_at(client, db):
    company, admin = _admin(client, db, "NA4")
    deal = client.post("/api/deals", json={"title": "Touchy", "amount": "1"}).json()
    row = db.query(Deal).filter(Deal.id == deal["id"]).one()
    row.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    row.created_at = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=30)
    db.commit()

    db.add(EmailLog(
        company_id=company.id,
        deal_id=deal["id"],
        direction="outbound",
        to_email="lead@example.com",
        subject="Ping",
        body="hi",
        sent_by_id=admin.id,
    ))
    db.commit()

    resp = client.get("/api/deals", params={"view": "rotting"})
    assert resp.status_code == 200, resp.text
    ids = [d["id"] for d in resp.json()["items"]]
    assert deal["id"] not in ids


def test_due_today_deal_email_once(client, db, monkeypatch):
    _company, admin = _admin(client, db, "NA5")
    sent = []

    def fake_email(to, subject, body):
        sent.append((to, subject))

    monkeypatch.setattr("app.services.sales.reminders.send_email", fake_email)
    today = utc_today().isoformat()
    client.post("/api/deals", json={
        "title": "Closing",
        "amount": "1",
        "expected_close": today,
        "assigned_to_id": admin.id,
    })

    first = run_due_reminders(db)
    assert first["deals_due"] == 1
    assert len(sent) == 1

    second = run_due_reminders(db)
    assert second["deals_due"] == 0
