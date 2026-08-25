import json

from app.models.sales.lead import Lead
from app.services.sales.lead_import import suggest_mapping
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


def test_suggest_mapping_aliases():
    headers = ["Full Name", "E-mail", "Mobile", "Organisation", "Service"]
    mapping = suggest_mapping(headers)
    assert mapping["name"] == "Full Name"
    assert mapping["email"] == "E-mail"
    assert mapping["phone"] == "Mobile"
    assert mapping["company"] == "Organisation"
    assert mapping["service_type"] == "Service"


def _setup(db, code="IMP"):
    company = create_company(db, name=f"Co {code}", company_code=code)
    admin = create_active_user(db, email=f"admin@{code}.com", role="admin", company_id=company.id)
    return company, admin


def test_preview_maps_and_flags_duplicate(client, db):
    company, admin = _setup(db)
    db.add(Lead(company_id=company.id, name="Existing", email="dup@x.com", status="New"))
    db.commit()
    login_user(client, admin.email)
    csv_body = b"Full Name,E-mail\nAda,ada@x.com\nDup,dup@x.com\n"
    resp = client.post(
        "/api/import/leads/preview",
        files={"file": ("leads.csv", csv_body, "text/csv")},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["suggested_mapping"]["name"] == "Full Name"
    assert body["suggested_mapping"]["email"] == "E-mail"
    statuses = {row["values"]["email"]: row["status"] for row in body["rows"]}
    assert statuses["ada@x.com"] == "new"
    assert statuses["dup@x.com"] == "duplicate"
    assert body["counts"]["new"] == 1
    assert body["counts"]["duplicate"] == 1


def test_preview_requires_name_mapping(client, db):
    _, admin = _setup(db, code="IM2")
    login_user(client, admin.email)
    resp = client.post(
        "/api/import/leads/preview",
        files={"file": ("leads.csv", b"email\na@b.com\n", "text/csv")},
        data={"mapping": json.dumps({"email": "email"})},
    )
    assert resp.status_code == 400


def test_commit_inserts_new_skips_duplicate(client, db):
    company, admin = _setup(db, code="IM3")
    db.add(Lead(company_id=company.id, name="Existing", email="dup@x.com", status="New"))
    db.commit()
    login_user(client, admin.email)
    csv_body = b"Full Name,E-mail\nAda,ada@x.com\nDup,dup@x.com\n,\n"
    resp = client.post(
        "/api/import/leads/commit",
        files={"file": ("leads.csv", csv_body, "text/csv")},
        data={"mapping": json.dumps({"name": "Full Name", "email": "E-mail"})},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["created"] == 1
    assert body["skipped_duplicate"] == 1
    names = {l.name for l in db.query(Lead).filter(Lead.company_id == company.id).all()}
    assert names == {"Existing", "Ada"}


def test_legacy_import_leads_still_works(client, db):
    company, admin = _setup(db, code="IM4")
    login_user(client, admin.email)
    resp = client.post(
        "/api/import/leads",
        files={"file": ("ok.csv", b"name,email\nLead A,a@a.com\n", "text/csv")},
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["count"] == 1
