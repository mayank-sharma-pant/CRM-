"""OAuth HTTP API."""

from urllib.parse import parse_qs, urlparse

import pytest

from app.config import settings
from app.services.auth.oauth import OAuthProfile, make_state
from app.utils.rate_limit import auth_limiter
from tests.helpers.auth import create_active_user
from tests.helpers.factories import create_company


@pytest.fixture(autouse=True)
def _reset():
    auth_limiter._buckets.clear()
    yield
    auth_limiter._buckets.clear()
    settings.GOOGLE_OAUTH_CLIENT_ID = ""
    settings.GOOGLE_OAUTH_CLIENT_SECRET = ""
    settings.MICROSOFT_OAUTH_CLIENT_ID = ""
    settings.MICROSOFT_OAUTH_CLIENT_SECRET = ""


def test_providers_endpoint(client):
    res = client.get("/api/auth/oauth/providers")
    assert res.status_code == 200
    assert res.json() == {"google": False, "microsoft": False}


def test_start_unconfigured_503(client):
    res = client.get("/api/auth/oauth/google/start", follow_redirects=False)
    assert res.status_code == 503


def test_start_redirects_when_configured(client):
    settings.GOOGLE_OAUTH_CLIENT_ID = "gid"
    settings.GOOGLE_OAUTH_CLIENT_SECRET = "gsecret"
    res = client.get("/api/auth/oauth/google/start", follow_redirects=False)
    assert res.status_code == 302
    loc = res.headers["location"]
    assert "accounts.google.com" in loc
    assert "client_id=gid" in loc


def test_callback_success_sets_cookie(client, db, monkeypatch):
    settings.GOOGLE_OAUTH_CLIENT_ID = "gid"
    settings.GOOGLE_OAUTH_CLIENT_SECRET = "gsecret"
    settings.FRONTEND_URL = "http://frontend.test"

    company = create_company(db, name="OAuth Co", company_code="OA1")
    user = create_active_user(db, email="oauth@oa1.com", role="admin", company_id=company.id)

    def fake_fetch(provider, code):
        assert provider == "google"
        assert code == "good-code"
        return OAuthProfile(provider="google", subject="sub-oa1", email="oauth@oa1.com")

    monkeypatch.setattr("app.routers.auth.oauth.fetch_profile", fake_fetch)

    state = make_state("google")
    res = client.get(
        "/api/auth/oauth/google/callback",
        params={"code": "good-code", "state": state},
        follow_redirects=False,
    )
    assert res.status_code == 302
    assert res.headers["location"] == "http://frontend.test/login?oauth=success"
    assert "access_token" in res.headers.get("set-cookie", "")

    # Session works
    client.cookies.set("access_token", res.cookies["access_token"])
    me = client.get("/api/auth/me")
    assert me.status_code == 200
    assert me.json()["email"] == user.email


def test_callback_no_account_redirect(client, db, monkeypatch):
    settings.GOOGLE_OAUTH_CLIENT_ID = "gid"
    settings.GOOGLE_OAUTH_CLIENT_SECRET = "gsecret"
    settings.FRONTEND_URL = "http://frontend.test"

    monkeypatch.setattr(
        "app.routers.auth.oauth.fetch_profile",
        lambda provider, code: OAuthProfile(provider="google", subject="x", email="missing@x.com"),
    )
    state = make_state("google")
    res = client.get(
        "/api/auth/oauth/google/callback",
        params={"code": "c", "state": state},
        follow_redirects=False,
    )
    assert res.status_code == 302
    assert "oauth_error=no_account" in res.headers["location"]


def test_callback_mfa_redirect(client, db, monkeypatch):
    settings.GOOGLE_OAUTH_CLIENT_ID = "gid"
    settings.GOOGLE_OAUTH_CLIENT_SECRET = "gsecret"
    settings.FRONTEND_URL = "http://frontend.test"

    company = create_company(db, name="MFA Co", company_code="OM1")
    user = create_active_user(db, email="mfa@om1.com", role="admin", company_id=company.id)
    user.totp_enabled = True
    user.totp_secret = "x" * 32
    db.commit()

    monkeypatch.setattr(
        "app.routers.auth.oauth.fetch_profile",
        lambda provider, code: OAuthProfile(provider="google", subject="mfa-sub", email="mfa@om1.com"),
    )
    state = make_state("google")
    res = client.get(
        "/api/auth/oauth/google/callback",
        params={"code": "c", "state": state},
        follow_redirects=False,
    )
    assert res.status_code == 302
    loc = res.headers["location"]
    assert "mfa_required=1" in loc
    qs = parse_qs(urlparse(loc).query)
    assert qs.get("mfa_token")
