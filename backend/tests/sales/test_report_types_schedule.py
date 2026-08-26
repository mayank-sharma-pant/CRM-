from unittest.mock import patch

import pytest

from app.utils.rate_limit import auth_limiter
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_client, create_company


@pytest.fixture(autouse=True)
def _reset_auth_rate_limit():
    auth_limiter._buckets.clear()
    yield


def _company_with_admin(db, code="R712"):
    company = create_company(db, name=f"Co {code}", company_code=code)
    admin = create_active_user(db, email=f"admin@{code.lower()}.com", role="admin", company_id=company.id)
    return company, admin


def test_deals_pipeline_report_run_and_csv(client, db):
    _, admin = _company_with_admin(db)
    login_user(client, admin.email)
    client.post("/api/deals", json={"title": "Solar roof", "amount": "50000"})
    client.post("/api/deals", json={"title": "Battery", "amount": "25000"})

    created = client.post("/api/reports", json={
        "name": "Open pipeline",
        "report_type": "deals_pipeline",
        "filters": {"group_by": "stage"},
    })
    assert created.status_code == 201, created.text
    rid = created.json()["id"]

    run = client.get(f"/api/reports/{rid}/run")
    assert run.status_code == 200, run.text
    body = run.json()
    assert body["kpis"]["openDeals"] >= 2
    assert body["chartData"]
    assert body["gridData"][0]["title"]

    csv_resp = client.get(f"/api/reports/{rid}/csv")
    assert csv_resp.status_code == 200
    assert csv_resp.text.splitlines()[0] == "Title,Client,Stage,Amount,Probability,Expected close"


def test_gst_invoices_report_includes_tax_columns(client, db):
    company, admin = _company_with_admin(db, "GST")
    customer = create_client(db, company_id=company.id, name="Buyer", email="buyer@gst.com")
    db.commit()
    login_user(client, admin.email)
    inv = client.post("/api/invoices", json={
        "client_id": customer.id,
        "items": [{"description": "Install", "quantity": 1, "unit_price": 1000, "hsn": "9983"}],
    })
    assert inv.status_code == 201, inv.text

    created = client.post("/api/reports", json={
        "name": "GST month",
        "report_type": "gst_invoices",
        "filters": {"group_by": "status"},
    })
    assert created.status_code == 201, created.text
    rid = created.json()["id"]

    run = client.get(f"/api/reports/{rid}/run")
    assert run.status_code == 200, run.text
    body = run.json()
    assert body["kpis"]["totalInvoices"] >= 1
    row = body["gridData"][0]
    assert "cgst" in row
    assert "seller_gstin" in row or row["seller_gstin"] == ""


def test_report_schedule_settings_and_run(client, db):
    _, admin = _company_with_admin(db, "SCH")
    login_user(client, admin.email)
    rid = client.post("/api/reports", json={
        "name": "Weekly GST",
        "report_type": "gst_invoices",
        "filters": {},
    }).json()["id"]

    bad = client.put("/api/settings/report-schedule", json={"enabled": True})
    assert bad.status_code == 400

    saved = client.put("/api/settings/report-schedule", json={
        "enabled": True,
        "frequency": "weekly",
        "saved_report_id": rid,
    })
    assert saved.status_code == 200, saved.text
    assert saved.json()["enabled"] is True
    assert saved.json()["saved_report_id"] == rid

    got = client.get("/api/settings/report-schedule")
    assert got.status_code == 200
    assert got.json()["frequency"] == "weekly"

    with patch("app.services.sales.report_schedule.send_email_with_attachments", return_value=True):
        result = client.post("/api/settings/report-schedule/run")
    assert result.status_code == 200, result.text
    assert result.json()["sent"] == 1

    got_after = client.get("/api/settings/report-schedule")
    assert got_after.json()["last_sent_at"] is not None
