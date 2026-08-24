"""Lead tags, recycle bin (soft delete), and merge duplicates."""
import pytest

from app.models.sales.lead import Lead
from app.models.sales.note import Note
from app.utils.rate_limit import auth_limiter
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


@pytest.fixture(autouse=True)
def _reset_auth():
    auth_limiter._buckets.clear()
    yield


def _admin(client, db, code="TG1"):
    company = create_company(db, name=f"Co {code}", company_code=code)
    admin = create_active_user(db, email=f"admin@{code.lower()}.com", role="admin", company_id=company.id)
    login_user(client, admin.email)
    return company, admin


def test_set_and_list_lead_tags(client, db):
    _admin(client, db, "TGA")
    lead_id = client.post("/api/leads", json={"name": "Ravi"}).json()["id"]

    patched = client.patch(f"/api/leads/{lead_id}", json={"tags": ["Hot", "site-visit"]})
    assert patched.status_code == 200, patched.text

    got = client.get(f"/api/leads/{lead_id}")
    assert got.status_code == 200
    assert got.json()["tags"] == ["hot", "site-visit"]

    listed = client.get("/api/tags")
    assert listed.status_code == 200
    names = {t["name"] for t in listed.json()["items"]}
    assert names == {"hot", "site-visit"}


def test_tags_are_company_scoped(client, db):
    _admin(client, db, "TGB")
    lead_id = client.post("/api/leads", json={"name": "A"}).json()["id"]
    client.patch(f"/api/leads/{lead_id}", json={"tags": ["vip"]})

    other = create_company(db, name="Other", company_code="TGO")
    create_active_user(db, email="admin@tgo.com", role="admin", company_id=other.id)
    login_user(client, "admin@tgo.com")
    assert client.get("/api/tags").json()["items"] == []
    assert client.get(f"/api/leads/{lead_id}").status_code == 404


def test_delete_moves_lead_to_trash_and_restore_returns_it(client, db):
    _admin(client, db, "TGC")
    lead_id = client.post("/api/leads", json={"name": "Bin Me"}).json()["id"]

    deleted = client.delete(f"/api/leads/{lead_id}")
    assert deleted.status_code == 200, deleted.text
    assert client.get(f"/api/leads/{lead_id}").status_code == 404
    assert all(item["id"] != lead_id for item in client.get("/api/leads").json()["items"])

    trash = client.get("/api/leads/trash")
    assert trash.status_code == 200
    assert trash.json()["total"] == 1
    assert trash.json()["items"][0]["id"] == lead_id

    restored = client.post(f"/api/leads/{lead_id}/restore")
    assert restored.status_code == 200, restored.text
    assert client.get(f"/api/leads/{lead_id}").status_code == 200
    assert client.get("/api/leads/trash").json()["total"] == 0


def test_purge_hard_deletes_and_is_company_scoped(client, db):
    company, _ = _admin(client, db, "TGD")
    lead_id = client.post("/api/leads", json={"name": "Gone"}).json()["id"]
    client.delete(f"/api/leads/{lead_id}")

    other = create_company(db, name="Other", company_code="TGP")
    create_active_user(db, email="admin@tgp.com", role="admin", company_id=other.id)
    login_user(client, "admin@tgp.com")
    assert client.post(f"/api/leads/{lead_id}/purge").status_code == 404

    login_user(client, f"admin@{company.company_code.lower()}.com")
    purged = client.post(f"/api/leads/{lead_id}/purge")
    assert purged.status_code == 200, purged.text
    assert db.query(Lead).filter(Lead.id == lead_id).first() is None
    assert client.get("/api/leads/trash").json()["total"] == 0


def test_merge_moves_notes_fills_empty_fields_and_trashes_source(client, db):
    company, admin = _admin(client, db, "TGE")
    keep_id = client.post("/api/leads", json={"name": "Keep", "email": "keep@x.com"}).json()["id"]
    source = Lead(
        company_id=company.id,
        name="Dup",
        phone="9876543210",
        created_by_id=admin.id,
    )
    db.add(source)
    db.flush()
    db.add(Note(company_id=company.id, lead_id=source.id, content="Called Tuesday", created_by_id=admin.id))
    db.commit()
    source_id = source.id

    merged = client.post(f"/api/leads/{keep_id}/merge", json={"source_id": source_id})
    assert merged.status_code == 200, merged.text

    keep = client.get(f"/api/leads/{keep_id}").json()
    assert keep["phone"] == "9876543210"
    assert keep["email"] == "keep@x.com"
    notes = keep.get("notes_list") or keep.get("notes") or []
    if isinstance(notes, str):
        notes = keep["notes_list"]
    assert any("Called Tuesday" in (n.get("content") or n.get("body") or "") for n in notes)

    assert client.get(f"/api/leads/{source_id}").status_code == 404
    trash_ids = [i["id"] for i in client.get("/api/leads/trash").json()["items"]]
    assert source_id in trash_ids


def test_duplicates_lists_same_email_in_company(client, db):
    company, admin = _admin(client, db, "TGF")
    a = Lead(company_id=company.id, name="One", email="same@x.com", created_by_id=admin.id)
    b = Lead(company_id=company.id, name="Two", email="same@x.com", created_by_id=admin.id)
    db.add_all([a, b])
    db.commit()

    resp = client.get("/api/leads/duplicates", params={"lead_id": a.id})
    assert resp.status_code == 200, resp.text
    ids = {item["id"] for item in resp.json()["items"]}
    assert ids == {b.id}


def test_merge_is_company_scoped(client, db):
    company, admin = _admin(client, db, "TGG")
    keep_id = client.post("/api/leads", json={"name": "Keep"}).json()["id"]
    other = create_company(db, name="Other", company_code="TGH")
    source = Lead(company_id=other.id, name="Foreign")
    db.add(source)
    db.commit()

    resp = client.post(f"/api/leads/{keep_id}/merge", json={"source_id": source.id})
    assert resp.status_code == 404
    assert db.query(Lead).filter(Lead.id == source.id).one().deleted_at is None
    _ = admin
