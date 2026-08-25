from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


def _admin(client, db, code, role="admin"):
    company = create_company(db, name=f"Co {code}", company_code=code)
    user = create_active_user(
        db, email=f"{role}@{code.lower()}.com", role=role, company_id=company.id
    )
    login_user(client, user.email)
    return company, user


def test_list_and_install(client, db):
    _admin(client, db, "MPAPI1")
    listed = client.get("/api/marketplace/apps")
    assert listed.status_code == 200, listed.text
    body = listed.json()
    assert body["total"] == 9
    slugs = {a["slug"] for a in body["apps"]}
    assert "scoring" in slugs
    assert all(a["status"] == "not_installed" for a in body["apps"])

    inst = client.post("/api/marketplace/apps/scoring/install")
    assert inst.status_code == 200, inst.text
    assert inst.json()["status"] == "installed"
    assert inst.json()["settings_href"] == "/settings/scoring"

    listed = client.get("/api/marketplace/apps").json()
    scoring = next(a for a in listed["apps"] if a["slug"] == "scoring")
    assert scoring["status"] == "installed"

    history = client.get("/api/marketplace/installs")
    assert history.status_code == 200
    assert history.json()["total"] == 1


def test_unknown_app_is_400(client, db):
    _admin(client, db, "MPAPI2")
    resp = client.post("/api/marketplace/apps/deluge/install")
    assert resp.status_code == 400


def test_sales_can_list_not_install(client, db):
    _admin(client, db, "MPAPI3", role="sales")
    listed = client.get("/api/marketplace/apps")
    assert listed.status_code == 200
    assert client.post("/api/marketplace/apps/scoring/install").status_code == 403
    assert client.delete("/api/marketplace/apps/scoring").status_code == 403
    assert client.get("/api/marketplace/installs").status_code == 403


def test_uninstall(client, db):
    _admin(client, db, "MPAPI4")
    client.post("/api/marketplace/apps/email/install")
    resp = client.delete("/api/marketplace/apps/email")
    assert resp.status_code == 200, resp.text
    assert resp.json()["status"] == "uninstalled"
    missing = client.delete("/api/marketplace/apps/email")
    assert missing.status_code == 404
