from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


def _login(client, db, code):
    company = create_company(db, name=f"Co {code}", company_code=code)
    user = create_active_user(db, email=f"admin@{code.lower()}.com",
                              role="admin", company_id=company.id)
    login_user(client, user.email)
    return company, user


def test_lead_score_persisted_on_create(client, db):
    company, _ = _login(client, db, "SP1")
    client.post("/api/scoring/rules", json={
        "entity_type": "lead", "field": "source",
        "operator": "eq", "value": "Referral", "points": 20,
    })
    resp = client.post("/api/leads", json={"name": "A", "source": "Referral"})
    assert resp.status_code == 201, resp.text
    lead_id = resp.json()["id"]
    detail = client.get(f"/api/leads/{lead_id}").json()
    assert detail.get("score") == 20


def test_list_min_score_filter_and_sort(client, db):
    company, _ = _login(client, db, "SP2")
    client.post("/api/scoring/rules", json={
        "entity_type": "lead", "field": "source",
        "operator": "eq", "value": "Referral", "points": 30,
    })
    client.post("/api/leads", json={"name": "hi", "source": "Referral"})
    client.post("/api/leads", json={"name": "lo", "source": "Cold"})
    filtered = client.get("/api/leads?min_score=10").json()["items"]
    assert [l["name"] for l in filtered] == ["hi"]
    ordered = client.get("/api/leads?sort=score").json()["items"]
    assert ordered[0]["name"] == "hi"
    assert all("score" in l for l in ordered)
