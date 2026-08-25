from app.models.sales.lead import Lead
from app.models.sales.scoring import ScoringRule
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


def _admin(client, db, code):
    company = create_company(db, name=f"Co {code}", company_code=code)
    admin = create_active_user(db, email=f"admin@{code.lower()}.com",
                               role="admin", company_id=company.id)
    return company, admin


def test_foreign_rule_update_and_delete_404(client, db):
    company_a, admin_a = _admin(client, db, "XTA")
    company_b, admin_b = _admin(client, db, "XTB")
    rule = ScoringRule(company_id=company_a.id, entity_type="lead",
                       field="source", operator="eq", value="X", points=1, is_active=True)
    db.add(rule)
    db.commit()
    db.refresh(rule)

    login_user(client, admin_b.email)  # B attacks A's rule
    assert client.put(f"/api/scoring/rules/{rule.id}", json={"points": 99}).status_code == 404
    assert client.delete(f"/api/scoring/rules/{rule.id}").status_code == 404
    assert all(r["id"] != rule.id for r in client.get("/api/scoring/rules").json()["items"])

    login_user(client, admin_a.email)  # positive control
    assert client.put(f"/api/scoring/rules/{rule.id}", json={"points": 5}).status_code == 200


def test_foreign_lead_score_404(client, db):
    company_a, admin_a = _admin(client, db, "XTC")
    company_b, admin_b = _admin(client, db, "XTD")
    lead = Lead(company_id=company_a.id, name="A", status="Active")
    db.add(lead)
    db.commit()
    db.refresh(lead)

    login_user(client, admin_b.email)
    assert client.get(f"/api/leads/{lead.id}/score").status_code == 404

    login_user(client, admin_a.email)  # positive control
    assert client.get(f"/api/leads/{lead.id}/score").status_code == 200
