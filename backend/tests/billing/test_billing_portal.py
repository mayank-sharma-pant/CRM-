from datetime import datetime, timezone, timedelta
from app.services.billing.seed import seed_plans
from app.models.billing import Plan, Subscription
from app.models.core.invite import Invite, InviteStatus
from tests.helpers.factories import create_company
from tests.helpers.auth import create_active_user, login_user


def _company_with_sub(db, status="trialing"):
    seed_plans(db)
    company = create_company(db, name="Portal Co", company_code="PCO", status="active")
    plan = db.query(Plan).filter(Plan.name == "Starter").one()
    db.add(Subscription(company_id=company.id, plan_id=plan.id, status=status)); db.commit()
    return company


def test_get_subscription_returns_plan_and_limits(db, client):
    company = _company_with_sub(db)
    create_active_user(db, email="admin@portal.com", role="admin", company_id=company.id)
    login_user(client, "admin@portal.com")
    resp = client.get("/api/billing/subscription")
    assert resp.status_code == 200
    body = resp.json()
    assert body["plan"]["name"] == "Starter"
    assert body["status"] == "trialing"
    assert body["limits"]["max_users"] == 10


def test_get_subscription_usage_matches_enforced_seat_count(db, client):
    """Portal usage must match current_seat_usage (active users + pending
    invites) — the same number assert_can_add_user enforces — so the portal
    never shows headroom that the 402 guard disagrees with.
    """
    company = _company_with_sub(db)
    create_active_user(db, email="admin2@portal.com", role="admin", company_id=company.id)
    login_user(client, "admin2@portal.com")
    db.add(Invite(
        company_id=company.id, email="pending@portal.com", full_name="Pending Invitee",
        role="sales", status=InviteStatus.PENDING, token="tok-portal-1",
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
    ))
    db.commit()

    resp = client.get("/api/billing/subscription")
    assert resp.status_code == 200
    assert resp.json()["usage"]["users"] == 2  # 1 active admin + 1 pending invite


def test_checkout_returns_provider_handle(db, client):
    company = _company_with_sub(db)
    create_active_user(db, email="admin@portal.com", role="admin", company_id=company.id)
    login_user(client, "admin@portal.com")
    resp = client.post("/api/billing/checkout", json={"plan_id": db.query(Plan).filter(Plan.name == "Growth").one().id})
    assert resp.status_code == 200
    assert "subscription_id" in resp.json()
