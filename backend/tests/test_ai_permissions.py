from app.models import User, Company
from app.utils.security import get_password_hash


def login_user(client, email):
    response = client.post(
        "/api/auth/login",
        data={"username": email, "password": "pw"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    client.headers["Authorization"] = f"Bearer {token}"
    return response


def test_ai_company_assistant_requires_md_or_admin(client, db):
    c = Company(name="AI Co", company_code="AIC", status="active")
    db.add(c)
    db.commit()
    db.refresh(c)

    sales = User(
        email="sales@ai.co",
        full_name="AI Sales",
        hashed_password=get_password_hash("pw"),
        role="sales",
        company_id=c.id,
        is_active=True,
        status="active",
    )
    md = User(
        email="md@ai.co",
        full_name="AI MD",
        hashed_password=get_password_hash("pw"),
        role="md",
        company_id=c.id,
        is_active=True,
        status="active",
    )
    db.add_all([sales, md])
    db.commit()

    # Sales user should be forbidden
    login_user(client, sales.email)
    r = client.post("/api/ai/company-assistant", json={"message": "create team Alpha"})
    assert r.status_code == 403

    # MD can access the endpoint (may return 503 if key not configured)
    client.headers.pop("Authorization", None)
    login_user(client, md.email)
    r2 = client.post("/api/ai/company-assistant", json={"message": "create team Alpha"})
    assert r2.status_code in (200, 503, 502)

