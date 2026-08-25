from datetime import datetime, timedelta, timezone

import pytest

from app.models.sales.deal import Deal
from app.services.sales.deal_views import utc_today
from app.utils.rate_limit import auth_limiter
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


@pytest.fixture(autouse=True)
def _reset_auth():
    auth_limiter._buckets.clear()
    yield


def _admin(client, db, code="SF1"):
    company = create_company(db, name=f"Co {code}", company_code=code)
    admin = create_active_user(
        db, email=f"admin@{code.lower()}.com", role="admin", company_id=company.id
    )
    login_user(client, admin.email)
    return company, admin


def test_due_today_is_mine_with_close_date(client, db):
    company, admin = _admin(client, db, "SFA")
    today = utc_today().isoformat()
    mine = client.post("/api/deals", json={
        "title": "Due mine",
        "amount": "10",
        "expected_close": today,
        "assigned_to_id": admin.id,
    }).json()
    client.post("/api/deals", json={
        "title": "Due other day",
        "amount": "10",
        "expected_close": "2099-01-01",
        "assigned_to_id": admin.id,
    })
    other = create_active_user(db, email="rep@sfa.com", role="sales", company_id=company.id)
    client.post("/api/deals", json={
        "title": "Due not mine",
        "amount": "10",
        "expected_close": today,
        "assigned_to_id": other.id,
    })
    resp = client.get("/api/deals", params={"view": "due_today"})
    assert resp.status_code == 200, resp.text
    ids = [row["id"] for row in resp.json()["items"]]
    assert ids == [mine["id"]]


def test_invalid_view_is_400(client, db):
    _admin(client, db, "SFB")
    assert client.get("/api/deals", params={"view": "won_forever"}).status_code == 400


def test_rotting_is_open_and_stale(client, db):
    _admin(client, db, "SFC")
    stale = client.post("/api/deals", json={"title": "Stale", "amount": "1"}).json()
    fresh = client.post("/api/deals", json={"title": "Fresh", "amount": "1"}).json()
    row = db.query(Deal).filter(Deal.id == stale["id"]).one()
    row.updated_at = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=20)
    db.commit()
    resp = client.get("/api/deals", params={"view": "rotting"})
    assert resp.status_code == 200, resp.text
    ids = [d["id"] for d in resp.json()["items"]]
    assert stale["id"] in ids
    assert fresh["id"] not in ids


def test_board_honors_due_today(client, db):
    _, admin = _admin(client, db, "SFD")
    today = utc_today().isoformat()
    due = client.post("/api/deals", json={
        "title": "Board due",
        "amount": "1",
        "expected_close": today,
        "assigned_to_id": admin.id,
    }).json()
    client.post("/api/deals", json={"title": "Board other", "amount": "1"})
    board = client.get("/api/deals/board", params={"view": "due_today"})
    assert board.status_code == 200, board.text
    ids = [d["id"] for s in board.json()["stages"] for d in s["deals"]]
    assert ids == [due["id"]]


def test_saved_filter_crud_and_isolation(client, db):
    _admin(client, db, "SFE")
    created = client.post("/api/saved-filters", json={
        "name": "My due",
        "object_type": "deal",
        "filters": {"view": "due_today"},
    })
    assert created.status_code == 201, created.text
    fid = created.json()["id"]
    listed = client.get("/api/saved-filters")
    assert listed.status_code == 200
    assert listed.json()["total"] == 1
    assert listed.json()["items"][0]["name"] == "My due"

    patched = client.patch(f"/api/saved-filters/{fid}", json={"name": "Due today"})
    assert patched.status_code == 200
    assert patched.json()["name"] == "Due today"

    other = create_company(db, name="Else", company_code="SFF")
    spy = create_active_user(db, email="spy@sff.com", role="admin", company_id=other.id)
    login_user(client, spy.email)
    assert client.get(f"/api/saved-filters/{fid}").status_code == 404
    assert client.delete(f"/api/saved-filters/{fid}").status_code == 404

    login_user(client, "admin@sfe.com")
    assert client.delete(f"/api/saved-filters/{fid}").status_code == 204
    assert client.get("/api/saved-filters").json()["total"] == 0


def test_saved_filter_rejects_unknown_keys(client, db):
    _admin(client, db, "SFG")
    resp = client.post("/api/saved-filters", json={
        "name": "Bad",
        "object_type": "deal",
        "filters": {"view": "due_today", "sql": "drop"},
    })
    assert resp.status_code == 400
