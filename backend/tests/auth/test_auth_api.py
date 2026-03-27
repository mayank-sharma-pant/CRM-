from datetime import datetime, timedelta, timezone

from app.models.core.invite import Invite, InviteStatus
from app.routers.auth import auth as auth_router
from tests.helpers.auth import create_active_user
from tests.helpers.factories import create_company


def test_login_success(client, db):
    create_active_user(
        db,
        email="test@example.com",
        role="admin",
        full_name="Test User",
        password="testpassword123",
    )

    response = client.post(
        "/api/auth/login",
        data={"username": "test@example.com", "password": "testpassword123"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )

    assert response.status_code == 200
    assert "access_token" in response.cookies
    assert response.json()["user"]["email"] == "test@example.com"

    me_response = client.get("/api/users/me")
    assert me_response.status_code == 200
    assert me_response.json()["email"] == "test@example.com"


def test_login_invalid_credentials(client, db):
    response = client.post(
        "/api/auth/login",
        data={"username": "wrong@example.com", "password": "wrongpassword"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )

    assert response.status_code == 401
    assert "Incorrect email or password" in response.json()["detail"]


def test_logout(client):
    client.cookies.set("access_token", "dummy_token")
    response = client.post("/api/auth/logout")
    assert response.status_code == 200

    set_cookie_headers = [h for h in response.headers.get_list("set-cookie")]
    assert any("access_token=;" in h or 'access_token=""' in h for h in set_cookie_headers)


def test_logout_cookie_secure_matches_environment(client, monkeypatch):
    monkeypatch.setattr(auth_router.settings, "ENVIRONMENT", "development")
    response = client.post("/api/auth/logout")
    assert response.status_code == 200
    access_cookie_headers = [
        header
        for header in response.headers.get_list("set-cookie")
        if "access_token=" in header
    ]
    assert access_cookie_headers
    assert all("Secure" not in header for header in access_cookie_headers)


def test_request_otp_unknown_email_returns_generic_response(client):
    response = client.post(
        "/api/auth/request-otp",
        json={"email": "unknown-request-otp@example.com"},
    )
    assert response.status_code == 200
    assert response.json()["message"] == "If this email is registered, an OTP has been sent."


def test_request_otp_known_email_returns_same_generic_response(client, db):
    company = create_company(db, name="OTP Co", company_code="OTP")
    create_active_user(
        db,
        email="known-request-otp@example.com",
        role="sales",
        company_id=company.id,
        full_name="Known OTP User",
    )
    response = client.post(
        "/api/auth/request-otp",
        json={"email": "known-request-otp@example.com"},
    )
    assert response.status_code == 200
    assert response.json()["message"] == "If this email is registered, an OTP has been sent."


def test_signup_internal_error_is_sanitized(client, monkeypatch):
    def _boom(*_args, **_kwargs):
        raise RuntimeError("SECRET_DB_FAILURE")

    monkeypatch.setattr(auth_router, "notify_platform_admins", _boom)
    response = client.post(
        "/api/auth/signup",
        json={
            "email": "sanitize-signup@example.com",
            "password": "password123",
            "full_name": "Sanitize Signup",
            "company_name": "Sanitize Co",
            "phone": "1234567890",
        },
    )
    assert response.status_code == 500
    assert response.json()["detail"] == "Registration failed. Please try again."
    assert "secret" not in response.json()["detail"].lower()


def test_login_internal_error_is_sanitized(client, db, monkeypatch):
    create_active_user(
        db,
        email="sanitize-login@example.com",
        role="sales",
        full_name="Sanitize Login",
        password="password123",
    )

    def _boom(_user, _db):
        raise RuntimeError("SECRET_COMPANY_CHECK_FAILURE")

    monkeypatch.setattr(auth_router, "_check_company_status", _boom)
    response = client.post(
        "/api/auth/login",
        data={"username": "sanitize-login@example.com", "password": "password123"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert response.status_code == 500
    assert response.json()["detail"] == "Login failed. Please try again."
    assert "secret" not in response.json()["detail"].lower()


def test_accept_invite_internal_error_is_sanitized(client, db, monkeypatch):
    company = create_company(db, name="Invite Co", company_code="IVT")
    invite = Invite(
        company_id=company.id,
        email="invitee@example.com",
        full_name="Invitee User",
        role="sales",
        status=InviteStatus.PENDING,
        token="token-sanitize-accept-invite",
        expires_at=datetime.now(timezone.utc) + timedelta(days=1),
    )
    db.add(invite)
    db.commit()

    def _boom(*_args, **_kwargs):
        raise RuntimeError("SECRET_TOKEN_FAILURE")

    monkeypatch.setattr(auth_router, "create_access_token", _boom)
    response = client.post(
        f"/api/auth/accept-invite/{invite.token}",
        json={"password": "newpassword123"},
    )
    assert response.status_code == 500
    assert response.json()["detail"] == "Registration failed. Please try again."
    assert "secret" not in response.json()["detail"].lower()
