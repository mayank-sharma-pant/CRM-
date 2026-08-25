from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


def _admin(client, db, code):
    company = create_company(db, name=f"Co {code}", company_code=code)
    user = create_active_user(
        db, email=f"admin@{code.lower()}.com", role="admin", company_id=company.id
    )
    login_user(client, user.email)
    return company, user


def test_foreign_campaign_404(client, db):
    _, admin_a = _admin(client, db, "CPXA")
    login_user(client, admin_a.email)
    cid = client.post("/api/campaigns", json={
        "name": "A", "subject": "Hi", "body": "Hello", "audience": "leads",
    }).json()["id"]

    _, admin_b = _admin(client, db, "CPXB")
    login_user(client, admin_b.email)
    assert client.get(f"/api/campaigns/{cid}").status_code == 404
    assert client.post(f"/api/campaigns/{cid}/send").status_code == 404
    assert client.delete(f"/api/campaigns/{cid}").status_code == 404
    assert client.get("/api/campaigns").json()["total"] == 0

    login_user(client, admin_a.email)
    assert client.get(f"/api/campaigns/{cid}").status_code == 200
    assert client.get("/api/campaigns").json()["total"] == 1
