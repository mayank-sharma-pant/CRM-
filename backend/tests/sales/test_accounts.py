from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_client, create_company


def _admin(client, db, code="ACC1"):
    company = create_company(db, name=f"Co {code}", company_code=code)
    admin = create_active_user(
        db, email=f"admin@{code.lower()}.com", role="admin", company_id=company.id, full_name="Admin"
    )
    login_user(client, admin.email)
    return company, admin


def test_list_accounts_empty(client, db):
    _admin(client, db, "ACA")
    resp = client.get("/api/accounts")
    assert resp.status_code == 200, resp.text
    assert resp.json()["items"] == []
    assert resp.json()["total"] == 0


def test_create_get_and_link_client(client, db):
    company, _ = _admin(client, db, "ACB")
    created = client.post("/api/accounts", json={"name": "Acme HVAC", "website": "https://acme.example"})
    assert created.status_code == 201, created.text
    acc = created.json()
    assert acc["name"] == "Acme HVAC"
    assert acc["contact_count"] == 0

    shown = client.get(f"/api/accounts/{acc['id']}")
    assert shown.status_code == 200
    assert shown.json()["contacts"] == []

    person = create_client(db, company_id=company.id, name="Pat Buyer")
    linked = client.put(f"/api/clients/{person.id}", json={"account_id": acc["id"]})
    assert linked.status_code == 200, linked.text

    detail = client.get(f"/api/clients/{person.id}")
    assert detail.status_code == 200
    assert detail.json()["account_id"] == acc["id"]
    assert detail.json()["account_name"] == "Acme HVAC"

    listed = client.get("/api/clients").json()["items"]
    row = next(x for x in listed if x["id"] == person.id)
    assert row["account_id"] == acc["id"]
    assert row["account_name"] == "Acme HVAC"

    acc_detail = client.get(f"/api/accounts/{acc['id']}").json()
    assert acc_detail["contact_count"] == 1
    assert acc_detail["contacts"][0]["id"] == person.id
    assert acc_detail["contacts"][0]["name"] == "Pat Buyer"


def test_create_client_with_account_id(client, db):
    company, admin = _admin(client, db, "ACC")
    acc = client.post("/api/accounts", json={"name": "Org"}).json()
    resp = client.post("/api/clients", json={
        "name": "New Contact",
        "account_id": acc["id"],
        "assigned_to_id": admin.id,
        "team_id": None,
    })
    assert resp.status_code == 201, resp.text
    cid = resp.json()["id"]
    body = client.get(f"/api/clients/{cid}").json()
    assert body["account_id"] == acc["id"]


def test_foreign_account_is_404(client, db):
    _admin(client, db, "ACD")
    other = create_company(db, name="Other", company_code="ACE")
    from app.models.sales.account import Account
    foreign = Account(company_id=other.id, name="Secret")
    db.add(foreign)
    db.commit()
    db.refresh(foreign)
    assert client.get(f"/api/accounts/{foreign.id}").status_code == 404
    person_co, _ = _admin(client, db, "ACF")
    # re-login last admin is ACF; create client there and try other account
    person = create_client(db, company_id=person_co.id, name="Local")
    assert client.put(f"/api/clients/{person.id}", json={"account_id": foreign.id}).status_code == 404


def test_unlink_and_delete_rules(client, db):
    company, _ = _admin(client, db, "ACG")
    acc = client.post("/api/accounts", json={"name": "Hold"}).json()
    person = create_client(db, company_id=company.id, name="Linked")
    assert client.put(f"/api/clients/{person.id}", json={"account_id": acc["id"]}).status_code == 200
    assert client.delete(f"/api/accounts/{acc['id']}").status_code == 409
    assert client.put(f"/api/clients/{person.id}", json={"account_id": None}).status_code == 200
    assert client.get(f"/api/clients/{person.id}").json()["account_id"] is None
    assert client.delete(f"/api/accounts/{acc['id']}").status_code == 204
    assert client.get(f"/api/accounts/{acc['id']}").status_code == 404
