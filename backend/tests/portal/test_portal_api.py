import pytest

from app.utils.rate_limit import auth_limiter, portal_limiter
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_client, create_company


@pytest.fixture(autouse=True)
def _reset_limiters():
    auth_limiter._buckets.clear()
    portal_limiter._buckets.clear()
    yield


def _clear_auth(client):
    client.cookies.clear()
    client.headers.pop("Authorization", None)


def _make_invoice(client, db, company, admin):
    buyer = create_client(db, company_id=company.id, name="Buyer", assigned_to_id=admin.id)
    res = client.post(
        "/api/invoices",
        json={
            "client_id": buyer.id,
            "items": [{"description": "Job", "quantity": 1, "unit_price": 200}],
        },
    )
    assert res.status_code == 201, res.text
    return res.json()


def test_share_mint_public_get_regenerate_revoke(client, db):
    company = create_company(db, name="A Co", company_code="PCA")
    admin = create_active_user(db, email="admin@pca.com", role="admin", company_id=company.id)
    login_user(client, admin.email)
    inv = _make_invoice(client, db, company, admin)
    iid = inv["id"]
    mint = client.post(f"/api/invoices/{iid}/share")
    assert mint.status_code == 200, mint.text
    body = mint.json()
    assert body["token"]
    assert body["url"] == f"/p/invoice/{body['token']}"
    token = body["token"]
    _clear_auth(client)
    got = client.get(f"/api/portal/invoices/{token}")
    assert got.status_code == 200, got.text
    data = got.json()
    assert data["invoice_number"]
    assert "company_id" not in data
    assert "share_token_hash" not in data
    login_user(client, admin.email)
    mint2 = client.post(f"/api/invoices/{iid}/share").json()
    _clear_auth(client)
    assert client.get(f"/api/portal/invoices/{token}").status_code == 404
    assert client.get(f"/api/portal/invoices/{mint2['token']}").status_code == 200
    login_user(client, admin.email)
    assert client.delete(f"/api/invoices/{iid}/share").status_code == 204
    _clear_auth(client)
    assert client.get(f"/api/portal/invoices/{mint2['token']}").status_code == 404


def test_quote_share_and_public_get(client, db):
    company = create_company(db, name="Q Co", company_code="PCQ")
    admin = create_active_user(db, email="admin@pcq.com", role="admin", company_id=company.id)
    login_user(client, admin.email)
    buyer = create_client(db, company_id=company.id, name="Buyer", assigned_to_id=admin.id)
    deal = client.post(
        "/api/deals",
        json={"title": "Job", "amount": "100", "client_id": buyer.id},
    ).json()
    q = client.post(
        "/api/quotes",
        json={
            "deal_id": deal["id"],
            "client_id": buyer.id,
            "items": [{"description": "Line", "quantity": 1, "unit_price": "50.00"}],
        },
    )
    assert q.status_code == 201, q.text
    qid = q.json()["id"]
    mint = client.post(f"/api/quotes/{qid}/share")
    assert mint.status_code == 200, mint.text
    token = mint.json()["token"]
    _clear_auth(client)
    got = client.get(f"/api/portal/quotes/{token}")
    assert got.status_code == 200, got.text
    assert got.json()["quote_number"]
    assert "company_id" not in got.json()


def test_detail_includes_share_active(client, db):
    company = create_company(db, name="D Co", company_code="PCD")
    admin = create_active_user(db, email="admin@pcd.com", role="admin", company_id=company.id)
    login_user(client, admin.email)
    inv = _make_invoice(client, db, company, admin)
    before = client.get(f"/api/invoices/{inv['id']}").json()
    assert before.get("share_active") is False
    client.post(f"/api/invoices/{inv['id']}/share")
    after = client.get(f"/api/invoices/{inv['id']}").json()
    assert after.get("share_active") is True
    assert after.get("share_created_at")
