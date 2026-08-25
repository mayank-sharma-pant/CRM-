from app.utils.rate_limit import auth_limiter
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


def test_mandate_is_scoped_to_own_company(client, db):
    auth_limiter._buckets.clear()
    a = create_company(db, name="A Co", company_code="ACO")
    b = create_company(db, name="B Co", company_code="BCO")
    create_active_user(db, email="a-admin@x.co", role="admin", company_id=a.id)
    create_active_user(db, email="b-admin@x.co", role="admin", company_id=b.id)

    # B's admin sets a mandate — must affect only B, never A.
    login_user(client, "b-admin@x.co")
    r = client.patch("/api/company/security", json={"require_2fa": True})
    assert r.status_code == 200
    db.expire_all()
    from app.models.core.company import Company
    assert db.query(Company).filter(Company.id == a.id).first().require_2fa is False
    assert db.query(Company).filter(Company.id == b.id).first().require_2fa is True


def test_status_is_per_user(client, db):
    auth_limiter._buckets.clear()
    a = create_company(db, name="A2", company_code="AC2")
    create_active_user(db, email="a1@x.co", role="admin", company_id=a.id)
    create_active_user(db, email="a2@x.co", role="sales", company_id=a.id)

    # Set a1's 2FA to enabled as a positive control
    from datetime import datetime, timezone
    from app.models.core.user import User
    a1_user = db.query(User).filter(User.email == "a1@x.co").first()
    a1_user.totp_enabled = True
    a1_user.totp_confirmed_at = datetime.now(timezone.utc)
    db.commit()

    # Verify a1 is actually enabled (positive control)
    assert a1_user.totp_enabled is True

    # Log in as a2 (who has totp_enabled=False)
    login_user(client, "a2@x.co")

    # a2 sees their own disabled status — not a1's enabled status (isolation check)
    assert client.get("/api/auth/2fa/status").json()["enabled"] is False
