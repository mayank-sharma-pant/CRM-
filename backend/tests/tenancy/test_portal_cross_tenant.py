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


def test_cross_tenant_cannot_share_or_read_portal(client, db):
    a = create_company(db, name="A", company_code="PTA")
    b = create_company(db, name="B", company_code="PTB")
    admin_a = create_active_user(db, email="admin@pta.com", role="admin", company_id=a.id)
    create_active_user(db, email="admin@ptb.com", role="admin", company_id=b.id)
    login_user(client, "admin@pta.com")
    buyer = create_client(db, company_id=a.id, name="Buyer", assigned_to_id=admin_a.id)
    inv = client.post(
        "/api/invoices",
        json={
            "client_id": buyer.id,
            "items": [{"description": "Work", "quantity": 1, "unit_price": 100}],
        },
    )
    assert inv.status_code == 201, inv.text
    inv = inv.json()
    mint = client.post(f"/api/invoices/{inv['id']}/share")
    assert mint.status_code == 200
    token = mint.json()["token"]
    iid = inv["id"]

    login_user(client, "admin@ptb.com")
    assert client.post(f"/api/invoices/{iid}/share").status_code == 404
    assert client.delete(f"/api/invoices/{iid}/share").status_code == 404

    _clear_auth(client)
    assert client.get(f"/api/portal/invoices/{token}").status_code == 200
    assert client.get("/api/portal/invoices/not-a-real-token").status_code == 404

    login_user(client, "admin@pta.com")
    assert client.delete(f"/api/invoices/{iid}/share").status_code == 204


def test_cross_tenant_cannot_share_quote(client, db):
    a = create_company(db, name="A", company_code="PQA")
    b = create_company(db, name="B", company_code="PQB")
    admin_a = create_active_user(db, email="admin@pqa.com", role="admin", company_id=a.id)
    create_active_user(db, email="admin@pqb.com", role="admin", company_id=b.id)
    login_user(client, "admin@pqa.com")
    buyer = create_client(db, company_id=a.id, name="Buyer", assigned_to_id=admin_a.id)
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

    login_user(client, "admin@pqb.com")
    assert client.post(f"/api/quotes/{qid}/share").status_code == 404
