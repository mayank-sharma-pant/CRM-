import pytest

from app.utils.rate_limit import auth_limiter
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


@pytest.fixture(autouse=True)
def _reset_auth_rate_limit():
    auth_limiter._buckets.clear()
    yield


def _company_with_admin(db, code="R1"):
    company = create_company(db, name=f"Co {code}", company_code=code)
    admin = create_active_user(db, email=f"admin@{code}.com", role="admin", company_id=company.id)
    return company, admin


def _payload(**overrides):
    body = {
        "name": "Website this month",
        "report_type": "leads_invoices",
        "filters": {
            "start_date": "2026-08-01",
            "end_date": "2026-08-31",
            "source": "Website",
            "service_type": None,
            "group_by": "source",
        },
    }
    body.update(overrides)
    return body


def test_create_list_get_patch_delete_saved_report(client, db):
    _, admin = _company_with_admin(db)
    login_user(client, admin.email)
    created = client.post("/api/reports", json=_payload())
    assert created.status_code == 201, created.text
    body = created.json()
    rid = body["id"]
    assert body["name"] == "Website this month"
    assert body["report_type"] == "leads_invoices"
    assert body["filters"]["group_by"] == "source"

    listed = client.get("/api/reports")
    assert listed.status_code == 200
    assert listed.json()["total"] >= 1
    assert any(item["id"] == rid for item in listed.json()["items"])

    got = client.get(f"/api/reports/{rid}")
    assert got.status_code == 200
    assert got.json()["id"] == rid

    patched = client.patch(f"/api/reports/{rid}", json={"name": "Renamed"})
    assert patched.status_code == 200
    assert patched.json()["name"] == "Renamed"

    deleted = client.delete(f"/api/reports/{rid}")
    assert deleted.status_code == 204
    assert client.get(f"/api/reports/{rid}").status_code == 404


def test_create_rejects_empty_name_and_bad_filters(client, db):
    _, admin = _company_with_admin(db)
    login_user(client, admin.email)
    assert client.post("/api/reports", json=_payload(name="  ")).status_code == 400
    assert client.post("/api/reports", json=_payload(filters={"group_by": "nope"})).status_code == 400
    assert client.post("/api/reports", json=_payload(filters={"start_date": "25-08-2026"})).status_code == 400
    assert client.post("/api/reports", json=_payload(report_type="sql")).status_code == 400


def test_sales_cannot_mutate_but_can_run(client, db):
    company, admin = _company_with_admin(db)
    sales = create_active_user(db, email="sales@r1.com", role="sales", company_id=company.id)
    login_user(client, admin.email)
    rid = client.post("/api/reports", json=_payload()).json()["id"]
    client.headers.pop("Authorization", None)
    login_user(client, sales.email)
    assert client.post("/api/reports", json=_payload(name="Nope")).status_code == 403
    assert client.patch(f"/api/reports/{rid}", json={"name": "x"}).status_code == 403
    assert client.delete(f"/api/reports/{rid}").status_code == 403
    listed = client.get("/api/reports")
    assert listed.status_code == 200
    run = client.get(f"/api/reports/{rid}/run")
    assert run.status_code == 200, run.text
    assert "kpis" in run.json()
    assert "chartData" in run.json()
    assert "gridData" in run.json()
    csv_resp = client.get(f"/api/reports/{rid}/csv")
    assert csv_resp.status_code == 200
    assert "text/csv" in csv_resp.headers.get("content-type", "")
    assert csv_resp.text.splitlines()[0] == "Invoice,Client,Date,Source,Product,Status,Amount"


def test_run_counts_company_leads(client, db):
    _, admin = _company_with_admin(db)
    login_user(client, admin.email)
    lead = client.post("/api/leads", json={"name": "Ravi", "source": "Website"})
    assert lead.status_code in (200, 201), lead.text
    rid = client.post("/api/reports", json=_payload(
        filters={"source": "Website", "group_by": "source"},
    )).json()["id"]
    run = client.get(f"/api/reports/{rid}/run")
    assert run.status_code == 200
    assert run.json()["kpis"]["totalLeads"] >= 1


def test_dashboard_get_or_create_and_widget_crud(client, db):
    _, admin = _company_with_admin(db)
    login_user(client, admin.email)
    rid = client.post("/api/reports", json=_payload()).json()["id"]

    first = client.get("/api/dashboards/default")
    assert first.status_code == 200, first.text
    assert first.json()["name"] == "Company dashboard"
    dash_id = first.json()["id"]
    second = client.get("/api/dashboards/default")
    assert second.json()["id"] == dash_id

    widget = client.post("/api/dashboards/default/widgets", json={
        "saved_report_id": rid,
        "visualization": "kpi",
        "title": "Website KPI",
    })
    assert widget.status_code == 201, widget.text
    wid = widget.json()["id"]
    assert widget.json()["visualization"] == "kpi"
    assert widget.json()["saved_report_id"] == rid

    board = client.get("/api/dashboards/default").json()
    assert len(board["widgets"]) == 1
    assert board["widgets"][0]["report"]["id"] == rid
    assert board["widgets"][0]["report"]["name"] == "Website this month"

    patched = client.patch(f"/api/dashboards/default/widgets/{wid}", json={
        "visualization": "chart",
        "position": 2,
    })
    assert patched.status_code == 200
    assert patched.json()["visualization"] == "chart"
    assert patched.json()["position"] == 2

    assert client.delete(f"/api/dashboards/default/widgets/{wid}").status_code == 204
    assert client.get("/api/dashboards/default").json()["widgets"] == []


def test_delete_report_removes_widgets(client, db):
    _, admin = _company_with_admin(db)
    login_user(client, admin.email)
    rid = client.post("/api/reports", json=_payload()).json()["id"]
    client.post("/api/dashboards/default/widgets", json={
        "saved_report_id": rid,
        "visualization": "table",
    })
    assert client.delete(f"/api/reports/{rid}").status_code == 204
    assert client.get("/api/dashboards/default").json()["widgets"] == []


def test_widget_rejects_foreign_saved_report(client, db):
    _, admin = _company_with_admin(db, code="A1")
    other = create_company(db, name="Other", company_code="B1")
    other_admin = create_active_user(db, email="admin@b1.com", role="admin", company_id=other.id)
    login_user(client, other_admin.email)
    foreign_rid = client.post("/api/reports", json=_payload(name="B report")).json()["id"]
    client.headers.pop("Authorization", None)
    login_user(client, admin.email)
    resp = client.post("/api/dashboards/default/widgets", json={
        "saved_report_id": foreign_rid,
        "visualization": "kpi",
    })
    assert resp.status_code == 400


def test_sales_cannot_mutate_dashboard_widgets(client, db):
    company, admin = _company_with_admin(db)
    sales = create_active_user(db, email="sales@r1.com", role="sales", company_id=company.id)
    login_user(client, admin.email)
    rid = client.post("/api/reports", json=_payload()).json()["id"]
    client.headers.pop("Authorization", None)
    login_user(client, sales.email)
    assert client.post("/api/dashboards/default/widgets", json={
        "saved_report_id": rid,
        "visualization": "kpi",
    }).status_code == 403
    assert client.get("/api/dashboards/default").status_code == 200
