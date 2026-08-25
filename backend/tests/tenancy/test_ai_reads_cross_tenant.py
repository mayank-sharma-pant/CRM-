"""AI read tools must not return another company's data (Phase 0.2)."""

from app.models.sales.lead import Lead
from app.models.core.team import Team
from app.routers.ai import company_assistant as ai_router
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


async def _plan_list_teams(_prompt, _params=None):
    return {"say": "teams", "actions": [{"action": "list_teams", "params": {}}]}


async def _plan_snapshot(_prompt, _params=None):
    return {"say": "snapshot", "actions": [{"action": "business_snapshot", "params": {}}]}


def _plan_delete_foreign(team_id):
    async def _plan(_prompt, _params=None):
        return {"say": "delete", "actions": [{"action": "delete_team", "params": {"team_id": team_id}}]}

    return _plan


def test_ai_list_teams_omits_foreign_company(client, db, monkeypatch):
    monkeypatch.setattr(ai_router, "_gemini_plan", _plan_list_teams)
    a = create_company(db, name="A", company_code="AIA")
    b = create_company(db, name="B", company_code="AIB")
    db.add(Team(company_id=a.id, name="Secret Alpha"))
    db.commit()
    create_active_user(db, email="admin@aia.com", role="admin", company_id=a.id)
    create_active_user(db, email="admin@aib.com", role="admin", company_id=b.id)
    login_user(client, "admin@aib.com")
    r = client.post("/api/ai/company-assistant", json={"message": "list teams"})
    assert r.status_code == 200, r.text
    assert "Secret Alpha" not in r.text


def test_ai_snapshot_omits_foreign_leads(client, db, monkeypatch):
    monkeypatch.setattr(ai_router, "_gemini_plan", _plan_snapshot)
    a = create_company(db, name="A", company_code="AIC")
    b = create_company(db, name="B", company_code="AID")
    db.add(Lead(company_id=a.id, name="OnlyAtA", email="only@a.com", status="Active"))
    db.commit()
    create_active_user(db, email="admin@aic.com", role="admin", company_id=a.id)
    admin_b = create_active_user(db, email="admin@aid.com", role="admin", company_id=b.id)
    login_user(client, admin_b.email)
    r = client.post("/api/ai/company-assistant", json={"message": "snapshot"})
    assert r.status_code == 200, r.text
    body = r.json()
    blob = str(body)
    assert "OnlyAtA" not in blob
    actions = body.get("actions") or body.get("executed") or []
    if actions:
        result = actions[0].get("result") or {}
        assert int(result.get("total_leads") or 0) == 0


def test_ai_delete_foreign_team_is_error_not_leak(client, db, monkeypatch):
    a = create_company(db, name="A", company_code="AIE")
    b = create_company(db, name="B", company_code="AIF")
    team = Team(company_id=a.id, name="Keep Me")
    db.add(team)
    db.commit()
    db.refresh(team)
    monkeypatch.setattr(ai_router, "_gemini_plan", _plan_delete_foreign(team.id))
    create_active_user(db, email="admin@aie.com", role="admin", company_id=a.id)
    create_active_user(db, email="admin@aif.com", role="admin", company_id=b.id)
    login_user(client, "admin@aif.com")
    r = client.post("/api/ai/company-assistant", json={"message": "delete that team"})
    assert r.status_code == 200, r.text
    assert db.query(Team).filter(Team.id == team.id).one().name == "Keep Me"
    blob = r.text
    assert "error" in blob.lower() or "not found" in blob.lower()
