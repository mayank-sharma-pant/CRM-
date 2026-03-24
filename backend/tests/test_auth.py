import pytest
from app.models import User
from app.utils.security import get_password_hash

def test_login_success(client, db):
    # Setup: Create a test user
    hashed_pw = get_password_hash("testpassword123")
    user = User(
        email="test@example.com",
        full_name="Test User",
        hashed_password=hashed_pw,
        role="admin",
        status="active"
    )
    db.add(user)
    db.commit()

    # Action: Attempt login
    response = client.post(
        "/api/auth/login",
        data={"username": "test@example.com", "password": "testpassword123"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )

    # Assert: Success
    assert response.status_code == 200
    assert "access_token" in response.cookies
    assert response.json()["user"]["email"] == "test@example.com"
    
    # NEW: Verify session persistence
    me_response = client.get("/api/users/me")
    assert me_response.status_code == 200
    assert me_response.json()["email"] == "test@example.com"

def test_login_invalid_credentials(client, db):
    # Action: Attempt login with wrong password
    response = client.post(
        "/api/auth/login",
        data={"username": "wrong@example.com", "password": "wrongpassword"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )

    # Assert: 401
    assert response.status_code == 401
    assert "Incorrect email or password" in response.json()["detail"]

def test_logout(client):
    # Setup: Set a dummy cookie
    client.cookies.set("access_token", "dummy_token")
    
    # Action: Logout
    response = client.post("/api/auth/logout")
    
    # Assert: Success check
    assert response.status_code == 200
    
    # Check that the cookie is deleted/expired in the response headers
    # TestClient doesn't always automatically clear its own client.cookies jar 
    # when receiving a delete-cookie response, so we check the response headers.
    set_cookie_headers = [h for h in response.headers.get_list("set-cookie")]
    assert any("access_token=;" in h or 'access_token=""' in h for h in set_cookie_headers)
