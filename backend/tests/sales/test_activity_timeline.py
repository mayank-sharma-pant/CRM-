"""Unified activity feed for lead / client / deal."""
from unittest.mock import patch

import pytest

from app.utils.rate_limit import auth_limiter
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


@pytest.fixture(autouse=True)
def _reset():
    auth_limiter._buckets.clear()
    yield


def _admin(client, db, code="TL1"):
    company = create_company(db, name=f"Tl {code}", company_code=code)
    admin = create_active_user(db, email=f"admin@{code.lower()}.com", role="admin", company_id=company.id)
    login_user(client, admin.email)
    return company, admin


@patch("app.services.sales.crm_email.send_email", return_value=True)
def test_lead_timeline_unions_email_meeting_call_note(mock_send, client, db):
    _admin(client, db, "TLA")
    lead_id = client.post("/api/leads", json={"name": "Ravi", "email": "ravi@x.com"}).json()["id"]
    client.post("/api/emails", json={"lead_id": lead_id, "subject": "Hi", "body": "Hello"})
    client.post("/api/meetings", json={
        "subject": "Visit", "starts_at": "2026-09-01T10:00:00Z", "lead_id": lead_id,
    })
    client.post("/api/calls", json={"direction": "outbound", "lead_id": lead_id, "outcome": "VM"})
    note_res = client.post(f"/api/leads/{lead_id}/notes", params={"content": "Site notes"})
    assert note_res.status_code == 201, note_res.text

    res = client.get(f"/api/timeline/lead/{lead_id}")
    assert res.status_code == 200, res.text
    kinds = {i["kind"] for i in res.json()["items"]}
    assert {"email", "meeting", "call", "note"} <= kinds
    assert res.json()["total"] >= 4
    assert res.json()["items"][0]["occurred_at"]


@patch("app.services.sales.crm_email.send_email", return_value=True)
def test_deal_timeline_includes_deal_email(mock_send, client, db):
    _admin(client, db, "TLB")
    deal_id = client.post("/api/deals", json={"title": "Roof", "amount": "100"}).json()["id"]
    client.post("/api/emails", json={
        "deal_id": deal_id, "to_email": "buyer@x.com", "subject": "Quote", "body": "See quote",
    })
    res = client.get(f"/api/timeline/deal/{deal_id}")
    assert res.status_code == 200
    kinds = [i["kind"] for i in res.json()["items"]]
    assert "email" in kinds


def test_timeline_unknown_entity_400(client, db):
    _admin(client, db, "TLC")
    assert client.get("/api/timeline/widget/1").status_code == 400


def test_timeline_cross_tenant_404(client, db):
    _admin(client, db, "TLD")
    lead_id = client.post("/api/leads", json={"name": "A"}).json()["id"]
    other = create_company(db, name="B", company_code="TLE")
    create_active_user(db, email="admin@tle.com", role="admin", company_id=other.id)
    login_user(client, "admin@tle.com")
    assert client.get(f"/api/timeline/lead/{lead_id}").status_code == 404


def test_timeline_missing_lead_404(client, db):
    _admin(client, db, "TLF")
    assert client.get("/api/timeline/lead/999999").status_code == 404
