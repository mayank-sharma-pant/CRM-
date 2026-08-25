from unittest.mock import patch

import pytest

from app.models.core.company_settings import CompanySettings
from app.models.sales.whatsapp import WhatsAppMessage
from app.utils.rate_limit import auth_limiter
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


@pytest.fixture(autouse=True)
def _reset_auth():
    auth_limiter._buckets.clear()
    yield


def _admin(client, db, code="WA1"):
    company = create_company(db, name=f"WA {code}", company_code=code)
    admin = create_active_user(db, email=f"admin@{code.lower()}.com", role="admin", company_id=company.id)
    login_user(client, admin.email)
    return company, admin


def _connect(db, company_id, source="917834811114"):
    row = db.query(CompanySettings).filter(CompanySettings.company_id == company_id).first()
    if row is None:
        row = CompanySettings(company_id=company_id, company_name="WA Co")
        db.add(row)
    row.whatsapp_api_key = "gupshup-secret"
    row.whatsapp_source = source
    db.commit()


def test_connection_never_returns_api_key(client, db):
    company, _ = _admin(client, db, "WAC")
    _connect(db, company.id)
    resp = client.get("/api/whatsapp/connection")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["configured"] is True
    assert body["source"] == "917834811114"
    assert "gupshup-secret" not in resp.text
    assert "api_key" not in body


def test_sales_cannot_write_template(client, db):
    company, _ = _admin(client, db, "WAS")
    create_active_user(db, email="sales@was.com", role="sales", company_id=company.id)
    login_user(client, "sales@was.com")
    resp = client.post("/api/whatsapp/templates", json={
        "name": "Hello",
        "provider_template_id": "tpl_1",
        "language": "en",
    })
    assert resp.status_code == 403


def test_admin_creates_template(client, db):
    _admin(client, db, "WAT")
    resp = client.post("/api/whatsapp/templates", json={
        "name": "Follow-up",
        "provider_template_id": "tpl_follow",
        "language": "en",
        "variable_keys": ["name"],
        "body": "Hi {{1}}",
    })
    assert resp.status_code == 201, resp.text
    assert resp.json()["provider_template_id"] == "tpl_follow"
    listed = client.get("/api/whatsapp/templates")
    assert listed.status_code == 200
    assert listed.json()["total"] == 1


@patch("app.routers.sales.whatsapp.post_gupshup_template", return_value=(True, "ok"))
def test_send_to_lead_logs_sent(mock_post, client, db):
    company, admin = _admin(client, db, "WAL")
    _connect(db, company.id)
    tpl = client.post("/api/whatsapp/templates", json={
        "name": "Hello",
        "provider_template_id": "tpl_hi",
        "variable_keys": ["name"],
    }).json()
    lead_id = client.post("/api/leads", json={"name": "Ravi", "phone": "9876543210"}).json()["id"]
    resp = client.post("/api/whatsapp/send", json={"template_id": tpl["id"], "lead_id": lead_id})
    assert resp.status_code == 201, resp.text
    assert resp.json()["status"] == "sent"
    assert resp.json()["to_phone"] == "919876543210"
    mock_post.assert_called_once()
    kwargs = mock_post.call_args.kwargs
    assert kwargs["destination"] == "919876543210"
    assert kwargs["params"] == ["Ravi"]
    row = db.query(WhatsAppMessage).filter(WhatsAppMessage.company_id == company.id).one()
    assert row.sent_by_id == admin.id
    assert row.lead_id == lead_id


def test_send_without_credentials_is_400(client, db):
    _admin(client, db, "WAN")
    tpl = client.post("/api/whatsapp/templates", json={
        "name": "Hello", "provider_template_id": "tpl_x",
    }).json()
    lead_id = client.post("/api/leads", json={"name": "Ravi", "phone": "9876543210"}).json()["id"]
    resp = client.post("/api/whatsapp/send", json={"template_id": tpl["id"], "lead_id": lead_id})
    assert resp.status_code == 400
    assert db.query(WhatsAppMessage).count() == 0


def test_send_without_phone_is_400(client, db):
    company, _ = _admin(client, db, "WAP")
    _connect(db, company.id)
    tpl = client.post("/api/whatsapp/templates", json={
        "name": "Hello", "provider_template_id": "tpl_x",
    }).json()
    lead_id = client.post("/api/leads", json={"name": "No Phone"}).json()["id"]
    resp = client.post("/api/whatsapp/send", json={"template_id": tpl["id"], "lead_id": lead_id})
    assert resp.status_code == 400
