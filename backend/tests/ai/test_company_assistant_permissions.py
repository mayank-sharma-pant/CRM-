from app.models.core.team import Team
from app.models.finance.ledger import LedgerEntry
from app.routers.ai import company_assistant as ai_router
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


async def _plan_no_actions(_prompt: str, _params=None) -> dict:
    return {"say": "Read-only response", "actions": []}


def test_ai_assistant_is_available_to_all_company_roles(client, db, monkeypatch):
    monkeypatch.setattr(ai_router, "_gemini_plan", _plan_no_actions)
    company = create_company(db, name="AI Co", company_code="AIC")

    users = [
        create_active_user(db, email="sales@ai.co", role="sales", company_id=company.id, full_name="AI Sales"),
        create_active_user(db, email="manager@ai.co", role="manager", company_id=company.id, full_name="AI Manager"),
        create_active_user(db, email="md@ai.co", role="md", company_id=company.id, full_name="AI MD"),
        create_active_user(db, email="purchase@ai.co", role="purchase", company_id=company.id, full_name="AI Purchase"),
        create_active_user(db, email="admin@ai.co", role="admin", company_id=company.id, full_name="AI Admin"),
    ]

    for user in users:
        client.headers.pop("Authorization", None)
        login_user(client, user.email)
        r = client.post("/api/ai/company-assistant", json={"message": "What is going on today?"})
        assert r.status_code == 200
        payload = r.json()
        assert "message" in payload
        assert isinstance(payload.get("executed_actions"), list)


async def _plan_create_team(_prompt: str, _params=None) -> dict:
    return {
        "say": "Trying to create team",
        "actions": [{"action": "create_team", "params": {"name": "Alpha Team"}}],
    }


def test_only_manager_and_md_can_execute_mutating_team_actions(client, db, monkeypatch):
    monkeypatch.setattr(ai_router, "_gemini_plan", _plan_create_team)
    company = create_company(db, name="Mutate Co", company_code="MTC")
    sales = create_active_user(db, email="sales@mt.co", role="sales", company_id=company.id, full_name="Sales User")
    manager = create_active_user(db, email="manager@mt.co", role="manager", company_id=company.id, full_name="Manager User")

    login_user(client, sales.email)
    r_sales = client.post("/api/ai/company-assistant", json={"message": "Create team Alpha Team"})
    assert r_sales.status_code == 200
    actions_sales = r_sales.json().get("executed_actions", [])
    assert actions_sales
    assert actions_sales[0]["result"]["status"] == "skipped"
    assert actions_sales[0]["result"]["reason"] == "action_not_allowed_for_role"
    assert db.query(Team).filter(Team.company_id == company.id, Team.name == "Alpha Team").count() == 0

    client.headers.pop("Authorization", None)
    login_user(client, manager.email)
    r_manager = client.post("/api/ai/company-assistant", json={"message": "Create team Alpha Team"})
    assert r_manager.status_code == 200
    actions_manager = r_manager.json().get("executed_actions", [])
    assert actions_manager
    assert actions_manager[0]["action"] == "create_team"
    assert actions_manager[0]["result"]["name"] == "Alpha Team"
    assert db.query(Team).filter(Team.company_id == company.id, Team.name == "Alpha Team").count() == 1


async def _plan_create_ledger_entry(_prompt: str, _params=None) -> dict:
    return {
        "say": "Adding ledger entry",
        "actions": [
            {
                "action": "create_ledger_entry",
                "params": {
                    "ledger_slug": "daily_expenses",
                    "data": {"date": "2026-03-27", "expense_type": "Ops", "amount": 2500, "remarks": "Fuel"},
                },
            }
        ],
    }


def test_manager_can_create_financial_ledger_entry_via_ai(client, db, monkeypatch):
    monkeypatch.setattr(ai_router, "_gemini_plan", _plan_create_ledger_entry)
    company = create_company(db, name="Ledger Co", company_code="LGC")
    manager = create_active_user(db, email="manager@lg.co", role="manager", company_id=company.id, full_name="Ledger Manager")

    login_user(client, manager.email)
    r = client.post("/api/ai/company-assistant", json={"message": "Add expense in daily ledger"})
    assert r.status_code == 200
    payload = r.json()
    actions = payload.get("executed_actions", [])
    assert actions
    assert actions[0]["action"] == "create_ledger_entry"
    assert actions[0]["result"]["ledger_slug"] == "daily_expenses"

    rows = db.query(LedgerEntry).filter(
        LedgerEntry.company_id == company.id,
        LedgerEntry.ledger_slug == "daily_expenses",
    ).all()
    assert len(rows) == 1
    assert rows[0].data.get("expense_type") == "Ops"


async def _plan_bad_actions_shape(_prompt: str, _params=None) -> dict:
    return {"say": "Malformed actions", "actions": {"action": "create_team"}}


def test_ai_malformed_actions_shape_does_not_crash(client, db, monkeypatch):
    monkeypatch.setattr(ai_router, "_gemini_plan", _plan_bad_actions_shape)
    company = create_company(db, name="Shape Co", company_code="SHC")
    manager = create_active_user(db, email="manager@shape.co", role="manager", company_id=company.id, full_name="Shape Manager")

    login_user(client, manager.email)
    r = client.post("/api/ai/company-assistant", json={"message": "Create team"})
    assert r.status_code == 200
    payload = r.json()
    assert payload.get("message")
    assert payload.get("executed_actions") == []


async def _plan_bad_action_item(_prompt: str, _params=None) -> dict:
    return {
        "say": "Malformed action item",
        "actions": ["oops", {"action": "create_team", "params": "not-an-object"}],
    }


def test_ai_malformed_action_item_or_params_returns_structured_errors(client, db, monkeypatch):
    monkeypatch.setattr(ai_router, "_gemini_plan", _plan_bad_action_item)
    company = create_company(db, name="Item Co", company_code="ITC")
    manager = create_active_user(db, email="manager@item.co", role="manager", company_id=company.id, full_name="Item Manager")

    login_user(client, manager.email)
    r = client.post("/api/ai/company-assistant", json={"message": "Do malformed actions"})
    assert r.status_code == 200
    actions = r.json().get("executed_actions", [])
    assert len(actions) == 2
    assert actions[0]["result"]["status"] == "error"
    assert "payload" in actions[0]["result"]["error"].lower()
    assert actions[1]["result"]["status"] == "error"
    assert "params" in actions[1]["result"]["error"].lower()
