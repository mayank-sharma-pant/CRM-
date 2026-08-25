"""API keys and /api/v1 resources must obey the Phase-0 gate."""

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
def two_companies(client, db):
    a = create_company(db, name="A", company_code="AKA")
    b = create_company(db, name="B", company_code="AKB")
    create_active_user(db, email="admin@a.com", role="admin", company_id=a.id)
    create_active_user(db, email="admin@b.com", role="admin", company_id=b.id)
    login_user(client, "admin@a.com")
    minted = client.post("/api/api-keys", json={"name": "A key", "access": "write"})
    assert minted.status_code == 201, minted.text
    key_id = minted.json()["id"]
    token_a = minted.json()["token"]
    client.headers["Authorization"] = f"Bearer {token_a}"
    lead = client.post("/api/v1/leads", json={"name": "A lead"})
    assert lead.status_code == 201, lead.text
    lead_id = lead.json()["id"]
    client_row = client.post("/api/v1/clients", json={"name": "A client"})
    assert client_row.status_code == 201
    inv = client.post("/api/v1/invoices", json={
        "client_id": client_row.json()["id"],
        "items": [{"description": "Work", "quantity": 1, "unit_price": 10}],
    })
    assert inv.status_code == 201, inv.text
    client.headers.pop("Authorization", None)
    return {
        "key_id": key_id,
        "token_a": token_a,
        "lead_id": lead_id,
        "invoice_id": inv.json()["id"],
    }


def test_owner_key_reads_own_lead_and_invoice(client, two_companies):
    client.headers["Authorization"] = f"Bearer {two_companies['token_a']}"
    assert client.get(f"/api/v1/leads/{two_companies['lead_id']}").status_code == 200
    assert client.get(f"/api/v1/invoices/{two_companies['invoice_id']}").status_code == 200


def test_cross_tenant_cannot_revoke_other_company_key(client, two_companies):
    login_user(client, "admin@b.com")
    assert client.delete(f"/api/api-keys/{two_companies['key_id']}").status_code in NO_ACCESS
    login_user(client, "admin@a.com")
    listed = client.get("/api/api-keys")
    assert listed.status_code == 200
    assert any(item["id"] == two_companies["key_id"] for item in listed.json()["items"])


def test_cross_tenant_key_cannot_read_other_company_records(client, db, two_companies):
    login_user(client, "admin@b.com")
    minted = client.post("/api/api-keys", json={"name": "B key", "access": "write"})
    assert minted.status_code == 201, minted.text
    client.headers["Authorization"] = f"Bearer {minted.json()['token']}"
    assert client.get(f"/api/v1/leads/{two_companies['lead_id']}").status_code == 404
    assert client.get(f"/api/v1/invoices/{two_companies['invoice_id']}").status_code == 404
    client.headers["Authorization"] = f"Bearer {two_companies['token_a']}"
    assert client.get(f"/api/v1/leads/{two_companies['lead_id']}").status_code == 200
    assert client.get(f"/api/v1/invoices/{two_companies['invoice_id']}").status_code == 200
