"""Authentication and user helpers for tests."""

from app.models.core.user import User
from app.utils.security import get_password_hash


def login_user(client, email: str, password: str = "pw"):
    """Authenticate and set Authorization header on the shared test client."""
    response = client.post(
        "/api/auth/login",
        data={"username": email, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert response.status_code == 200, f"Login failed for {email}: {response.text}"
    token = response.json()["access_token"]
    client.headers["Authorization"] = f"Bearer {token}"
    return response


def create_active_user(
    db,
    *,
    email: str,
    role: str,
    company_id: int | None = None,
    full_name: str | None = None,
    password: str = "pw",
    **extra,
) -> User:
    """Create an active user with a hashed password."""
    user = User(
        email=email,
        full_name=full_name or email.split("@")[0].title(),
        hashed_password=get_password_hash(password),
        role=role,
        company_id=company_id,
        status="active",
        is_active=True,
        **extra,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
