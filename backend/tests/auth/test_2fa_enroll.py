from app.utils.rate_limit import auth_limiter
from app.utils import totp
from app.utils.totp_crypto import decrypt_secret
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


def _enrolled_login(client, db, email="u@x.co", require_2fa=False):
    auth_limiter._buckets.clear()
    company = create_company(db, name="X Co", company_code="XCO")
    if require_2fa:
        company.require_2fa = True
        db.commit()
    create_active_user(db, email=email, role="admin", company_id=company.id)
    login_user(client, email)  # sets Bearer header
    return company


def test_setup_returns_uri_and_stores_encrypted_secret(client, db):
    _enrolled_login(client, db)
    r = client.post("/api/auth/2fa/setup")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["otpauth_uri"].startswith("otpauth://totp/")
    assert body["secret"]
    # stored secret is encrypted, not the plaintext
    from app.models.core.user import User
    user = db.query(User).filter(User.email == "u@x.co").first()
    assert user.totp_secret and user.totp_secret != body["secret"]
    assert decrypt_secret(user.totp_secret) == body["secret"]
    assert user.totp_enabled is False


def test_confirm_enables_and_returns_recovery_codes(client, db):
    _enrolled_login(client, db)
    secret = client.post("/api/auth/2fa/setup").json()["secret"]
    code = totp.totp_now(secret)
    r = client.post("/api/auth/2fa/confirm", json={"code": code})
    assert r.status_code == 200, r.text
    codes = r.json()["recovery_codes"]
    assert len(codes) == 10
    status = client.get("/api/auth/2fa/status").json()
    assert status["enabled"] is True and status["recovery_codes_remaining"] == 10


def test_confirm_rejects_bad_code(client, db):
    _enrolled_login(client, db)
    client.post("/api/auth/2fa/setup")
    r = client.post("/api/auth/2fa/confirm", json={"code": "000000"})
    assert r.status_code == 400


def test_disable_requires_password_and_clears(client, db):
    _enrolled_login(client, db)
    secret = client.post("/api/auth/2fa/setup").json()["secret"]
    client.post("/api/auth/2fa/confirm", json={"code": totp.totp_now(secret)})
    r = client.post("/api/auth/2fa/disable", json={"password": "pw"})
    assert r.status_code == 200, r.text
    assert client.get("/api/auth/2fa/status").json()["enabled"] is False


def test_disable_blocked_under_mandate(client, db):
    # Enroll with a REAL session first (company not yet mandated), then turn
    # the mandate on. This is the only path a legitimate user can take —
    # the setup_token challenge cannot itself authenticate protected
    # endpoints (see get_current_user's "crm" audience enforcement).
    company = _enrolled_login(client, db, require_2fa=False)
    secret = client.post("/api/auth/2fa/setup").json()["secret"]
    client.post("/api/auth/2fa/confirm", json={"code": totp.totp_now(secret)})

    company.require_2fa = True
    db.commit()

    r = client.post("/api/auth/2fa/disable", json={"password": "pw"})
    assert r.status_code == 403


def test_confirm_is_rate_limited(client, db):
    _enrolled_login(client, db)
    client.post("/api/auth/2fa/setup")
    auth_limiter._buckets.clear()
    for _ in range(10):
        r = client.post("/api/auth/2fa/confirm", json={"code": "000000"})
        assert r.status_code == 400
    r = client.post("/api/auth/2fa/confirm", json={"code": "000000"})
    assert r.status_code == 429
