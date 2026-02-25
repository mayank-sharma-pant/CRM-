"""
Comprehensive API Integration Tests
Run with: pytest tests/ -v
Backend must be running on port 8000 with seeded data.
"""
import os
import pytest
import httpx

BASE_URL = os.environ.get("BASE_URL", "http://127.0.0.1:8000")

# Test credentials (from seed_admin endpoint)
SALES_EMAIL = "alex.j@company.com"
SALES_PASSWORD = "sales123"
MD_EMAIL = "sarah.c@company.com"
MD_PASSWORD = "md123"


@pytest.fixture(scope="module")
def sales_token():
    """Get auth token for sales user."""
    r = httpx.post(
        f"{BASE_URL}/api/auth/login",
        data={"username": SALES_EMAIL, "password": SALES_PASSWORD},
        timeout=10.0,
    )
    if r.status_code != 200:
        pytest.skip("Sales login failed (backend may not be seeded)")
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def md_token():
    """Get auth token for MD user."""
    r = httpx.post(
        f"{BASE_URL}/api/auth/login",
        data={"username": MD_EMAIL, "password": MD_PASSWORD},
        timeout=10.0,
    )
    if r.status_code != 200:
        pytest.skip("MD login failed (backend may not be seeded)")
    return r.json()["access_token"]


def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.skipif(
    os.environ.get("SKIP_LIVE") == "1",
    reason="Skip live API calls",
)
class TestHealthAndRoot:
    """Basic health checks."""

    def test_health(self):
        r = httpx.get(f"{BASE_URL}/health", timeout=5.0)
        assert r.status_code == 200
        assert r.json()["status"] == "healthy"

    def test_root(self):
        r = httpx.get(f"{BASE_URL}/", timeout=5.0)
        assert r.status_code == 200
        assert "CRM" in r.json()["message"]


@pytest.mark.skipif(
    os.environ.get("SKIP_LIVE") == "1",
    reason="Skip live API calls",
)
class TestAuth:
    """Authentication flow tests."""

    def test_login_success(self, sales_token):
        assert sales_token is not None

    def test_login_failure(self):
        r = httpx.post(
            f"{BASE_URL}/api/auth/login",
            data={"username": "bad@email.com", "password": "wrong"},
            timeout=5.0,
        )
        assert r.status_code in (401, 429)

    def test_me_endpoint(self, sales_token):
        r = httpx.get(f"{BASE_URL}/api/auth/me", headers=auth_headers(sales_token), timeout=5.0)
        assert r.status_code == 200
        user = r.json()
        assert "email" in user
        assert "role" in user

    def test_protected_without_token(self):
        r = httpx.get(f"{BASE_URL}/api/leads/", timeout=5.0)
        assert r.status_code == 401


@pytest.mark.skipif(
    os.environ.get("SKIP_LIVE") == "1",
    reason="Skip live API calls",
)
class TestLeadsCRUD:
    """Lead CRUD operations."""

    created_lead_id = None

    def test_create_lead(self, sales_token):
        r = httpx.post(
            f"{BASE_URL}/api/leads/",
            json={"name": "Test Lead", "email": "test.lead@example.com", "phone": "555-0100", "company": "Test Inc"},
            headers=auth_headers(sales_token),
            timeout=5.0,
        )
        assert r.status_code == 201
        data = r.json()
        assert data["name"] == "Test Lead"
        assert data["status"] == "New"
        TestLeadsCRUD.created_lead_id = data["id"]

    def test_list_leads(self, sales_token):
        r = httpx.get(f"{BASE_URL}/api/leads/", headers=auth_headers(sales_token), timeout=5.0)
        assert r.status_code == 200

    def test_get_lead(self, sales_token):
        if not TestLeadsCRUD.created_lead_id:
            pytest.skip("No lead created")
        r = httpx.get(
            f"{BASE_URL}/api/leads/{TestLeadsCRUD.created_lead_id}",
            headers=auth_headers(sales_token),
            timeout=5.0,
        )
        assert r.status_code == 200
        assert r.json()["name"] == "Test Lead"

    def test_update_lead(self, sales_token):
        if not TestLeadsCRUD.created_lead_id:
            pytest.skip("No lead created")
        r = httpx.put(
            f"{BASE_URL}/api/leads/{TestLeadsCRUD.created_lead_id}",
            json={"status": "Contacted"},
            headers=auth_headers(sales_token),
            timeout=5.0,
        )
        assert r.status_code == 200
        assert "Lead updated" in r.json().get("message", "")

    def test_add_note_to_lead(self, sales_token):
        if not TestLeadsCRUD.created_lead_id:
            pytest.skip("No lead created")
        r = httpx.post(
            f"{BASE_URL}/api/leads/{TestLeadsCRUD.created_lead_id}/notes?content=Test%20note%20content",
            headers=auth_headers(sales_token),
            timeout=5.0,
        )
        assert r.status_code in (200, 201)

    def test_delete_lead(self, sales_token):
        if not TestLeadsCRUD.created_lead_id:
            pytest.skip("No lead created")
        r = httpx.delete(
            f"{BASE_URL}/api/leads/{TestLeadsCRUD.created_lead_id}",
            headers=auth_headers(sales_token),
            timeout=5.0,
        )
        assert r.status_code == 200


@pytest.mark.skipif(
    os.environ.get("SKIP_LIVE") == "1",
    reason="Skip live API calls",
)
class TestSearch:
    """Global search tests."""

    def test_search_requires_auth(self):
        r = httpx.get(f"{BASE_URL}/api/search?q=test", timeout=5.0)
        assert r.status_code == 401

    def test_search_returns_results(self, sales_token):
        r = httpx.get(
            f"{BASE_URL}/api/search?q=a",
            headers=auth_headers(sales_token),
            timeout=5.0,
        )
        assert r.status_code == 200
        data = r.json()
        assert "results" in data
        assert "total" in data
        assert "query" in data

    def test_search_min_length(self, sales_token):
        """Single char should still work if >= 1 char."""
        r = httpx.get(
            f"{BASE_URL}/api/search?q=a",
            headers=auth_headers(sales_token),
            timeout=5.0,
        )
        assert r.status_code == 200


@pytest.mark.skipif(
    os.environ.get("SKIP_LIVE") == "1",
    reason="Skip live API calls",
)
class TestExport:
    """CSV export tests."""

    def test_export_leads_csv(self, sales_token):
        r = httpx.get(
            f"{BASE_URL}/api/export/leads",
            headers=auth_headers(sales_token),
            timeout=10.0,
        )
        assert r.status_code == 200
        assert "text/csv" in r.headers.get("content-type", "")
        assert "attachment" in r.headers.get("content-disposition", "")

    def test_export_clients_csv(self, sales_token):
        r = httpx.get(
            f"{BASE_URL}/api/export/clients",
            headers=auth_headers(sales_token),
            timeout=10.0,
        )
        assert r.status_code == 200
        assert "text/csv" in r.headers.get("content-type", "")

    def test_export_invoices_csv(self, sales_token):
        r = httpx.get(
            f"{BASE_URL}/api/export/invoices",
            headers=auth_headers(sales_token),
            timeout=10.0,
        )
        assert r.status_code == 200


@pytest.mark.skipif(
    os.environ.get("SKIP_LIVE") == "1",
    reason="Skip live API calls",
)
class TestNotifications:
    """Notification system tests."""

    def test_list_notifications(self, sales_token):
        r = httpx.get(
            f"{BASE_URL}/api/notifications",
            headers=auth_headers(sales_token),
            timeout=5.0,
        )
        assert r.status_code == 200
        data = r.json()
        assert "notifications" in data
        assert "unread_count" in data

    def test_mark_all_read(self, sales_token):
        r = httpx.post(
            f"{BASE_URL}/api/notifications/read-all",
            headers=auth_headers(sales_token),
            timeout=5.0,
        )
        assert r.status_code == 200


@pytest.mark.skipif(
    os.environ.get("SKIP_LIVE") == "1",
    reason="Skip live API calls",
)
class TestTimeline:
    """Activity timeline tests."""

    def test_timeline_lead(self, sales_token):
        r = httpx.get(
            f"{BASE_URL}/api/timeline/lead/1",
            headers=auth_headers(sales_token),
            timeout=5.0,
        )
        assert r.status_code == 200
        data = r.json()
        assert "events" in data
        assert "total" in data

    def test_timeline_invalid_type(self, sales_token):
        r = httpx.get(
            f"{BASE_URL}/api/timeline/invalid/1",
            headers=auth_headers(sales_token),
            timeout=5.0,
        )
        assert r.status_code == 400


@pytest.mark.skipif(
    os.environ.get("SKIP_LIVE") == "1",
    reason="Skip live API calls",
)
class TestMDEndpoints:
    """MD (Managing Director) endpoint tests."""

    def test_md_dashboard(self, md_token):
        r = httpx.get(
            f"{BASE_URL}/api/md/dashboard",
            headers=auth_headers(md_token),
            timeout=10.0,
        )
        assert r.status_code == 200
        data = r.json()
        assert "kpis" in data

    def test_md_revenue(self, md_token):
        r = httpx.get(
            f"{BASE_URL}/api/md/revenue",
            headers=auth_headers(md_token),
            timeout=10.0,
        )
        assert r.status_code == 200
        data = r.json()
        assert "kpis" in data
        assert "revenueTrend" in data

    def test_md_leads(self, md_token):
        r = httpx.get(
            f"{BASE_URL}/api/md/leads",
            headers=auth_headers(md_token),
            timeout=10.0,
        )
        assert r.status_code == 200
        data = r.json()
        assert "funnel" in data
        assert "sourceBreakdown" in data

    def test_md_clients(self, md_token):
        r = httpx.get(
            f"{BASE_URL}/api/md/clients",
            headers=auth_headers(md_token),
            timeout=10.0,
        )
        assert r.status_code == 200
        data = r.json()
        assert "growthTrend" in data
        assert "healthDistribution" in data

    def test_md_sales(self, md_token):
        r = httpx.get(
            f"{BASE_URL}/api/md/sales",
            headers=auth_headers(md_token),
            timeout=10.0,
        )
        assert r.status_code == 200
        data = r.json()
        assert "salesTrend" in data

    def test_md_points(self, md_token):
        r = httpx.get(
            f"{BASE_URL}/api/md/points",
            headers=auth_headers(md_token),
            timeout=10.0,
        )
        assert r.status_code == 200
        data = r.json()
        assert "summary" in data


@pytest.mark.skipif(
    os.environ.get("SKIP_LIVE") == "1",
    reason="Skip live API calls",
)
class TestSecurityHeaders:
    """Verify security headers are present on API responses."""

    def test_security_headers_present(self):
        r = httpx.get(f"{BASE_URL}/health", timeout=5.0)
        assert r.headers.get("x-content-type-options") == "nosniff"
        assert r.headers.get("x-frame-options") == "DENY"
        assert r.headers.get("x-xss-protection") == "1; mode=block"

    def test_api_cache_control(self, sales_token):
        r = httpx.get(
            f"{BASE_URL}/api/auth/me",
            headers=auth_headers(sales_token),
            timeout=5.0,
        )
        assert "no-store" in r.headers.get("cache-control", "")


@pytest.mark.skipif(
    os.environ.get("SKIP_LIVE") == "1",
    reason="Skip live API calls",
)
class TestRoleAccess:
    """Verify role-based access control."""

    def test_sales_cannot_access_md(self, sales_token):
        r = httpx.get(
            f"{BASE_URL}/api/md/dashboard",
            headers=auth_headers(sales_token),
            timeout=5.0,
        )
        assert r.status_code in (403, 401)

    def test_md_can_access_md(self, md_token):
        r = httpx.get(
            f"{BASE_URL}/api/md/dashboard",
            headers=auth_headers(md_token),
            timeout=5.0,
        )
        assert r.status_code == 200
