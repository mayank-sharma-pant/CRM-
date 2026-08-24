"""Deal list/board/by-id row-scoping must mirror leads.py team logic.

Confidentiality gap the reviewer proved: a sales rep must not see every
team's unassigned deals, and a manager must not see all teams' deals.
"""
import pytest

from app.models.core.team import Team
from app.models.core.team_membership import TeamMembership
from app.utils.rate_limit import auth_limiter
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


@pytest.fixture(autouse=True)
def _reset_auth_rate_limit():
    auth_limiter._buckets.clear()
    yield


def _titles(resp):
    return {item["title"] for item in resp.json()["items"]}


def _board_titles(resp):
    titles = set()
    for stage in resp.json()["stages"]:
        titles.update(d["title"] for d in stage["deals"])
    return titles


def _setup_two_teams(client, db):
    company = create_company(db, name="Scope Co", company_code="SCP")
    team_a = Team(company_id=company.id, name="Alpha")
    team_b = Team(company_id=company.id, name="Beta")
    db.add_all([team_a, team_b])
    db.commit()
    db.refresh(team_a)
    db.refresh(team_b)

    admin = create_active_user(
        db, email="admin@scp.com", role="admin", company_id=company.id, full_name="Admin"
    )
    manager_a = create_active_user(
        db, email="mgr@scp.com", role="manager", company_id=company.id,
        full_name="Mgr A", team_id=team_a.id,
    )
    sales_a = create_active_user(
        db, email="salesa@scp.com", role="sales", company_id=company.id,
        full_name="Sales A", team_id=team_a.id,
    )
    sales_b = create_active_user(
        db, email="salesb@scp.com", role="sales", company_id=company.id,
        full_name="Sales B", team_id=team_b.id,
    )
    db.add_all([
        TeamMembership(company_id=company.id, team_id=team_a.id, user_id=manager_a.id),
        TeamMembership(company_id=company.id, team_id=team_a.id, user_id=sales_a.id),
        TeamMembership(company_id=company.id, team_id=team_b.id, user_id=sales_b.id),
    ])
    db.commit()

    login_user(client, admin.email)
    client.post("/api/deals", json={
        "title": "mine-a", "amount": "10",
        "assigned_to_id": sales_a.id, "team_id": team_a.id,
    })
    client.post("/api/deals", json={
        "title": "open-a", "amount": "20",
        "assigned_to_id": None, "team_id": team_a.id,
    })
    client.post("/api/deals", json={
        "title": "open-b", "amount": "30",
        "assigned_to_id": None, "team_id": team_b.id,
    })
    client.post("/api/deals", json={
        "title": "theirs-b", "amount": "40",
        "assigned_to_id": sales_b.id, "team_id": team_b.id,
    })
    client.headers.pop("Authorization", None)
    return {
        "company": company,
        "team_a": team_a,
        "team_b": team_b,
        "admin": admin,
        "manager_a": manager_a,
        "sales_a": sales_a,
        "sales_b": sales_b,
    }


def test_sales_list_does_not_include_other_team_unassigned(client, db):
    ctx = _setup_two_teams(client, db)
    login_user(client, ctx["sales_a"].email)
    client.headers["X-Team-Id"] = str(ctx["team_a"].id)

    listed = client.get("/api/deals")
    assert listed.status_code == 200, listed.text
    titles = _titles(listed)
    assert titles == {"mine-a", "open-a"}
    assert "open-b" not in titles
    assert "theirs-b" not in titles

    board = client.get("/api/deals/board")
    assert board.status_code == 200, board.text
    assert _board_titles(board) == {"mine-a", "open-a"}


def test_manager_list_is_limited_to_active_team(client, db):
    ctx = _setup_two_teams(client, db)
    login_user(client, ctx["manager_a"].email)
    client.headers["X-Team-Id"] = str(ctx["team_a"].id)

    listed = client.get("/api/deals")
    assert listed.status_code == 200, listed.text
    titles = _titles(listed)
    assert titles == {"mine-a", "open-a"}
    assert "open-b" not in titles
    assert "theirs-b" not in titles

    board = client.get("/api/deals/board")
    assert board.status_code == 200, board.text
    assert _board_titles(board) == {"mine-a", "open-a"}


def test_admin_list_sees_all_teams(client, db):
    ctx = _setup_two_teams(client, db)
    login_user(client, ctx["admin"].email)
    listed = client.get("/api/deals")
    assert listed.status_code == 200
    assert _titles(listed) == {"mine-a", "open-a", "open-b", "theirs-b"}


def test_sales_cannot_get_other_team_unassigned_deal(client, db):
    ctx = _setup_two_teams(client, db)
    login_user(client, ctx["admin"].email)
    all_deals = {d["title"]: d["id"] for d in client.get("/api/deals").json()["items"]}

    login_user(client, ctx["sales_a"].email)
    client.headers["X-Team-Id"] = str(ctx["team_a"].id)
    assert client.get(f"/api/deals/{all_deals['mine-a']}").status_code == 200
    assert client.get(f"/api/deals/{all_deals['open-a']}").status_code == 200
    denied = client.get(f"/api/deals/{all_deals['open-b']}")
    assert denied.status_code in (403, 404), denied.text
