"""A failing AI action must not abort the whole turn, must roll back its own
partial writes, and must be recorded as a failed attempt (Phase 0.5 follow-up)."""

from app.models.core.team import Team
from app.models.sales.audit import AuditLog
from app.routers.ai import company_assistant as ai_router
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


def _seed(db, code):
    company = create_company(db, name=f"Graceful {code}", company_code=code)
    manager = create_active_user(
        db, email=f"manager@{code.lower()}.co", role="manager", company_id=company.id, full_name="Mgr"
    )
    return company, manager


def _ai_action_rows(db, company_id):
    return db.query(AuditLog).filter(
        AuditLog.company_id == company_id, AuditLog.entity_type == "ai_action"
    ).all()


def test_failed_action_returns_error_result_not_500_or_400(client, db, monkeypatch):
    company, manager = _seed(db, "GRA")
    db.add(Team(company_id=company.id, name="Alpha Team"))
    db.commit()

    async def plan(_p, _q=None):
        return {"say": "x", "actions": [{"action": "create_team", "params": {"name": "Alpha Team"}}]}

    monkeypatch.setattr(ai_router, "_gemini_plan", plan)
    login_user(client, manager.email)
    r = client.post("/api/ai/company-assistant", json={"message": "make alpha"})
    assert r.status_code == 200, r.text

    actions = r.json()["executed_actions"]
    assert actions and actions[0]["result"]["status"] == "error"
    # No duplicate created.
    assert db.query(Team).filter(Team.company_id == company.id, Team.name == "Alpha Team").count() == 1
    # The failed attempt is audited.
    failed = [row for row in _ai_action_rows(db, company.id) if row.action.endswith(":failed")]
    assert len(failed) == 1
    assert "create_team" in failed[0].action


def test_partial_write_is_rolled_back_on_failure(client, db, monkeypatch):
    company, manager = _seed(db, "GRB")
    sales = create_active_user(db, email="s@grb.co", role="sales", company_id=company.id, full_name="S")

    async def plan(_p, _q=None):
        # create_team_with_members rejects a bad manager_id — the team must NOT
        # survive the failure. (member_ids non-empty so param validation passes
        # and we reach the execution-phase manager check.)
        return {
            "say": "x",
            "actions": [
                {
                    "action": "create_team_with_members",
                    "params": {"name": "Ghost Team", "manager_id": 999999, "member_ids": [sales.id]},
                }
            ],
        }

    monkeypatch.setattr(ai_router, "_gemini_plan", plan)
    login_user(client, manager.email)
    r = client.post("/api/ai/company-assistant", json={"message": "make ghost"})
    assert r.status_code == 200, r.text
    assert r.json()["executed_actions"][0]["result"]["status"] == "error"
    assert db.query(Team).filter(Team.company_id == company.id, Team.name == "Ghost Team").count() == 0


def test_one_failure_does_not_block_other_actions(client, db, monkeypatch):
    company, manager = _seed(db, "GRC")
    db.add(Team(company_id=company.id, name="Alpha Team"))
    db.commit()

    async def plan(_p, _q=None):
        return {
            "say": "x",
            "actions": [
                {"action": "create_team", "params": {"name": "Alpha Team"}},  # dup -> fails
                {"action": "create_team", "params": {"name": "Gamma Team"}},  # ok
            ],
        }

    monkeypatch.setattr(ai_router, "_gemini_plan", plan)
    login_user(client, manager.email)
    r = client.post("/api/ai/company-assistant", json={"message": "make two"})
    assert r.status_code == 200, r.text
    results = r.json()["executed_actions"]
    assert results[0]["result"]["status"] == "error"
    assert results[1]["result"].get("status") != "error"
    assert db.query(Team).filter(Team.company_id == company.id, Team.name == "Gamma Team").count() == 1
