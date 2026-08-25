"""Dry-run must preview mutating AI tools without committing (Phase 0.5)."""

from app.models.core.team import Team
from app.models.sales.audit import AuditLog
from app.routers.ai import company_assistant as ai_router
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


async def _plan_create(_p, _q=None):
    return {"say": "creating", "actions": [{"action": "create_team", "params": {"name": "Dry Team"}}]}


async def _plan_mixed(_p, _q=None):
    return {
        "say": "mixed",
        "actions": [
            {"action": "list_teams", "params": {}},
            {"action": "create_team", "params": {"name": "Dry Team"}},
        ],
    }


def test_dry_run_does_not_create_team(client, db, monkeypatch):
    company = create_company(db, name="Dry Co", company_code="DRY")
    manager = create_active_user(
        db, email="m@dry.co", role="manager", company_id=company.id, full_name="Mgr"
    )
    monkeypatch.setattr(ai_router, "_gemini_plan", _plan_create)
    login_user(client, manager.email)
    r = client.post("/api/ai/company-assistant", json={"message": "make team", "dry_run": True})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body.get("dry_run") is True
    actions = body["executed_actions"]
    assert actions[0]["result"]["status"] == "dry_run"
    assert actions[0]["result"]["params"]["name"] == "Dry Team"
    assert db.query(Team).filter(Team.company_id == company.id, Team.name == "Dry Team").count() == 0
    audits = db.query(AuditLog).filter(AuditLog.company_id == company.id, AuditLog.entity_type == "ai_action").all()
    assert audits == []


def test_dry_run_still_runs_readonly(client, db, monkeypatch):
    company = create_company(db, name="Dry2", company_code="DR2")
    manager = create_active_user(
        db, email="m@dr2.co", role="manager", company_id=company.id, full_name="Mgr"
    )
    db.add(Team(company_id=company.id, name="Existing"))
    db.commit()
    monkeypatch.setattr(ai_router, "_gemini_plan", _plan_mixed)
    login_user(client, manager.email)
    r = client.post("/api/ai/company-assistant", json={"message": "preview", "dry_run": True})
    assert r.status_code == 200, r.text
    actions = r.json()["executed_actions"]
    assert actions[0]["action"] == "list_teams"
    assert any(t["name"] == "Existing" for t in actions[0]["result"]["teams"])
    assert actions[1]["result"]["status"] == "dry_run"
    assert db.query(Team).filter(Team.company_id == company.id, Team.name == "Dry Team").count() == 0
