from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


def _admin(client, db, code):
    company = create_company(db, name=f"Co {code}", company_code=code)
    user = create_active_user(
        db, email=f"admin@{code.lower()}.com", role="admin", company_id=company.id
    )
    login_user(client, user.email)
    return company, user


def test_foreign_module_and_record_404(client, db):
    _, admin_a = _admin(client, db, "CMXA")
    login_user(client, admin_a.email)
    mod_id = client.post("/api/modules", json={"name": "Sites", "slug": "sites"}).json()["id"]
    rid = client.post(f"/api/modules/{mod_id}/records", json={"title": "A"}).json()["id"]

    _, admin_b = _admin(client, db, "CMXB")
    login_user(client, admin_b.email)
    assert client.get(f"/api/modules/{mod_id}").status_code == 404
    assert client.patch(f"/api/modules/{mod_id}", json={"name": "Hack"}).status_code == 404
    assert client.delete(f"/api/modules/{mod_id}").status_code == 404
    assert client.get(f"/api/modules/{mod_id}/records/{rid}").status_code == 404
    assert client.patch(f"/api/modules/{mod_id}/records/{rid}", json={"title": "x"}).status_code == 404
    assert client.delete(f"/api/modules/{mod_id}/records/{rid}").status_code == 404

    login_user(client, admin_a.email)
    assert client.get(f"/api/modules/{mod_id}").status_code == 200
    assert client.get(f"/api/modules/{mod_id}/records/{rid}").status_code == 200
    assert client.get("/api/modules").json()["total"] == 1
