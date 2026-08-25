from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


def _login(client, db, code, role="admin"):
    company = create_company(db, name=f"Co {code}", company_code=code)
    user = create_active_user(db, email=f"{role}@{code.lower()}.com",
                              role=role, company_id=company.id)
    login_user(client, user.email)
    return company, user


def test_create_and_list_rule(client, db):
    _login(client, db, "SCA")
    resp = client.post("/api/scoring/rules", json={
        "entity_type": "lead", "field": "source",
        "operator": "eq", "value": "Referral", "points": 20,
    })
    assert resp.status_code == 201, resp.text
    rid = resp.json()["id"]
    listed = client.get("/api/scoring/rules?entity_type=lead").json()
    assert any(r["id"] == rid for r in listed["items"])


def test_reject_unknown_field(client, db):
    _login(client, db, "SCB")
    resp = client.post("/api/scoring/rules", json={
        "entity_type": "lead", "field": "secret_sauce",
        "operator": "eq", "value": "x", "points": 5,
    })
    assert resp.status_code == 400


def test_reject_operator_not_valid_for_field(client, db):
    _login(client, db, "SCC")
    resp = client.post("/api/scoring/rules", json={
        "entity_type": "lead", "field": "email",
        "operator": "gt", "value": "5", "points": 5,
    })
    assert resp.status_code == 400


def test_sales_cannot_create_rule(client, db):
    _login(client, db, "SCD", role="sales")
    resp = client.post("/api/scoring/rules", json={
        "entity_type": "lead", "field": "source",
        "operator": "eq", "value": "Referral", "points": 20,
    })
    assert resp.status_code == 403


def test_recompute_endpoint(client, db):
    company, _ = _login(client, db, "SCE")
    client.post("/api/scoring/rules", json={
        "entity_type": "lead", "field": "email",
        "operator": "is_set", "points": 5,
    })
    resp = client.post("/api/scoring/recompute", json={"entity_type": "lead"})
    assert resp.status_code == 200, resp.text
    assert "updated" in resp.json()


def test_delete_rule(client, db):
    _login(client, db, "SCF")
    rid = client.post("/api/scoring/rules", json={
        "entity_type": "deal", "field": "amount",
        "operator": "gte", "value": "10000", "points": 15,
    }).json()["id"]
    assert client.delete(f"/api/scoring/rules/{rid}").status_code == 204
    assert client.delete(f"/api/scoring/rules/{rid}").status_code == 404
