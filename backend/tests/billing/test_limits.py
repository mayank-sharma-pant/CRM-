from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException
from app.services.billing.seed import seed_plans
from app.services.billing.limits import assert_can_add_user, current_seat_usage
from app.models.billing import Plan, Subscription
from app.models.core.invite import Invite, InviteStatus
from tests.helpers.factories import create_company
from tests.helpers.auth import create_active_user, login_user


def _company_on_plan(db, max_users):
    seed_plans(db)
    plan = db.query(Plan).filter(Plan.name == "Starter").one()
    plan.max_users = max_users
    company = create_company(db, name="Seat Co", company_code="SEA", status="active")
    db.add(Subscription(company_id=company.id, plan_id=plan.id, status="active"))
    db.commit()
    return company


def test_seat_usage_counts_users_and_pending_invites(db):
    company = _company_on_plan(db, max_users=5)
    create_active_user(db, email="u1@seat.com", role="admin", company_id=company.id)
    db.add(Invite(company_id=company.id, email="p1@seat.com", full_name="P1", role="sales",
                  token="tok1", hashed_password="x", status=InviteStatus.PENDING,
                  expires_at=datetime.now(timezone.utc) + timedelta(days=7)))
    db.commit()
    assert current_seat_usage(db, company.id) == 2


def test_add_user_blocked_at_limit(db):
    company = _company_on_plan(db, max_users=1)
    create_active_user(db, email="u1@seat.com", role="admin", company_id=company.id)  # fills the 1 seat
    with pytest.raises(HTTPException) as exc:
        assert_can_add_user(db, company.id)
    assert exc.value.status_code == 402
    assert exc.value.detail["limit"] == 1


def test_create_invite_returns_402_at_seat_limit(db, client):
    company = _company_on_plan(db, max_users=1)
    create_active_user(db, email="owner@seat.com", role="admin", company_id=company.id)  # seat 1 of 1
    login_user(client, "owner@seat.com")
    resp = client.post("/api/admin/invites", json={
        "email": "new@seat.com", "full_name": "New", "phone": "9999999999", "role": "sales",
    })
    assert resp.status_code == 402, resp.text
    assert resp.json()["detail"]["upgrade_path"]
