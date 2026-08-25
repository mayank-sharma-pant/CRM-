from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


def _admin(client, db, code):
    company = create_company(db, name=f"Co {code}", company_code=code)
    user = create_active_user(
        db, email=f"admin@{code.lower()}.com", role="admin", company_id=company.id
    )
    login_user(client, user.email)
    return company, user


def test_foreign_case_404(client, db):
    _, admin_a = _admin(client, db, "CSXA")
    login_user(client, admin_a.email)
    cid = client.post("/api/cases", json={"subject": "A", "body": "B"}).json()["id"]

    _, admin_b = _admin(client, db, "CSXB")
    login_user(client, admin_b.email)
    assert client.get(f"/api/cases/{cid}").status_code == 404
    assert client.patch(f"/api/cases/{cid}", json={"status": "closed"}).status_code == 404
    assert client.delete(f"/api/cases/{cid}").status_code == 404
    assert client.get("/api/cases").json()["total"] == 0

    login_user(client, admin_a.email)
    assert client.get(f"/api/cases/{cid}").status_code == 200
