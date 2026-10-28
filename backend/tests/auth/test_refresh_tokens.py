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


def test_logout_invalidates_access_token(client, db):
    login = _login(client, db, email="kill@rt.co")
    access = login.json()["access_token"]
    refresh = login.json()["refresh_token"]
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {access}"})
    assert me.status_code == 200, me.text
    logout = client.post("/api/auth/logout", json={"refresh_token": refresh})
    assert logout.status_code == 200
    dead = client.get("/api/auth/me", headers={"Authorization": f"Bearer {access}"})
    assert dead.status_code == 401, "logout must kill the access JWT immediately"


def test_refresh_with_invalid_token_is_401(client, db):
    _login(client, db)
    resp = client.post("/api/auth/refresh", json={"refresh_token": "not-a-real-token"})
    assert resp.status_code == 401


def test_refresh_deletes_only_the_users_long_expired_tokens(client, db):
    from datetime import datetime, timedelta, timezone

    from app.models.core.refresh_token import RefreshToken
    from app.models.core.user import User

    login = _login(client, db)
    user = db.query(User).filter(User.email == "user@rt.co").one()
    other = create_active_user(db, email="other@rt.co", role="admin", company_id=user.company_id, full_name="Other")
    now = datetime.now(timezone.utc)
    for owner, token_hash, expires_at in (
        (user.id, "a" * 64, now - timedelta(days=3)),
        (user.id, "b" * 64, now - timedelta(hours=2)),
        (other.id, "c" * 64, now - timedelta(days=3)),
    ):
        db.add(RefreshToken(user_id=owner, token_hash=token_hash, expires_at=expires_at))
    db.commit()

    resp = client.post("/api/auth/refresh", json={"refresh_token": login.json()["refresh_token"]})
    assert resp.status_code == 200, resp.text

    db.expire_all()
    left = {row.token_hash for row in db.query(RefreshToken).all()}
    assert "a" * 64 not in left, "a token expired days ago is deleted"
    assert "b" * 64 in left, "a recently expired token is kept"
    assert "c" * 64 in left, "other users' tokens are untouched"
    assert len([h for h in left if h not in {"b" * 64, "c" * 64}]) == 2, "the rotated and the new token remain"
