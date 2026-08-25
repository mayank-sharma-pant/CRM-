from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


def _admin(client, db, code, role="admin"):
    company = create_company(db, name=f"Co {code}", company_code=code)
    user = create_active_user(
        db, email=f"{role}@{code.lower()}.com", role=role, company_id=company.id
    )
    login_user(client, user.email)
    return company, user


def test_create_module_field_and_record(client, db):
    _admin(client, db, "CMAPI1")
    created = client.post("/api/modules", json={"name": "Sites", "slug": "sites"})
    assert created.status_code == 201, created.text
    mod_id = created.json()["id"]
    field = client.post(f"/api/modules/{mod_id}/fields", json={
        "name": "Kind", "field_key": "kind", "field_type": "picklist",
        "options": ["Roof", "Bath"],
    })
    assert field.status_code == 201, field.text
    rec = client.post(f"/api/modules/{mod_id}/records", json={
        "title": "Site A", "values": {"kind": "Roof"},
    })
    assert rec.status_code == 201, rec.text
    listed = client.get(f"/api/modules/{mod_id}/records")
    assert listed.json()["total"] == 1
    rid = rec.json()["id"]
    got = client.get(f"/api/modules/{mod_id}/records/{rid}")
    assert got.json()["values"]["kind"] == "Roof"
    patched = client.patch(f"/api/modules/{mod_id}/records/{rid}", json={"title": "Site B"})
    assert patched.json()["title"] == "Site B"
    assert client.delete(f"/api/modules/{mod_id}/records/{rid}").status_code == 204
    assert client.get(f"/api/modules/{mod_id}/records").json()["total"] == 0


def test_sales_cannot_create_module(client, db):
    _admin(client, db, "CMAPI2", role="sales")
    assert client.post("/api/modules", json={"name": "X", "slug": "x"}).status_code == 403


def test_sales_can_list_and_write_records(client, db):
    company, _ = _admin(client, db, "CMAPI3")
    mod_id = client.post("/api/modules", json={"name": "Sites", "slug": "sites"}).json()["id"]
    create_active_user(db, email="sa@cmapi3.com", role="sales", company_id=company.id)
    login_user(client, "sa@cmapi3.com")
    listed = client.get("/api/modules")
    assert listed.status_code == 200
    assert listed.json()["total"] == 1
    rec = client.post(f"/api/modules/{mod_id}/records", json={"title": "Row"})
    assert rec.status_code == 201, rec.text


def test_inactive_module_blocks_writes(client, db):
    _admin(client, db, "CMAPI4")
    mod_id = client.post("/api/modules", json={"name": "Sites", "slug": "sites"}).json()["id"]
    client.patch(f"/api/modules/{mod_id}", json={"is_active": False})
    blocked = client.post(f"/api/modules/{mod_id}/records", json={"title": "Nope"})
    assert blocked.status_code == 400
    hidden = client.get("/api/modules")
    assert hidden.json()["total"] == 0
    shown = client.get("/api/modules", params={"include_inactive": True})
    assert shown.json()["total"] == 1
