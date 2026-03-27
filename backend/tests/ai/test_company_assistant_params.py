from app.routers.ai import company_assistant as ai_router
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


async def _plan_no_actions(_prompt: str, _params=None) -> dict:
    return {"say": "ok", "actions": []}


def test_get_company_assistant_params_for_manager(client, db):
    company = create_company(db, name="Params Co", company_code="PAR")
    manager = create_active_user(
        db,
        email="manager@params.co",
        role="manager",
        company_id=company.id,
        full_name="Params Manager",
    )

    login_user(client, manager.email)
    response = client.get("/api/ai/company-assistant/params")
    assert response.status_code == 200
    payload = response.json()
    assert payload["can_override"] is True
    assert isinstance(payload["allowed_models"], list)
    assert payload["allowed_models"]
    assert payload["params"]["model"]


def test_get_company_assistant_params_for_sales(client, db):
    company = create_company(db, name="Params Sales Co", company_code="PSC")
    sales = create_active_user(
        db,
        email="sales@params.co",
        role="sales",
        company_id=company.id,
        full_name="Params Sales",
    )

    login_user(client, sales.email)
    response = client.get("/api/ai/company-assistant/params")
    assert response.status_code == 200
    payload = response.json()
    assert payload["can_override"] is False


def test_sales_cannot_override_ai_params(client, db, monkeypatch):
    monkeypatch.setattr(ai_router, "_gemini_plan", _plan_no_actions)
    company = create_company(db, name="No Override Co", company_code="NOC")
    sales = create_active_user(
        db,
        email="sales@noc.co",
        role="sales",
        company_id=company.id,
        full_name="No Override Sales",
    )

    login_user(client, sales.email)
    response = client.post(
        "/api/ai/company-assistant",
        json={
            "message": "Tell me today's revenue",
            "ai_params": {"temperature": 0.5},
        },
    )
    assert response.status_code == 403
    assert "override ai parameters" in response.json()["detail"].lower()


def test_manager_can_override_ai_params(client, db, monkeypatch):
    captured = {}

    async def _plan_capture(_prompt: str, ai_params) -> dict:
        captured["model"] = ai_params.model
        captured["temperature"] = ai_params.temperature
        captured["max_output_tokens"] = ai_params.max_output_tokens
        captured["max_actions"] = ai_params.max_actions
        return {"say": "Using custom params", "actions": []}

    monkeypatch.setattr(ai_router, "_gemini_plan", _plan_capture)
    company = create_company(db, name="Override Co", company_code="OVR")
    manager = create_active_user(
        db,
        email="manager@ovr.co",
        role="manager",
        company_id=company.id,
        full_name="Override Manager",
    )

    login_user(client, manager.email)
    response = client.post(
        "/api/ai/company-assistant",
        json={
            "message": "Give me a snapshot",
            "ai_params": {
                "model": "gemini-2.5-pro",
                "temperature": 0.3,
                "max_output_tokens": 512,
                "max_actions": 2,
            },
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["used_params"]["model"] == "gemini-2.5-pro"
    assert payload["used_params"]["temperature"] == 0.3
    assert payload["used_params"]["max_output_tokens"] == 512
    assert payload["used_params"]["max_actions"] == 2
    assert captured["model"] == "gemini-2.5-pro"
    assert captured["temperature"] == 0.3


def test_ai_params_max_actions_cannot_exceed_server_limit(client, db, monkeypatch):
    monkeypatch.setattr(ai_router, "_gemini_plan", _plan_no_actions)
    company = create_company(db, name="Cap Co", company_code="CAP")
    manager = create_active_user(
        db,
        email="manager@cap.co",
        role="manager",
        company_id=company.id,
        full_name="Cap Manager",
    )
    server_limit = ai_router._server_default_ai_params().max_actions

    login_user(client, manager.email)
    response = client.post(
        "/api/ai/company-assistant",
        json={
            "message": "snapshot",
            "ai_params": {"max_actions": server_limit + 1},
        },
    )
    assert response.status_code == 400
    assert "max_actions" in response.json()["detail"]
