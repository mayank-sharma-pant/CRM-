"""AI mutating actions must leave an audit trail (Phase 0.5)."""

from app.models.sales.audit import AuditLog
from app.routers.ai import company_assistant as ai_router
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


def _ai_audit_rows(db, company_id):
    return (
        db.query(AuditLog)
        .filter(AuditLog.company_id == company_id, AuditLog.entity_type == "ai_action")
        .all()
    )


async def _plan_create_team(_prompt, _params=None):
    return {"say": "creating", "actions": [{"action": "create_team", "params": {"name": "Alpha Team"}}]}


async def _plan_snapshot(_prompt, _params=None):
    return {"say": "reading", "actions": [{"action": "business_snapshot", "params": {}}]}


def test_ai_mutation_writes_audit_log(client, db, monkeypatch):
    monkeypatch.setattr(ai_router, "_gemini_plan", _plan_create_team)
    company = create_company(db, name="Audit Co", company_code="AUD")
    manager = create_active_user(db, email="manager@aud.co", role="manager", company_id=company.id, full_name="Aud Manager")

    login_user(client, manager.email)
    r = client.post("/api/ai/company-assistant", json={"message": "make a team"})
    assert r.status_code == 200, r.text

    rows = _ai_audit_rows(db, company.id)
    assert len(rows) == 1
    row = rows[0]
    assert "create_team" in row.action
    assert row.admin_id == manager.id
    assert row.company_id == company.id
    assert row.after_value and "Alpha Team" in row.after_value


def test_ai_readonly_action_is_not_audited(client, db, monkeypatch):
    monkeypatch.setattr(ai_router, "_gemini_plan", _plan_snapshot)
    company = create_company(db, name="RO Co", company_code="ROC")
    manager = create_active_user(db, email="manager@roc.co", role="manager", company_id=company.id, full_name="RO Manager")

    login_user(client, manager.email)
    r = client.post("/api/ai/company-assistant", json={"message": "how is business"})
    assert r.status_code == 200, r.text

    assert _ai_audit_rows(db, company.id) == []


def test_role_denied_action_is_not_audited(client, db, monkeypatch):
    monkeypatch.setattr(ai_router, "_gemini_plan", _plan_create_team)
    company = create_company(db, name="Deny Co", company_code="DNC")
    sales = create_active_user(db, email="sales@dnc.co", role="sales", company_id=company.id, full_name="Deny Sales")

    login_user(client, sales.email)
    r = client.post("/api/ai/company-assistant", json={"message": "make a team"})
    assert r.status_code == 200, r.text
    # Sales is not allowed to create teams; the action is skipped, so nothing executed to audit.
    assert _ai_audit_rows(db, company.id) == []
