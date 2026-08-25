"""Meetings and call logs must obey the Phase-0 gate: company B cannot
read/mutate/delete company A's row by id. Each denial is paired with a
positive control so a 404 proves company scope, not a missing row."""

import pytest

from app.utils.rate_limit import auth_limiter
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company

NO_ACCESS = (403, 404)


@pytest.fixture(autouse=True)
def _reset_auth_rate_limit():
    auth_limiter._buckets.clear()
    yield


@pytest.fixture()
def two_companies_with_activity(client, db):
    a = create_company(db, name="A", company_code="COA")
    b = create_company(db, name="B", company_code="COB")
    create_active_user(db, email="admin@a.com", role="admin", company_id=a.id)
    create_active_user(db, email="admin@b.com", role="admin", company_id=b.id)
    login_user(client, "admin@a.com")
    lead_id = client.post("/api/leads", json={"name": "A lead"}).json()["id"]
    meeting = client.post("/api/meetings", json={
        "subject": "A meeting",
        "starts_at": "2026-09-01T10:00:00Z",
        "lead_id": lead_id,
    }).json()
    call = client.post("/api/calls", json={
        "direction": "outbound",
        "lead_id": lead_id,
    }).json()
    client.headers.pop("Authorization", None)
    return meeting["id"], call["id"], "admin@b.com"


def test_owner_can_read_and_mutate_own_meeting_and_call(client, two_companies_with_activity):
    meeting_id, call_id, _ = two_companies_with_activity
    login_user(client, "admin@a.com")
    assert client.get(f"/api/meetings/{meeting_id}").status_code == 200
    assert client.patch(f"/api/meetings/{meeting_id}", json={"notes": "ok"}).status_code == 200
    assert client.get(f"/api/calls/{call_id}").status_code == 200
    assert client.patch(f"/api/calls/{call_id}", json={"notes": "ok"}).status_code == 200


@pytest.mark.parametrize("path", [
    "/api/meetings/{meeting_id}",
    "/api/calls/{call_id}",
])
def test_cross_tenant_read_denied(client, two_companies_with_activity, path):
    meeting_id, call_id, admin_b = two_companies_with_activity
    login_user(client, admin_b)
    url = path.format(meeting_id=meeting_id, call_id=call_id)
    assert client.get(url).status_code in NO_ACCESS


def test_cross_tenant_patch_denied(client, two_companies_with_activity):
    meeting_id, call_id, admin_b = two_companies_with_activity
    login_user(client, admin_b)
    assert client.patch(f"/api/meetings/{meeting_id}", json={"notes": "x"}).status_code in NO_ACCESS
    assert client.patch(f"/api/calls/{call_id}", json={"notes": "x"}).status_code in NO_ACCESS


def test_cross_tenant_delete_denied(client, two_companies_with_activity):
    meeting_id, call_id, admin_b = two_companies_with_activity
    login_user(client, admin_b)
    assert client.delete(f"/api/meetings/{meeting_id}").status_code in NO_ACCESS
    assert client.delete(f"/api/calls/{call_id}").status_code in NO_ACCESS
