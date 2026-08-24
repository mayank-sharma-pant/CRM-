from tests.helpers.auth import create_active_user
from app.services.billing.seed import seed_plans
from app.models.billing import Plan


def login_platform_admin(client, email: str, password: str = "pw"):
    """Platform-admin routes require an 'aud=platform' token from the platform
    login endpoint — the generic /api/auth/login token (aud=crm) is rejected."""
    resp = client.post(
        "/api/platform/auth/login",
        data={"username": email, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert resp.status_code == 200, f"Platform login failed for {email}: {resp.text}"
    token = resp.json()["access_token"]
    client.headers["Authorization"] = f"Bearer {token}"
    return resp


def test_get_plans_reads_table(db, client):
    seed_plans(db)
    seeded_starter = db.query(Plan).filter(Plan.name == "Starter").one()
    create_active_user(db, email="pa@root.com", role="admin", company_id=None, full_name="Platform Admin")
    login_platform_admin(client, "pa@root.com")
    resp = client.get("/api/platform/plans")
    assert resp.status_code == 200
    plans = resp.json()["plans"]
    names = [p["name"] for p in plans]
    assert set(names) == {"Starter", "Growth", "Enterprise"}

    starter = next(p for p in plans if p["name"] == "Starter")
    # These only hold for the DB-backed response — the old hardcoded literal
    # used id=1 (not the DB-assigned id) and had no "currency" key.
    assert starter["id"] == seeded_starter.id
    assert starter["currency"] == "INR"


def test_platform_admin_can_edit_plan(db, client):
    seed_plans(db)
    starter = db.query(Plan).filter(Plan.name == "Starter").one()
    create_active_user(db, email="pa@root.com", role="admin", company_id=None, full_name="Platform Admin")
    login_platform_admin(client, "pa@root.com")
    resp = client.patch(f"/api/platform/plans/{starter.id}", json={"max_users": 25})
    assert resp.status_code == 200
    db.expire_all()
    assert db.query(Plan).filter(Plan.id == starter.id).one().max_users == 25
