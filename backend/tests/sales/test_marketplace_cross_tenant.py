from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


def _admin(client, db, code):
    company = create_company(db, name=f"Co {code}", company_code=code)
    user = create_active_user(
        db, email=f"admin@{code.lower()}.com", role="admin", company_id=company.id
    )
    login_user(client, user.email)
    return company, user


def test_install_does_not_leak_across_companies(client, db):
    _, admin_a = _admin(client, db, "MPXA")
    login_user(client, admin_a.email)
    assert client.post("/api/marketplace/apps/scoring/install").status_code == 200

    _, admin_b = _admin(client, db, "MPXB")
    login_user(client, admin_b.email)
    apps = {a["slug"]: a for a in client.get("/api/marketplace/apps").json()["apps"]}
    assert apps["scoring"]["status"] == "not_installed"
    assert client.get("/api/marketplace/installs").json()["total"] == 0
    assert client.delete("/api/marketplace/apps/scoring").status_code == 404

    login_user(client, admin_a.email)
    apps = {a["slug"]: a for a in client.get("/api/marketplace/apps").json()["apps"]}
    assert apps["scoring"]["status"] == "installed"
    assert client.get("/api/marketplace/installs").json()["total"] == 1
