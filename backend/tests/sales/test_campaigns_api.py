from unittest.mock import patch

from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


def _admin(client, db, code, role="admin"):
    company = create_company(db, name=f"Co {code}", company_code=code)
    user = create_active_user(
        db, email=f"{role}@{code.lower()}.com", role=role, company_id=company.id
    )
    login_user(client, user.email)
    return company, user


@patch("app.services.sales.crm_email.send_email", return_value=True)
def test_create_and_send_campaign(mock_send, client, db):
    _admin(client, db, "CAPI1")
    client.post("/api/leads", json={"name": "Ravi", "email": "ravi@x.com"})
    created = client.post("/api/campaigns", json={
        "name": "Spring", "subject": "Hi", "body": "Hello", "audience": "leads",
    })
    assert created.status_code == 201, created.text
    cid = created.json()["id"]
    assert created.json()["status"] == "draft"
    listed = client.get("/api/campaigns")
    assert listed.json()["total"] == 1
    sent = client.post(f"/api/campaigns/{cid}/send")
    assert sent.status_code == 200, sent.text
    assert sent.json()["sent"] == 1
    got = client.get(f"/api/campaigns/{cid}")
    assert got.json()["status"] == "sent"
    assert len(got.json()["recipients"]) == 1
    mock_send.assert_called()


def test_sales_cannot_create(client, db):
    _admin(client, db, "CAPI2", role="sales")
    resp = client.post("/api/campaigns", json={
        "name": "X", "subject": "Hi", "body": "Hello", "audience": "leads",
    })
    assert resp.status_code == 403


def test_sales_can_list(client, db):
    company, _ = _admin(client, db, "CAPI3")
    client.post("/api/campaigns", json={
        "name": "Spring", "subject": "Hi", "body": "Hello", "audience": "leads",
    })
    create_active_user(db, email="sa@capi3.com", role="sales", company_id=company.id)
    login_user(client, "sa@capi3.com")
    listed = client.get("/api/campaigns")
    assert listed.status_code == 200
    assert listed.json()["total"] == 1


def test_delete_campaign(client, db):
    _admin(client, db, "CAPI4")
    cid = client.post("/api/campaigns", json={
        "name": "X", "subject": "Hi", "body": "Hello", "audience": "clients",
    }).json()["id"]
    assert client.delete(f"/api/campaigns/{cid}").status_code == 204
    assert client.get(f"/api/campaigns/{cid}").status_code == 404
