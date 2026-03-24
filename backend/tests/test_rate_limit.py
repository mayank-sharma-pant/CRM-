import pytest
from time import sleep

def test_login_rate_limiting(client, db):
    # Setup: Create a user
    from app.models import User
    from app.utils.security import get_password_hash
    from app.utils.rate_limit import auth_limiter
    
    # Reset limiter for clean test
    auth_limiter._buckets.clear()
    
    email = "rate@limit.com"
    u = User(email=email, hashed_password=get_password_hash("pw"), full_name="Rate User", role="sales", is_active=True, status="active")
    db.add(u)
    db.commit()

    # The limit is 10 attempts / 300 seconds (per _RATE_LIMITS in auth.py)
    # We'll try 11 times.
    for i in range(10):
        response = client.post(
            "/api/auth/login",
            data={"username": email, "password": "wrongpassword"},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        assert response.status_code == 401
    
    # 11th attempt should be rate limited (429)
    response = client.post(
        "/api/auth/login",
        data={"username": email, "password": "wrongpassword"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert response.status_code == 429
    assert response.json()["detail"] == "Too many attempts. Please try again later."
    assert "Retry-After" in response.headers
    assert int(response.headers["Retry-After"]) > 0

def test_rate_limiting_isolation(client, db):
    from app.utils.rate_limit import auth_limiter
    auth_limiter._buckets.clear()
    
    # Limit for signup is 5
    email1 = "user1@test.com"
    email2 = "user2@test.com"
    
    # Exhaust limit for email1
    for _ in range(5):
        client.post("/api/auth/signup", json={
            "email": email1, "password": "password123", "full_name": "U1", 
            "company_name": "C1", "phone": "1234567890"
        })
    
    # 6th attempt for email1 should be 429
    res1 = client.post("/api/auth/signup", json={
        "email": email1, "password": "password123", "full_name": "U1", 
        "company_name": "C1", "phone": "1234567890"
    })
    assert res1.status_code == 429
    
    # Attempt for email2 should still NOT be 429
    res2 = client.post("/api/auth/signup", json={
        "email": email2, "password": "password123", "full_name": "U2", 
        "company_name": "C2", "phone": "1234567890"
    })
    assert res2.status_code != 429
