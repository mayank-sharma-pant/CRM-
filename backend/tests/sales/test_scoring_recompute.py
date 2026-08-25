from app.models.sales.lead import Lead
from app.models.sales.scoring import ScoringRule
from app.services.scoring.recompute import recompute_one, recompute_all, active_rules
from tests.helpers.factories import create_company


def test_recompute_one_sets_score(db):
    company = create_company(db, name="RC1", company_code="RC1")
    db.add(ScoringRule(company_id=company.id, entity_type="lead",
                       field="source", operator="eq", value="Referral",
                       points=25, is_active=True))
    lead = Lead(company_id=company.id, name="A", source="Referral", status="Active")
    db.add(lead)
    db.commit()
    total = recompute_one(db, lead, "lead")
    db.commit()
    assert total == 25
    assert lead.score == 25
    assert lead.score_updated_at is not None


def test_active_rules_excludes_inactive_and_other_type(db):
    company = create_company(db, name="RC2", company_code="RC2")
    db.add(ScoringRule(company_id=company.id, entity_type="lead",
                       field="source", operator="eq", value="X", points=1, is_active=True))
    db.add(ScoringRule(company_id=company.id, entity_type="lead",
                       field="source", operator="eq", value="Y", points=1, is_active=False))
    db.add(ScoringRule(company_id=company.id, entity_type="deal",
                       field="amount", operator="gt", value="1", points=1, is_active=True))
    db.commit()
    rules = active_rules(db, company.id, "lead")
    assert len(rules) == 1


def test_recompute_all_counts_rows(db):
    company = create_company(db, name="RC3", company_code="RC3")
    db.add(ScoringRule(company_id=company.id, entity_type="lead",
                       field="email", operator="is_set", points=5, is_active=True))
    db.add(Lead(company_id=company.id, name="A", email="a@b.com", status="Active"))
    db.add(Lead(company_id=company.id, name="B", email=None, status="Active"))
    db.commit()
    n = recompute_all(db, company.id, "lead")
    assert n == 2
    scores = sorted(l.score for l in db.query(Lead).filter(Lead.company_id == company.id).all())
    assert scores == [0, 5]
