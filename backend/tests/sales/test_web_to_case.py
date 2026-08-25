import pytest

from app.models.sales.support_case import SupportCase
from app.utils.rate_limit import auth_limiter, public_form_limiter
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_client, create_company


@pytest.fixture(autouse=True)
def _reset_limiters():
    auth_limiter._buckets.clear()
    public_form_limiter._buckets.clear()
    yield


def test_web_to_case_creates_and_matches_client(client, db):
    company = create_company(db, name="Acme", company_code="WCA")
    create_client(db, company_id=company.id, name="Pat", email="pat@x.com")
    admin = create_active_user(db, email="admin@wca.com", role="admin", company_id=company.id)
    login_user(client, admin.email)
    slug = client.get("/api/cases/form").json()["slug"]

    resp = client.post(f"/api/public/cases/{slug}/submit", json={
        "name": "Pat", "email": "pat@x.com", "subject": "Leak", "body": "Help",
        "website": "",
    })
    assert resp.status_code == 201, resp.text
    assert resp.json() == {"ok": True}
    row = db.query(SupportCase).filter(SupportCase.company_id == company.id).one()
    assert row.source == "web"
    assert row.client_id is not None


def test_honeypot_skips_insert(client, db):
    company = create_company(db, name="Acme", company_code="WCB")
    admin = create_active_user(db, email="admin@wcb.com", role="admin", company_id=company.id)
    login_user(client, admin.email)
    slug = client.get("/api/cases/form").json()["slug"]
    resp = client.post(f"/api/public/cases/{slug}/submit", json={
        "name": "Bot", "email": "b@x.com", "subject": "X", "body": "Y",
        "website": "http://spam",
    })
    assert resp.status_code == 201
    assert db.query(SupportCase).filter(SupportCase.company_id == company.id).count() == 0


def test_unknown_slug_404(client, db):
    assert client.get("/api/public/cases/no-such").status_code == 404
    assert client.post("/api/public/cases/no-such/submit", json={
        "name": "A", "email": "a@x.com", "subject": "S", "body": "B",
    }).status_code == 404


def test_other_company_cannot_read_web_case(client, db):
    a = create_company(db, name="A", company_code="WCC")
    admin_a = create_active_user(db, email="admin@wcc.com", role="admin", company_id=a.id)
    login_user(client, admin_a.email)
    slug = client.get("/api/cases/form").json()["slug"]
    client.post(f"/api/public/cases/{slug}/submit", json={
        "name": "Pat", "email": "p@x.com", "subject": "S", "body": "B",
    })
    case_id = client.get("/api/cases").json()["items"][0]["id"]

    b = create_company(db, name="B", company_code="WCD")
    admin_b = create_active_user(db, email="admin@wcd.com", role="admin", company_id=b.id)
    login_user(client, admin_b.email)
    assert client.get(f"/api/cases/{case_id}").status_code == 404
