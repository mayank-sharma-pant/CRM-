import pytest

from app.utils.rate_limit import auth_limiter
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company, create_client


@pytest.fixture(autouse=True)
def _reset_auth_rate_limit():
    auth_limiter._buckets.clear()
    yield


def test_cross_tenant_product_is_404_and_foreign_product_id_is_400(client, db):
    a = create_company(db, name="A", company_code="PXA")
    b = create_company(db, name="B", company_code="PXB")
    create_active_user(db, email="admin@a.com", role="admin", company_id=a.id)
    create_active_user(db, email="admin@b.com", role="admin", company_id=b.id)
    buyer_b = create_client(db, company_id=b.id, name="B buyer")
    login_user(client, "admin@a.com")
    created = client.post("/api/products", json={"name": "A item", "unit_price": 10, "tax_rate": 18})
    assert created.status_code == 201, created.text
    pid = created.json()["id"]
    assert client.get(f"/api/products/{pid}").status_code == 200

    login_user(client, "admin@b.com")
    assert client.get(f"/api/products/{pid}").status_code == 404
    assert client.patch(f"/api/products/{pid}", json={"name": "stolen"}).status_code == 404
    assert client.delete(f"/api/products/{pid}").status_code == 404
    listed = client.get("/api/products")
    assert listed.status_code == 200
    assert listed.json()["total"] == 0
    inv = client.post("/api/invoices", json={
        "client_id": buyer_b.id,
        "items": [{"product_id": pid, "description": "x", "quantity": 1, "unit_price": 10}],
    })
    assert inv.status_code == 400

    login_user(client, "admin@a.com")
    assert client.get(f"/api/products/{pid}").status_code == 200
    assert client.patch(f"/api/products/{pid}", json={"name": "A item 2"}).status_code == 200
