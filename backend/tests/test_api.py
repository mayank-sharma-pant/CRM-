"""
Basic API tests. Run with: pytest tests/ -v
Backend must be running on port 8000.
"""
import os
import pytest
import httpx

BASE_URL = os.environ.get("BASE_URL", "http://127.0.0.1:8000")


@pytest.mark.skipif(
    os.environ.get("SKIP_LIVE") == "1",
    reason="Skip live API calls (set SKIP_LIVE=1 to skip)",
)
class TestLiveAPI:
    """Tests against a running backend (uvicorn app.main:app --port 8000)."""

    def test_health(self):
        r = httpx.get(f"{BASE_URL}/health", timeout=5.0)
        assert r.status_code == 200
        assert r.json().get("status") == "healthy"

    def test_root(self):
        r = httpx.get(f"{BASE_URL}/", timeout=5.0)
        assert r.status_code == 200
        data = r.json()
        assert "message" in data and "CRM" in data["message"]

    def test_protected_returns_401_without_token(self):
        r = httpx.get(f"{BASE_URL}/api/leads/", timeout=5.0)
        assert r.status_code == 401

    def test_login_and_me(self):
        r = httpx.post(
            f"{BASE_URL}/api/auth/login",
            data={"username": "alex.j@company.com", "password": "sales123"},
            timeout=5.0,
        )
        if r.status_code != 200:
            pytest.skip("Login failed (backend may not be seeded)")
        token = r.json().get("access_token")
        assert token
        r2 = httpx.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"},
            timeout=5.0,
        )
        assert r2.status_code == 200
        user = r2.json()
        assert user.get("email") == "alex.j@company.com"
        assert user.get("company_id") == 1
