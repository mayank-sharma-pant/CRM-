from app.utils.rate_limit import auth_limiter
from app.utils import totp
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


def _password_login(client, email="v@x.co", password="pw"):
    auth_limiter._buckets.clear()
    return client.post(
        "/api/auth/login",
        data={"username": email, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )


def _make_enrolled(client, db, email="v@x.co"):
    company = create_company(db, name="V Co", company_code="VCO")
    create_active_user(db, email=email, role="admin", company_id=company.id)
    login_user(client, email)
    secret = client.post("/api/auth/2fa/setup").json()["secret"]
    codes = client.post("/api/auth/2fa/confirm", json={"code": totp.totp_now(secret)}).json()["recovery_codes"]
    client.headers.pop("Authorization", None)
    return company, secret, codes


def test_non_2fa_login_unchanged(client, db):
    company = create_company(db, name="Plain", company_code="PLN")
    create_active_user(db, email="plain@x.co", role="admin", company_id=company.id)
    body = _password_login(client, "plain@x.co").json()
    assert body["access_token"] and body["refresh_token"]
    assert "mfa_required" not in body or body["mfa_required"] in (None, False)


def test_enrolled_login_returns_challenge_not_tokens(client, db):
    _make_enrolled(client, db)
    body = _password_login(client).json()
    assert body["mfa_required"] is True
    assert body["mfa_token"]
    assert body.get("access_token") in (None, "")


def test_verify_with_totp_issues_tokens(client, db):
    _, secret, _ = _make_enrolled(client, db)
    mfa_token = _password_login(client).json()["mfa_token"]
    r = client.post("/api/auth/2fa/verify", json={"mfa_token": mfa_token, "code": totp.totp_now(secret)})
    assert r.status_code == 200, r.text
    assert r.json()["access_token"] and r.json()["refresh_token"]


def test_verify_with_wrong_code_401(client, db):
    _make_enrolled(client, db)
    mfa_token = _password_login(client).json()["mfa_token"]
    r = client.post("/api/auth/2fa/verify", json={"mfa_token": mfa_token, "code": "000000"})
    assert r.status_code == 401


def test_recovery_code_single_use(client, db):
    _, _, codes = _make_enrolled(client, db)
    mfa_token = _password_login(client).json()["mfa_token"]
    r1 = client.post("/api/auth/2fa/verify", json={"mfa_token": mfa_token, "code": codes[0]})
    assert r1.status_code == 200, r1.text
    mfa_token2 = _password_login(client).json()["mfa_token"]
    r2 = client.post("/api/auth/2fa/verify", json={"mfa_token": mfa_token2, "code": codes[0]})
    assert r2.status_code == 401


def test_mandate_forces_setup(client, db):
    company = create_company(db, name="Mand", company_code="MND", status="active")
    company.require_2fa = True
    db.commit()
    create_active_user(db, email="mand@x.co", role="admin", company_id=company.id)
    body = _password_login(client, "mand@x.co").json()
    assert body["mfa_setup_required"] is True
    assert body["setup_token"]
    assert body.get("access_token") in (None, "")
