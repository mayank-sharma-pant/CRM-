"""Forecasting quotas and report must obey the Phase-0 gate: company B cannot
read/mutate/delete company A's quota by id (404, not a 2xx). B's report must not
list A's users. Each denial is paired with a positive control."""

import pytest

from app.utils.rate_limit import auth_limiter
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company

NO_ACCESS = (400, 403, 404)


@pytest.fixture(autouse=True)
def _reset_auth_rate_limit():
    auth_limiter._buckets.clear()
    yield


@pytest.fixture()
def two_companies_with_quota(client, db):
    a = create_company(db, name="A", company_code="FCA")
    b = create_company(db, name="B", company_code="FCB")
    create_active_user(db, email="admin@a.com", role="admin", company_id=a.id)
    sales_a = create_active_user(db, email="sales@a.com", role="sales", company_id=a.id)
    create_active_user(db, email="admin@b.com", role="admin", company_id=b.id)
    login_user(client, "admin@a.com")
    quota = client.put("/api/forecasting/quotas", json={
        "user_id": sales_a.id,
        "year": 2026,
        "month": 8,
        "amount": "1000.00",
    }).json()
    client.headers.pop("Authorization", None)
    return quota["id"], sales_a.id, "admin@b.com"


def test_owner_can_list_report_and_delete_quota(client, two_companies_with_quota):
    quota_id, sales_a_id, _ = two_companies_with_quota
    login_user(client, "admin@a.com")
    listed = client.get("/api/forecasting/quotas", params={"year": 2026, "month": 8})
    assert listed.status_code == 200
    assert any(q["id"] == quota_id for q in listed.json()["items"])
    report = client.get("/api/forecasting/report", params={"year": 2026, "month": 8})
    assert report.status_code == 200
    assert any(r["user_id"] == sales_a_id for r in report.json()["items"])
    assert client.delete(f"/api/forecasting/quotas/{quota_id}").status_code == 200


def test_cross_tenant_put_denied(client, two_companies_with_quota):
    _, sales_a_id, admin_b = two_companies_with_quota
    login_user(client, admin_b)
    assert client.put("/api/forecasting/quotas", json={
        "user_id": sales_a_id,
        "year": 2026,
        "month": 8,
        "amount": "9.00",
    }).status_code in NO_ACCESS


def test_cross_tenant_list_quotas_excludes_other_tenant(client, two_companies_with_quota):
    quota_id, _, admin_b = two_companies_with_quota
    login_user(client, admin_b)
    listed = client.get("/api/forecasting/quotas", params={"year": 2026, "month": 8})
    assert listed.status_code == 200
    assert not any(q["id"] == quota_id for q in listed.json()["items"])


def test_cross_tenant_delete_denied(client, two_companies_with_quota):
    quota_id, _, admin_b = two_companies_with_quota
    login_user(client, admin_b)
    assert client.delete(f"/api/forecasting/quotas/{quota_id}").status_code in NO_ACCESS


def test_cross_tenant_report_excludes_other_tenant_users(client, two_companies_with_quota):
    _, sales_a_id, admin_b = two_companies_with_quota
    login_user(client, admin_b)
    report = client.get("/api/forecasting/report", params={"year": 2026, "month": 8})
    assert report.status_code == 200
    assert not any(r["user_id"] == sales_a_id for r in report.json()["items"])
