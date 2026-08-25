import pytest

from app.utils.rate_limit import auth_limiter
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


@pytest.fixture(autouse=True)
def _reset_auth():
    auth_limiter._buckets.clear()
    yield


def test_cross_tenant_cannot_edit_blueprint_config(client, db):
    a = create_company(db, name="A", company_code="BPA")
    b = create_company(db, name="B", company_code="BPB")
    create_active_user(db, email="admin@a.com", role="admin", company_id=a.id)
    create_active_user(db, email="admin@b.com", role="admin", company_id=b.id)
    login_user(client, "admin@a.com")
    deal = client.post("/api/deals", json={"title": "A deal", "amount": "10"}).json()
    pid = deal["pipeline_id"]
    sid = deal["stage_id"]
    assert client.patch(f"/api/deals/pipelines/{pid}", json={"blueprint_enabled": True}).status_code == 200

    login_user(client, "admin@b.com")
    assert client.patch(f"/api/deals/pipelines/{pid}", json={"blueprint_enabled": False}).status_code == 404
    assert client.patch(f"/api/deals/stages/{sid}", json={"required_fields": ["amount"]}).status_code == 404

    login_user(client, "admin@a.com")
    assert client.patch(f"/api/deals/pipelines/{pid}", json={"blueprint_enabled": True}).status_code == 200
    assert client.patch(f"/api/deals/stages/{sid}", json={"required_fields": ["amount"]}).status_code == 200
