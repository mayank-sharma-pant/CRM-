from app.models.sales.lead import Lead
from app.models.sales.scoring import ScoringRule
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


def _login(client, db, code):
    company = create_company(db, name=f"Co {code}", company_code=code)
    user = create_active_user(db, email=f"admin@{code.lower()}.com",
                              role="admin", company_id=company.id)
    login_user(client, user.email)
    return company, user


def test_lead_score_breakdown_live(client, db):
    company, _ = _login(client, db, "SD1")
    db.add(ScoringRule(company_id=company.id, entity_type="lead",
                       field="source", operator="eq", value="Referral",
                       points=20, is_active=True))
    lead = Lead(company_id=company.id, name="A", source="Referral", status="Active")
    db.add(lead)
    db.commit()
    db.refresh(lead)
    resp = client.get(f"/api/leads/{lead.id}/score")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["score"] == 20
    assert body["breakdown"][0]["matched"] is True


def test_lead_score_foreign_id_404(client, db):
    _login(client, db, "SD2")
    assert client.get("/api/leads/999999/score").status_code == 404
