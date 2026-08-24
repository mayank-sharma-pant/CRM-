"""get_current_user must let non-expired trial companies through and block expired ones.

Login already allows trial companies (auth._check_company_status). But every
authenticated request also passes through get_current_user, which previously
only allowed company_status == "active" — so a trial user could log in and then
get 403'd on every subsequent API call. These tests pin that gate.
"""

from datetime import datetime, timedelta, timezone

import pytest

from app.utils.rate_limit import auth_limiter
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


@pytest.fixture(autouse=True)
def _reset_auth_rate_limit():
    auth_limiter._buckets.clear()
    yield


def test_trial_company_user_can_access_authenticated_endpoint(db, client):
    company = create_company(db, name="Trial Co", company_code="TRC")
    company.status = "trial"
    company.trial_ends_at = datetime.now(timezone.utc) + timedelta(days=7)
    db.commit()

    create_active_user(
        db, email="admin@trialco.com", role="admin", company_id=company.id, full_name="Trial Admin"
    )
    login_user(client, "admin@trialco.com")

    resp = client.get("/api/auth/me")
    assert resp.status_code == 200, resp.text


def test_expired_trial_company_user_blocked(db, client):
    company = create_company(db, name="Expired Trial Co", company_code="ETC")
    company.status = "trial"
    company.trial_ends_at = datetime.now(timezone.utc) - timedelta(days=1)
    db.commit()

    create_active_user(
        db, email="admin@expiredtrial.com", role="admin", company_id=company.id, full_name="Expired Admin"
    )

    login_resp = client.post(
        "/api/auth/login",
        data={"username": "admin@expiredtrial.com", "password": "pw"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )

    if login_resp.status_code == 200:
        token = login_resp.json()["access_token"]
        client.headers["Authorization"] = f"Bearer {token}"
        resp = client.get("/api/auth/me")
        assert resp.status_code == 403, resp.text
    else:
        assert login_resp.status_code != 200
