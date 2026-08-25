"""Pipeline rows are tenant-scoped. Company B cannot mutate company A's pipeline."""

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
def two_companies_with_pipeline(client, db):
    a = create_company(db, name="A", company_code="COA")
    b = create_company(db, name="B", company_code="COB")
    create_active_user(db, email="admin@a.com", role="admin", company_id=a.id)
    create_active_user(db, email="admin@b.com", role="admin", company_id=b.id)
    login_user(client, "admin@a.com")
    client.post("/api/deals", json={"title": "seed", "amount": "1"})
    pipe = client.post("/api/deals/pipelines", json={"name": "A extra"}).json()
    client.headers.pop("Authorization", None)
    return pipe["id"], "admin@b.com"


def test_owner_can_rename_own_pipeline(client, two_companies_with_pipeline):
    pipe_id, _ = two_companies_with_pipeline
    login_user(client, "admin@a.com")
    assert client.patch(f"/api/deals/pipelines/{pipe_id}", json={"name": "Renamed"}).status_code == 200


def test_cross_tenant_pipeline_patch_denied(client, two_companies_with_pipeline):
    pipe_id, admin_b = two_companies_with_pipeline
    login_user(client, admin_b)
    assert client.patch(f"/api/deals/pipelines/{pipe_id}", json={"name": "Stolen"}).status_code in NO_ACCESS


def test_cross_tenant_pipeline_delete_denied(client, two_companies_with_pipeline):
    pipe_id, admin_b = two_companies_with_pipeline
    login_user(client, admin_b)
    assert client.delete(f"/api/deals/pipelines/{pipe_id}").status_code in NO_ACCESS
