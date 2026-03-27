from tests.helpers.auth import create_active_user


def test_login_rate_limiting(client, db):
    from app.utils.rate_limit import auth_limiter

    auth_limiter._buckets.clear()

    email = "rate@limit.com"
    create_active_user(db, email=email, role="sales", full_name="Rate User")

    for _ in range(10):
        response = client.post(
            "/api/auth/login",
            data={"username": email, "password": "wrongpassword"},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        assert response.status_code == 401

    response = client.post(
        "/api/auth/login",
        data={"username": email, "password": "wrongpassword"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert response.status_code == 429
    assert response.json()["detail"] == "Too many attempts. Please try again later."
    assert "Retry-After" in response.headers
    assert int(response.headers["Retry-After"]) > 0


def test_rate_limiting_isolation(client, db):
    from app.utils.rate_limit import auth_limiter

    auth_limiter._buckets.clear()

    email1 = "user1@test.com"
    email2 = "user2@test.com"

    for _ in range(5):
        client.post(
            "/api/auth/signup",
            json={
                "email": email1,
                "password": "password123",
                "full_name": "U1",
                "company_name": "C1",
                "phone": "1234567890",
            },
        )

    res1 = client.post(
        "/api/auth/signup",
        json={
            "email": email1,
            "password": "password123",
            "full_name": "U1",
            "company_name": "C1",
            "phone": "1234567890",
        },
    )
    assert res1.status_code == 429

    res2 = client.post(
        "/api/auth/signup",
        json={
            "email": email2,
            "password": "password123",
            "full_name": "U2",
            "company_name": "C2",
            "phone": "1234567890",
        },
    )
    assert res2.status_code != 429
