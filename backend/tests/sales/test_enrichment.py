from app.models.sales.lead import Lead
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


def _admin(client, db, code="EN1"):
    company = create_company(db, name=f"Co {code}", company_code=code)
    admin = create_active_user(
        db, email=f"admin@{code.lower()}.com", role="admin", company_id=company.id
    )
    login_user(client, admin.email)
    return company, admin


def test_enrich_lead_from_work_email(client, db):
    company, _ = _admin(client, db, "ENA")
    lead = Lead(company_id=company.id, name="Ravi", email="ravi@acme-hvac.com", status="Active")
    db.add(lead)
    db.commit()
    db.refresh(lead)
    resp = client.post(f"/api/leads/{lead.id}/enrich")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["company"] == "Acme Hvac"
    assert body["website"] == "https://acme-hvac.com"
    assert body["industry"] == "Services"
    assert body["linkedin_url"] == "https://www.linkedin.com/company/acme-hvac"
    assert body["enrichment_source"] == "domain"
    assert body["enriched_at"]
    again = client.post(f"/api/leads/{lead.id}/enrich")
    assert again.status_code == 200
    notes = client.get(f"/api/leads/{lead.id}").json()["notes_list"]
    assert sum(1 for n in notes if "Enriched" in (n.get("content") or "")) == 1


def test_enrich_does_not_overwrite_company(client, db):
    company, _ = _admin(client, db, "ENB")
    lead = Lead(
        company_id=company.id,
        name="Ravi",
        email="ravi@other.com",
        company="Known Co",
        status="Active",
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)
    body = client.post(f"/api/leads/{lead.id}/enrich").json()
    assert body["company"] == "Known Co"


def test_enrich_rejects_gmail(client, db):
    company, _ = _admin(client, db, "ENC")
    lead = Lead(company_id=company.id, name="Ravi", email="ravi@gmail.com", status="Active")
    db.add(lead)
    db.commit()
    db.refresh(lead)
    resp = client.post(f"/api/leads/{lead.id}/enrich")
    assert resp.status_code == 400


def test_enrich_foreign_lead_is_404(client, db):
    a = create_company(db, name="A", company_code="END")
    lead = Lead(company_id=a.id, name="Ravi", email="ravi@acme.com", status="Active")
    db.add(lead)
    db.commit()
    db.refresh(lead)
    _admin(client, db, "ENE")
    assert client.post(f"/api/leads/{lead.id}/enrich").status_code == 404


def test_enrich_account_from_website(client, db):
    _admin(client, db, "ENF")
    created = client.post("/api/accounts", json={"name": "Acme HVAC", "website": "https://acme.example"})
    assert created.status_code == 201, created.text
    acc_id = created.json()["id"]
    resp = client.post(f"/api/accounts/{acc_id}/enrich")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["name"] == "Acme HVAC"
    assert body["industry"] == "Services"
    assert body["linkedin_url"] == "https://www.linkedin.com/company/acme"
    assert body["enrichment_source"] == "domain"
