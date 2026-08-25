from unittest.mock import patch

import pytest

from app.models.core.company_settings import CompanySettings
from app.utils.rate_limit import auth_limiter
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company

NO_ACCESS = (403, 404)


@pytest.fixture(autouse=True)
def _reset_auth():
    auth_limiter._buckets.clear()
    yield


def test_cannot_send_whatsapp_to_other_company_lead(client, db):
    a = create_company(db, name="A", company_code="WXA")
    b = create_company(db, name="B", company_code="WXB")
    create_active_user(db, email="admin@a.com", role="admin", company_id=a.id)
    create_active_user(db, email="admin@b.com", role="admin", company_id=b.id)
    for company in (a, b):
        row = CompanySettings(company_id=company.id, company_name=company.name)
        row.whatsapp_api_key = "secret"
        row.whatsapp_source = "917834811114"
        db.add(row)
    db.commit()

    login_user(client, "admin@a.com")
    tpl = client.post("/api/whatsapp/templates", json={
        "name": "A tpl", "provider_template_id": "a1",
    }).json()
    lead_id = client.post("/api/leads", json={"name": "A lead", "phone": "9876543210"}).json()["id"]

    login_user(client, "admin@b.com")
    with patch("app.routers.sales.whatsapp.post_gupshup_template", return_value=(True, "ok")):
        send = client.post("/api/whatsapp/send", json={"template_id": tpl["id"], "lead_id": lead_id})
    assert send.status_code in NO_ACCESS

    listed = client.get("/api/whatsapp/templates")
    assert listed.status_code == 200
    assert listed.json()["total"] == 0
    assert client.get(f"/api/whatsapp/templates/{tpl['id']}").status_code in NO_ACCESS
