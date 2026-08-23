"""Refresh-token rotation, reuse detection, and logout revocation (Phase 0.4)."""

from app.utils.rate_limit import auth_limiter
from tests.helpers.auth import create_active_user
from tests.helpers.factories import create_company


def _login(client, db, email="user@rt.co"):
    auth_limiter._buckets.clear()
    company = create_company(db, name="RT Co", company_code="RTC")
    create_active_user(db, email=email, role="admin", company_id=company.id, full_name="RT User")
    resp = client.post(
        "/api/auth/login",
        data={"username": email, "password": "pw"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert resp.status_code == 200, resp.text
    return resp


def test_login_issues_refresh_token(client, db):
    resp = _login(client, db)
    body = resp.json()
    assert body.get("refresh_token"), "login must return a refresh_token"
    assert "refresh_token" in resp.cookies, "login must set a refresh_token cookie"


def test_refresh_rotates_and_returns_new_tokens(client, db):
    login = _login(client, db)
    r1 = login.json()["refresh_token"]

    resp = client.post("/api/auth/refresh", json={"refresh_token": r1})
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["refresh_token"] and body["refresh_token"] != r1, "refresh token must rotate"

    # The returned access token must be usable (assert the property, not byte-equality —
    # two tokens minted in the same second are legitimately identical).
    new_access = body["access_token"]
    assert new_access
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {new_access}"})
    assert me.status_code == 200, me.text


def test_rotated_token_reuse_is_detected_and_revokes_all(client, db):
    login = _login(client, db)
    r1 = login.json()["refresh_token"]

    rotate = client.post("/api/auth/refresh", json={"refresh_token": r1})
    r2 = rotate.json()["refresh_token"]

    # Reusing the already-rotated R1 is a theft signal: it must fail...
    reuse = client.post("/api/auth/refresh", json={"refresh_token": r1})
    assert reuse.status_code == 401

    # ...and it must revoke the whole chain, so the live R2 no longer works.
    after = client.post("/api/auth/refresh", json={"refresh_token": r2})
    assert after.status_code == 401, "reuse detection must revoke all of the user's refresh tokens"


def test_logout_revokes_refresh_token(client, db):
    login = _login(client, db)
    r1 = login.json()["refresh_token"]

    logout = client.post("/api/auth/logout", json={"refresh_token": r1})
    assert logout.status_code == 200

    resp = client.post("/api/auth/refresh", json={"refresh_token": r1})
    assert resp.status_code == 401, "a revoked refresh token must not refresh"


def test_refresh_with_invalid_token_is_401(client, db):
    _login(client, db)
    resp = client.post("/api/auth/refresh", json={"refresh_token": "not-a-real-token"})
    assert resp.status_code == 401
