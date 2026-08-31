import pytest

from app.utils.rate_limit import auth_limiter
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_client, create_company, schedule_next_activity


@pytest.fixture(autouse=True)
def _reset_auth():
    auth_limiter._buckets.clear()
    yield


def _setup(client, db):
    company = create_company(db, name="BP", company_code="BP1")
    admin = create_active_user(db, email="admin@bp1.com", role="admin", company_id=company.id)
    create_active_user(db, email="sales@bp1.com", role="sales", company_id=company.id)
    login_user(client, admin.email)
    deal = client.post("/api/deals", json={"title": "Job", "amount": "0"}).json()
    schedule_next_activity(client, deal["id"])
    stages = client.get("/api/deals/stages", params={"pipeline_id": deal["pipeline_id"]}).json()["items"]
    opens = [s for s in stages if s["stage_type"] == "open"]
    won = next(s for s in stages if s["stage_type"] == "won")
    lost = next(s for s in stages if s["stage_type"] == "lost")
    return company, admin, deal, opens, won, lost


def test_enable_blueprint_blocks_skip_and_missing_fields(client, db):
    company, admin, deal, opens, won, _lost = _setup(client, db)
    pid = deal["pipeline_id"]
    assert client.patch(f"/api/deals/pipelines/{pid}", json={"blueprint_enabled": True}).status_code == 200
    first, second = opens[0], opens[1]
    skip = client.patch(f"/api/deals/{deal['id']}/stage", json={"stage_id": won["id"]})
    assert skip.status_code == 400
    assert skip.json()["detail"] == "blueprint does not allow this stage move"
    assert client.patch(
        f"/api/deals/stages/{first['id']}",
        json={"required_fields": ["amount", "expected_close"]},
    ).status_code == 200
    miss = client.patch(f"/api/deals/{deal['id']}/stage", json={"stage_id": second["id"]})
    assert miss.status_code == 400
    body = miss.json()["detail"]
    assert body["message"].startswith("missing required")
    assert set(body["missing_fields"]) == {"amount", "expected_close"}
    customer = create_client(db, company_id=company.id, name="Buyer", assigned_to_id=admin.id)
    assert client.patch(f"/api/deals/{deal['id']}", json={
        "amount": "500.00", "expected_close": "2026-10-01", "client_id": customer.id,
    }).status_code == 200
    ok = client.patch(f"/api/deals/{deal['id']}/stage", json={"stage_id": second["id"]})
    assert ok.status_code == 200, ok.text


def test_lost_from_mid_open_allowed(client, db):
    _company, _admin, deal, opens, _won, lost = _setup(client, db)
    pid = deal["pipeline_id"]
    assert client.patch(f"/api/deals/pipelines/{pid}", json={"blueprint_enabled": True}).status_code == 200
    first, second = opens[0], opens[1]
    assert client.patch(f"/api/deals/stages/{first['id']}", json={"required_fields": []}).status_code == 200
    assert client.patch(f"/api/deals/{deal['id']}/stage", json={"stage_id": second["id"]}).status_code == 200
    lost_move = client.patch(f"/api/deals/{deal['id']}/stage", json={"stage_id": lost["id"]})
    assert lost_move.status_code == 200, lost_move.text


def test_sales_cannot_toggle_or_edit_required_fields(client, db):
    _company, _admin, deal, opens, _won, _lost = _setup(client, db)
    pid = deal["pipeline_id"]
    first = opens[0]
    sales = create_active_user(db, email="sales2@bp1.com", role="sales", company_id=_company.id)
    login_user(client, sales.email)
    assert client.patch(f"/api/deals/pipelines/{pid}", json={"blueprint_enabled": True}).status_code == 403
    assert client.patch(
        f"/api/deals/stages/{first['id']}",
        json={"required_fields": ["amount"]},
    ).status_code == 403


def test_invalid_required_field_key(client, db):
    _company, _admin, deal, opens, _won, _lost = _setup(client, db)
    first = opens[0]
    resp = client.patch(f"/api/deals/stages/{first['id']}", json={"required_fields": ["nope"]})
    assert resp.status_code == 400
    assert resp.json()["detail"] == "invalid required field: nope"


def test_won_from_last_open_and_reopen_rules(client, db):
    _company, _admin, deal, opens, won, _lost = _setup(client, db)
    pid = deal["pipeline_id"]
    assert client.patch(f"/api/deals/pipelines/{pid}", json={"blueprint_enabled": True}).status_code == 200
    first, *_, last = opens
    for stage in opens:
        assert client.patch(
            f"/api/deals/stages/{stage['id']}",
            json={"required_fields": []},
        ).status_code == 200
    for next_stage in opens[1:]:
        move = client.patch(f"/api/deals/{deal['id']}/stage", json={"stage_id": next_stage["id"]})
        assert move.status_code == 200, move.text
    to_won = client.patch(f"/api/deals/{deal['id']}/stage", json={"stage_id": won["id"]})
    assert to_won.status_code == 200, to_won.text
    reopen = client.patch(f"/api/deals/{deal['id']}/stage", json={"stage_id": last["id"]})
    assert reopen.status_code == 200, reopen.text
    back_to_won = client.patch(f"/api/deals/{deal['id']}/stage", json={"stage_id": won["id"]})
    assert back_to_won.status_code == 200, back_to_won.text
    bad_reopen = client.patch(f"/api/deals/{deal['id']}/stage", json={"stage_id": first["id"]})
    assert bad_reopen.status_code == 400
    assert bad_reopen.json()["detail"] == "blueprint does not allow this stage move"


def test_board_includes_required_fields(client, db):
    _company, _admin, deal, opens, _won, _lost = _setup(client, db)
    first = opens[0]
    assert client.patch(
        f"/api/deals/stages/{first['id']}",
        json={"required_fields": ["amount", "client_id"]},
    ).status_code == 200
    board = client.get("/api/deals/board", params={"pipeline_id": deal["pipeline_id"]}).json()
    stage_block = next(s for s in board["stages"] if s["stage_id"] == first["id"])
    assert set(stage_block["required_fields"]) == {"amount", "client_id"}
