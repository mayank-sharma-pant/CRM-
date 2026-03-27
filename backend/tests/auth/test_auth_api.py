from tests.helpers.auth import create_active_user


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
