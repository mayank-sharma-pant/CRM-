from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company

API = "/api/email-templates"


def _company_user(db, *, code, role, email=None):
    company = create_company(db, name=f"Co {code}", company_code=code)
    user = create_active_user(
        db,
        email=email or f"{role}@{code.lower()}.com",
        role=role,
        company_id=company.id,
    )
    return company, user


def test_sales_get_empty_200(client, db):
    _, sales = _company_user(db, code="ET1", role="sales")
    login_user(client, sales.email)
    resp = client.get(API)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["items"] == []
    assert body["total"] == 0


def test_sales_post_403(client, db):
    _, sales = _company_user(db, code="ET2", role="sales")
    login_user(client, sales.email)
    resp = client.post(API, json={"name": "Welcome", "subject": "Hi", "body": "Hello"})
    assert resp.status_code == 403, resp.text


def test_admin_post_201(client, db):
    _, admin = _company_user(db, code="ET3", role="admin")
    login_user(client, admin.email)
    resp = client.post(API, json={"name": "Welcome", "subject": "Hi", "body": "Hello"})
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["name"] == "Welcome"
    assert data["subject"] == "Hi"
    assert data["body"] == "Hello"
    assert data["company_id"] == admin.company_id
    assert data["created_by_id"] == admin.id
    assert "id" in data
    assert "created_at" in data


def test_other_company_get_omits_row(client, db):
    _, admin_a = _company_user(db, code="ETA", role="admin")
    login_user(client, admin_a.email)
    created = client.post(API, json={"name": "A only", "subject": "Hi", "body": "Secret"})
    assert created.status_code == 201, created.text
    foreign_id = created.json()["id"]

    _, sales_b = _company_user(db, code="ETB", role="sales")
    login_user(client, sales_b.email)
    listed = client.get(API)
    assert listed.status_code == 200, listed.text
    ids = [row["id"] for row in listed.json()["items"]]
    assert foreign_id not in ids
    assert listed.json()["total"] == 0

    assert client.get(f"{API}/{foreign_id}").status_code == 404


def test_md_post_201(client, db):
    _, md = _company_user(db, code="ET4", role="md")
    login_user(client, md.email)
    resp = client.post(API, json={"name": "MD note", "subject": "Hi", "body": "Hello"})
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["name"] == "MD note"
    assert data["created_by_id"] == md.id
    assert data["company_id"] == md.company_id


def test_sales_patch_and_delete_403(client, db):
    company, admin = _company_user(db, code="ET5", role="admin")
    login_user(client, admin.email)
    created = client.post(API, json={"name": "Keep", "subject": "Hi", "body": "Hello"})
    assert created.status_code == 201, created.text
    tid = created.json()["id"]
    sales = create_active_user(
        db, email="sales@et5.com", role="sales", company_id=company.id
    )
    login_user(client, sales.email)
    assert client.patch(f"{API}/{tid}", json={"subject": "Nope"}).status_code == 403
    assert client.delete(f"{API}/{tid}").status_code == 403
    login_user(client, admin.email)
    assert client.get(f"{API}/{tid}").status_code == 200


def test_other_company_patch_and_delete_404(client, db):
    _, admin_a = _company_user(db, code="ET6A", role="admin")
    login_user(client, admin_a.email)
    created = client.post(API, json={"name": "A only", "subject": "Hi", "body": "Secret"})
    assert created.status_code == 201, created.text
    foreign_id = created.json()["id"]

    _, admin_b = _company_user(db, code="ET6B", role="admin")
    login_user(client, admin_b.email)
    assert client.patch(f"{API}/{foreign_id}", json={"body": "Stolen"}).status_code == 404
    assert client.delete(f"{API}/{foreign_id}").status_code == 404
    login_user(client, admin_a.email)
    got = client.get(f"{API}/{foreign_id}")
    assert got.status_code == 200
    assert got.json()["body"] == "Secret"
