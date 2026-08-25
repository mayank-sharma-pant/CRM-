"""Saved reports and dashboard widgets must obey the Phase-0 gate: company B
cannot read/mutate/delete company A's row by id. Each denial is paired with a
positive control so a 404 proves company scope, not a missing row."""

import pytest

from app.utils.rate_limit import auth_limiter
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company

NO_ACCESS = (403, 404)


@pytest.fixture(autouse=True)
def _reset_auth_rate_limit():
    auth_limiter._buckets.clear()
    yield


@pytest.fixture()
def two_companies_with_report(client, db):
    a = create_company(db, name="A", company_code="SRA")
    b = create_company(db, name="B", company_code="SRB")
    create_active_user(db, email="admin@a.com", role="admin", company_id=a.id)
    create_active_user(db, email="admin@b.com", role="admin", company_id=b.id)
    login_user(client, "admin@a.com")
    report = client.post("/api/reports", json={
        "name": "A report",
        "report_type": "leads_invoices",
        "filters": {"group_by": "date"},
    }).json()
    widget = client.post("/api/dashboards/default/widgets", json={
        "saved_report_id": report["id"],
        "visualization": "kpi",
    }).json()
    client.headers.pop("Authorization", None)
    return report["id"], widget["id"], "admin@b.com"


def test_owner_can_read_and_mutate_own_report_and_widget(client, two_companies_with_report):
    report_id, widget_id, _ = two_companies_with_report
    login_user(client, "admin@a.com")
    assert client.get(f"/api/reports/{report_id}").status_code == 200
    assert client.patch(f"/api/reports/{report_id}", json={"name": "ok"}).status_code == 200
    assert client.get("/api/dashboards/default").status_code == 200
    assert client.patch(
        f"/api/dashboards/default/widgets/{widget_id}",
        json={"title": "ok"},
    ).status_code == 200


def test_cross_tenant_report_read_denied(client, two_companies_with_report):
    report_id, _, admin_b = two_companies_with_report
    login_user(client, admin_b)
    assert client.get(f"/api/reports/{report_id}").status_code in NO_ACCESS
    assert client.get(f"/api/reports/{report_id}/run").status_code in NO_ACCESS
    assert client.get(f"/api/reports/{report_id}/csv").status_code in NO_ACCESS


def test_cross_tenant_report_patch_and_delete_denied(client, two_companies_with_report):
    report_id, _, admin_b = two_companies_with_report
    login_user(client, admin_b)
    assert client.patch(f"/api/reports/{report_id}", json={"name": "x"}).status_code in NO_ACCESS
    assert client.delete(f"/api/reports/{report_id}").status_code in NO_ACCESS


def test_cross_tenant_widget_mutate_denied(client, two_companies_with_report):
    _, widget_id, admin_b = two_companies_with_report
    login_user(client, admin_b)
    assert client.patch(
        f"/api/dashboards/default/widgets/{widget_id}",
        json={"title": "x"},
    ).status_code in NO_ACCESS
    assert client.delete(f"/api/dashboards/default/widgets/{widget_id}").status_code in NO_ACCESS
