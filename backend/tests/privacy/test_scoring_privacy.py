from app.models.sales.lead import Lead
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


def _login(client, db, code):
    company = create_company(db, name=f"Co {code}", company_code=code)
    user = create_active_user(db, email=f"admin@{code.lower()}.com",
                              role="admin", company_id=company.id)
    login_user(client, user.email)
    return company, user


def test_export_includes_score_and_erase_clears_it(client, db):
    company, _ = _login(client, db, "PSC")
    lead = Lead(company_id=company.id, name="A", email="a@b.com", status="Active", score=42)
    db.add(lead)
    db.commit()
    db.refresh(lead)
    exported = client.get(f"/api/privacy/export/leads/{lead.id}").json()
    assert exported["score"] == 42
    assert client.post(f"/api/privacy/erase/leads/{lead.id}").status_code == 200
    db.refresh(lead)
    assert lead.score is None
    assert lead.score_updated_at is None
