from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_client, create_company


def _admin(client, db, code, role="admin"):
    company = create_company(db, name=f"Co {code}", company_code=code)
    user = create_active_user(
        db, email=f"{role}@{code.lower()}.com", role=role, company_id=company.id
    )
    login_user(client, user.email)
    return company, user


def test_create_list_and_close(client, db):
    company, _ = _admin(client, db, "CSA1")
    cl = create_client(db, company_id=company.id, name="Acme", email="a@x.com")
    created = client.post("/api/cases", json={
        "subject": "Leak", "body": "Roof drip", "client_id": cl.id,
    })
    assert created.status_code == 201, created.text
    cid = created.json()["id"]
    assert created.json()["status"] == "open"
    listed = client.get("/api/cases", params={"client_id": cl.id})
    assert listed.json()["total"] == 1
    patched = client.patch(f"/api/cases/{cid}", json={"status": "closed"})
    assert patched.json()["status"] == "closed"


def test_sales_can_create(client, db):
    _admin(client, db, "CSA2", role="sales")
    resp = client.post("/api/cases", json={"subject": "Q", "body": "Help"})
    assert resp.status_code == 201, resp.text


def test_sales_cannot_delete(client, db):
    company, admin = _admin(client, db, "CSA3")
    cid = client.post("/api/cases", json={"subject": "Q", "body": "Help"}).json()["id"]
    create_active_user(db, email="sa@csa3.com", role="sales", company_id=company.id)
    login_user(client, "sa@csa3.com")
    assert client.delete(f"/api/cases/{cid}").status_code == 403
    login_user(client, admin.email)
    assert client.delete(f"/api/cases/{cid}").status_code == 204


def test_form_returns_public_path(client, db):
    _admin(client, db, "CSA4")
    got = client.get("/api/cases/form")
    assert got.status_code == 200, got.text
    assert got.json()["is_active"] is True
    assert got.json()["public_path"].startswith("/c/")
    patched = client.patch("/api/cases/form", json={"is_active": False})
    assert patched.json()["is_active"] is False
