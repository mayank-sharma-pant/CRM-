from datetime import datetime, timedelta, timezone

from app.models.core.company_settings import CompanySettings
from app.models.sales.lead import Lead
from app.models.sales.note import Note
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_client, create_company


def _lead(db, company_id, **kwargs):
    row = Lead(
        company_id=company_id,
        name=kwargs.get("name", "Ravi"),
        email=kwargs.get("email", "ravi@x.com"),
        phone=kwargs.get("phone", "999"),
        notes=kwargs.get("notes", "roof leak"),
        status=kwargs.get("status", "Active"),
        deleted_at=kwargs.get("deleted_at"),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def test_export_and_erase_lead(client, db):
    company = create_company(db, name="Priv", company_code="PV1")
    admin = create_active_user(db, email="a@pv1.com", role="admin", company_id=company.id)
    lead = _lead(db, company.id)
    db.add(Note(company_id=company.id, lead_id=lead.id, content="called about damp"))
    db.commit()
    login_user(client, admin.email)
    exp = client.get(f"/api/privacy/export/leads/{lead.id}")
    assert exp.status_code == 200, exp.text
    body = exp.json()
    assert body["email"] == "ravi@x.com"
    assert body["name"] == "Ravi"
    assert any("damp" in (n or "") for n in body["notes"])
    erased = client.post(f"/api/privacy/erase/leads/{lead.id}")
    assert erased.status_code == 200, erased.text
    again = client.get(f"/api/privacy/export/leads/{lead.id}").json()
    assert again["name"] == "Redacted"
    assert again["email"] is None
    assert again["phone"] is None
    note = db.query(Note).filter(Note.lead_id == lead.id).one()
    assert note.content == ""


def test_export_client_and_keep_invoices_row(client, db):
    company = create_company(db, name="Priv2", company_code="PV2")
    admin = create_active_user(db, email="a@pv2.com", role="admin", company_id=company.id)
    person = create_client(db, company_id=company.id, name="Buyer", email="b@b.com")
    person.phone = "111"
    person.address = "1 Street"
    person.gstin = "29AAAAA0000A1Z5"
    db.commit()
    login_user(client, admin.email)
    exp = client.get(f"/api/privacy/export/clients/{person.id}")
    assert exp.status_code == 200, exp.text
    assert exp.json()["email"] == "b@b.com"
    assert client.post(f"/api/privacy/erase/clients/{person.id}").status_code == 200
    got = client.get(f"/api/clients/{person.id}")
    assert got.status_code == 200
    assert got.json()["name"] == "Redacted"
    assert got.json().get("email") in (None, "")


def test_foreign_subject_is_404(client, db):
    a = create_company(db, name="A", company_code="PV3")
    b = create_company(db, name="B", company_code="PV4")
    lead = _lead(db, a.id)
    admin_b = create_active_user(db, email="b@pv4.com", role="admin", company_id=b.id)
    login_user(client, admin_b.email)
    assert client.get(f"/api/privacy/export/leads/{lead.id}").status_code == 404
    assert client.post(f"/api/privacy/erase/leads/{lead.id}").status_code == 404


def test_sales_cannot_erase(client, db):
    company = create_company(db, name="Priv3", company_code="PV5")
    sales = create_active_user(db, email="s@pv5.com", role="sales", company_id=company.id)
    lead = _lead(db, company.id)
    login_user(client, sales.email)
    assert client.post(f"/api/privacy/erase/leads/{lead.id}").status_code == 403


def test_me_export_and_retention_apply(client, db):
    company = create_company(db, name="Priv4", company_code="PV6")
    admin = create_active_user(db, email="a@pv6.com", role="admin", company_id=company.id)
    login_user(client, admin.email)
    me = client.get("/api/privacy/me")
    assert me.status_code == 200, me.text
    assert me.json()["email"] == "a@pv6.com"

    old = _lead(db, company.id, name="Old", deleted_at=datetime.now(timezone.utc) - timedelta(days=400))
    fresh = _lead(db, company.id, name="New", deleted_at=datetime.now(timezone.utc) - timedelta(days=10))
    db.add(CompanySettings(company_id=company.id, company_name="Priv4", retention_days=365))
    db.commit()
    applied = client.post("/api/privacy/retention/apply")
    assert applied.status_code == 200, applied.text
    assert applied.json()["erased"] == 1
    db.refresh(old)
    db.refresh(fresh)
    assert old.name == "Redacted"
    assert fresh.name == "New"

    patch = client.put("/api/privacy/retention", json={"retention_days": 90})
    assert patch.status_code == 200, patch.text
    assert patch.json()["retention_days"] == 90
