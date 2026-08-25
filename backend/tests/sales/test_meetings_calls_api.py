import pytest

from app.utils.rate_limit import auth_limiter
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company, create_client


@pytest.fixture(autouse=True)
def _reset_auth_rate_limit():
    auth_limiter._buckets.clear()
    yield


def _company_with_admin(db, code="C1"):
    company = create_company(db, name=f"Co {code}", company_code=code)
    admin = create_active_user(db, email=f"admin@{code}.com", role="admin", company_id=company.id)
    return company, admin


def _lead_id(client):
    resp = client.post("/api/leads", json={"name": "Ravi"})
    assert resp.status_code in (200, 201), resp.text
    return resp.json()["id"]


def test_create_meeting_requires_parent(client, db):
    _, admin = _company_with_admin(db)
    login_user(client, admin.email)
    resp = client.post("/api/meetings", json={
        "subject": "No parent",
        "starts_at": "2026-09-01T10:00:00Z",
    })
    assert resp.status_code == 400


def test_create_meeting_rejects_foreign_company_lead(client, db):
    _, admin = _company_with_admin(db)
    other = create_company(db, name="Other", company_code="C2")
    other_admin = create_active_user(db, email="admin@c2.com", role="admin", company_id=other.id)
    login_user(client, other_admin.email)
    foreign_lead = _lead_id(client)
    client.headers.pop("Authorization", None)
    login_user(client, admin.email)
    resp = client.post("/api/meetings", json={
        "subject": "leak",
        "starts_at": "2026-09-01T10:00:00Z",
        "lead_id": foreign_lead,
    })
    assert resp.status_code == 400


def test_create_meeting_rejects_ends_before_start(client, db):
    _, admin = _company_with_admin(db)
    login_user(client, admin.email)
    lead_id = _lead_id(client)
    resp = client.post("/api/meetings", json={
        "subject": "Bad times",
        "starts_at": "2026-09-01T10:00:00Z",
        "ends_at": "2026-09-01T09:00:00Z",
        "lead_id": lead_id,
    })
    assert resp.status_code == 400


def test_meeting_list_get_patch_delete_roundtrip(client, db):
    _, admin = _company_with_admin(db)
    login_user(client, admin.email)
    lead_id = _lead_id(client)
    created = client.post("/api/meetings", json={
        "subject": "Site visit",
        "starts_at": "2026-09-01T10:00:00Z",
        "location": "https://meet.example/x",
        "lead_id": lead_id,
    })
    assert created.status_code == 201, created.text
    body = created.json()
    mid = body["id"]
    assert body["subject"] == "Site visit"
    assert body["status"] == "scheduled"
    assert body["lead_id"] == lead_id

    listed = client.get("/api/meetings", params={"lead_id": lead_id})
    assert listed.status_code == 200
    assert listed.json()["total"] == 1
    assert client.get(f"/api/meetings/{mid}").json()["subject"] == "Site visit"

    patched = client.patch(f"/api/meetings/{mid}", json={"status": "completed"})
    assert patched.status_code == 200
    assert patched.json()["status"] == "completed"

    deleted = client.delete(f"/api/meetings/{mid}")
    assert deleted.status_code in (200, 204)
    assert client.get(f"/api/meetings/{mid}").status_code == 404


def test_create_call_requires_direction_and_parent(client, db):
    _, admin = _company_with_admin(db)
    login_user(client, admin.email)
    lead_id = _lead_id(client)
    missing_dir = client.post("/api/calls", json={"lead_id": lead_id})
    assert missing_dir.status_code == 422
    missing_parent = client.post("/api/calls", json={"direction": "outbound"})
    assert missing_parent.status_code == 400


def test_create_call_rejects_negative_duration(client, db):
    _, admin = _company_with_admin(db)
    login_user(client, admin.email)
    lead_id = _lead_id(client)
    resp = client.post("/api/calls", json={
        "direction": "outbound",
        "duration_seconds": -1,
        "lead_id": lead_id,
    })
    assert resp.status_code == 400


def test_call_roundtrip_and_deal_parent(client, db):
    _, admin = _company_with_admin(db)
    login_user(client, admin.email)
    deal = client.post("/api/deals", json={"title": "Roof", "amount": "100"}).json()
    created = client.post("/api/calls", json={
        "direction": "inbound",
        "duration_seconds": 120,
        "outcome": "Left voicemail",
        "deal_id": deal["id"],
    })
    assert created.status_code == 201, created.text
    cid = created.json()["id"]
    assert created.json()["direction"] == "inbound"
    listed = client.get("/api/calls", params={"deal_id": deal["id"]})
    assert listed.json()["total"] == 1
    patched = client.patch(f"/api/calls/{cid}", json={"notes": "Will retry Friday"})
    assert patched.status_code == 200
    assert patched.json()["notes"] == "Will retry Friday"
    assert client.delete(f"/api/calls/{cid}").status_code in (200, 204)


def test_call_on_client_parent(client, db):
    company, admin = _company_with_admin(db)
    login_user(client, admin.email)
    row = create_client(db, company_id=company.id, name="Acme", assigned_to_id=admin.id)
    resp = client.post("/api/calls", json={
        "direction": "outbound",
        "client_id": row.id,
    })
    assert resp.status_code == 201, resp.text
    assert resp.json()["client_id"] == row.id
