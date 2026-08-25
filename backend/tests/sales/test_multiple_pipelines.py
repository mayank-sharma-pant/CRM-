import pytest

from app.utils.rate_limit import auth_limiter
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


@pytest.fixture(autouse=True)
def _reset_auth_rate_limit():
    auth_limiter._buckets.clear()
    yield


def _admin(db, code="C1"):
    company = create_company(db, name=f"Co {code}", company_code=code)
    admin = create_active_user(db, email=f"admin@{code}.com", role="admin", company_id=company.id)
    return company, admin


def test_create_second_pipeline_seeds_stages_and_isolates_board(client, db):
    _, admin = _admin(db)
    login_user(client, admin.email)
    first = client.post("/api/deals", json={"title": "On default", "amount": "100"}).json()
    default_id = first["pipeline_id"]

    created = client.post("/api/deals/pipelines", json={"name": "Services"})
    assert created.status_code == 201, created.text
    second = created.json()
    assert second["name"] == "Services"
    assert second["is_default"] is False
    assert second["id"] != default_id

    stages = client.get("/api/deals/stages", params={"pipeline_id": second["id"]}).json()["items"]
    assert [s["name"] for s in stages] == ["Qualification", "Proposal", "Negotiation", "Won", "Lost"]

    board_default = client.get("/api/deals/board", params={"pipeline_id": default_id}).json()
    board_second = client.get("/api/deals/board", params={"pipeline_id": second["id"]}).json()
    default_titles = [d["title"] for col in board_default["stages"] for d in col["deals"]]
    second_titles = [d["title"] for col in board_second["stages"] for d in col["deals"]]
    assert "On default" in default_titles
    assert "On default" not in second_titles
    assert board_second["pipeline_name"] == "Services"

    on_second = client.post("/api/deals", json={
        "title": "On services", "amount": "50", "pipeline_id": second["id"],
    })
    assert on_second.status_code == 201, on_second.text
    assert on_second.json()["pipeline_id"] == second["id"]

    board_second = client.get("/api/deals/board", params={"pipeline_id": second["id"]}).json()
    second_titles = [d["title"] for col in board_second["stages"] for d in col["deals"]]
    assert "On services" in second_titles
    board_default = client.get("/api/deals/board", params={"pipeline_id": default_id}).json()
    default_titles = [d["title"] for col in board_default["stages"] for d in col["deals"]]
    assert "On services" not in default_titles


def test_sales_cannot_create_pipeline(client, db):
    company, _ = _admin(db)
    create_active_user(db, email="sales@c1.com", role="sales", company_id=company.id)
    login_user(client, "sales@c1.com")
    resp = client.post("/api/deals/pipelines", json={"name": "Nope"})
    assert resp.status_code == 403


def test_cannot_delete_default_or_pipeline_with_deals(client, db):
    _, admin = _admin(db)
    login_user(client, admin.email)
    deal = client.post("/api/deals", json={"title": "Keep", "amount": "1"}).json()
    default_id = deal["pipeline_id"]
    assert client.delete(f"/api/deals/pipelines/{default_id}").status_code == 400

    second = client.post("/api/deals/pipelines", json={"name": "Temp"}).json()
    client.post("/api/deals", json={"title": "Parked", "amount": "1", "pipeline_id": second["id"]})
    assert client.delete(f"/api/deals/pipelines/{second['id']}").status_code == 400


def test_delete_empty_non_default_pipeline(client, db):
    _, admin = _admin(db)
    login_user(client, admin.email)
    client.post("/api/deals", json={"title": "seed", "amount": "1"})
    second = client.post("/api/deals/pipelines", json={"name": "Empty"}).json()
    resp = client.delete(f"/api/deals/pipelines/{second['id']}")
    assert resp.status_code in (200, 204)
    listed = client.get("/api/deals/pipelines").json()["items"]
    assert all(p["id"] != second["id"] for p in listed)


def test_rename_and_set_default(client, db):
    _, admin = _admin(db)
    login_user(client, admin.email)
    client.post("/api/deals", json={"title": "seed", "amount": "1"})
    second = client.post("/api/deals/pipelines", json={"name": "Alt"}).json()
    patched = client.patch(f"/api/deals/pipelines/{second['id']}", json={"name": "Installs", "is_default": True})
    assert patched.status_code == 200
    items = client.get("/api/deals/pipelines").json()["items"]
    defaults = [p for p in items if p["is_default"]]
    assert len(defaults) == 1
    assert defaults[0]["id"] == second["id"]
    assert defaults[0]["name"] == "Installs"


def test_board_unknown_pipeline_is_404(client, db):
    _, admin = _admin(db)
    login_user(client, admin.email)
    client.post("/api/deals", json={"title": "seed", "amount": "1"})
    assert client.get("/api/deals/board", params={"pipeline_id": 999999}).status_code == 404
