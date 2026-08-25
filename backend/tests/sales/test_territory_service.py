"""Territory assignment service: match rules, priority, round-robin on team."""
from app.models.core.team import Team
from app.models.core.team_membership import TeamMembership
from app.models.sales.lead import Lead
from app.models.sales.territory import Territory, TerritoryRule
from app.services.sales.territory import assign_lead_by_territory, round_robin_sales_on_team
from tests.helpers.auth import create_active_user
from tests.helpers.factories import create_company


def _team(db, company, name="Team"):
    team = Team(company_id=company.id, name=name)
    db.add(team)
    db.commit()
    db.refresh(team)
    return team


def _sales_on_team(db, email, company, team):
    user = create_active_user(db, email=email, role="sales", company_id=company.id, team_id=team.id)
    db.add(TeamMembership(company_id=company.id, team_id=team.id, user_id=user.id))
    db.commit()
    db.refresh(user)
    return user


def _territory(db, company, team, name="T", priority=100, rules=None):
    territory = Territory(company_id=company.id, name=name, team_id=team.id, priority=priority)
    db.add(territory)
    db.flush()
    for match_field, match_value in rules or []:
        db.add(
            TerritoryRule(
                company_id=company.id,
                territory_id=territory.id,
                match_field=match_field,
                match_value=match_value,
            )
        )
    db.commit()
    db.refresh(territory)
    return territory


def _lead(db, company, **kwargs):
    lead = Lead(company_id=company.id, name="Lead", **kwargs)
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead


def test_assign_matches_service_type(db):
    company = create_company(db, name="Match Co", company_code="MTC")
    team = _team(db, company, "East")
    sales = _sales_on_team(db, "s@mtc.com", company, team)
    _territory(db, company, team, rules=[("service_type", "consulting")])

    lead = _lead(db, company, service_type="Consulting")
    assign_lead_by_territory(db, lead)
    db.commit()
    db.refresh(lead)

    assert lead.team_id == team.id
    assert lead.assigned_to_id == sales.id


def test_assign_uses_lower_priority_first(db):
    company = create_company(db, name="Pri Co", company_code="PRC")
    team_a = _team(db, company, "A")
    team_b = _team(db, company, "B")
    _sales_on_team(db, "a@prc.com", company, team_a)
    _sales_on_team(db, "b@prc.com", company, team_b)
    _territory(db, company, team_b, name="HighPri", priority=200, rules=[("service_type", "x")])
    _territory(db, company, team_a, name="LowPri", priority=10, rules=[("service_type", "x")])

    lead = _lead(db, company, service_type="x")
    assign_lead_by_territory(db, lead)
    db.commit()
    db.refresh(lead)

    assert lead.team_id == team_a.id


def test_assign_or_rules_any_match(db):
    company = create_company(db, name="Or Co", company_code="ORC")
    team = _team(db, company)
    _sales_on_team(db, "s@orc.com", company, team)
    _territory(
        db,
        company,
        team,
        rules=[("service_type", "other"), ("source", "referral")],
    )

    lead = _lead(db, company, source="Referral", service_type="unrelated")
    assign_lead_by_territory(db, lead)
    db.commit()
    db.refresh(lead)

    assert lead.team_id == team.id
    assert lead.assigned_to_id is not None


def test_assign_skips_when_already_assigned(db):
    company = create_company(db, name="Skip Co", company_code="SKC")
    team = _team(db, company)
    sales = _sales_on_team(db, "s@skc.com", company, team)
    other = create_active_user(db, email="o@skc.com", role="sales", company_id=company.id)
    _territory(db, company, team, rules=[("service_type", "x")])

    lead = _lead(db, company, service_type="x", assigned_to_id=other.id)
    assign_lead_by_territory(db, lead)
    db.commit()
    db.refresh(lead)

    assert lead.assigned_to_id == other.id
    assert lead.team_id is None


def test_assign_no_match_leaves_assignee_none(db):
    company = create_company(db, name="Nom Co", company_code="NMC")
    team = _team(db, company)
    _sales_on_team(db, "s@nmc.com", company, team)
    _territory(db, company, team, rules=[("service_type", "x")])

    lead = _lead(db, company, service_type="y")
    assign_lead_by_territory(db, lead)
    db.commit()
    db.refresh(lead)

    assert lead.assigned_to_id is None
    assert lead.team_id is None


def test_round_robin_picks_lower_load_sales(db):
    company = create_company(db, name="RR Co", company_code="RRC")
    team = _team(db, company)
    heavy = _sales_on_team(db, "heavy@rrc.com", company, team)
    light = _sales_on_team(db, "light@rrc.com", company, team)

    for i in range(3):
        db.add(Lead(company_id=company.id, name=f"H{i}", assigned_to_id=heavy.id))
    db.commit()

    picked = round_robin_sales_on_team(db, company_id=company.id, team_id=team.id)
    assert picked == light.id


def test_assign_round_robin_within_matched_team(db):
    company = create_company(db, name="ARR Co", company_code="ARC")
    team = _team(db, company)
    heavy = _sales_on_team(db, "heavy@arc.com", company, team)
    light = _sales_on_team(db, "light@arc.com", company, team)
    _territory(db, company, team, rules=[("service_type", "x")])

    for i in range(2):
        db.add(Lead(company_id=company.id, name=f"H{i}", assigned_to_id=heavy.id))
    db.commit()

    lead = _lead(db, company, service_type="x")
    assign_lead_by_territory(db, lead)
    db.commit()
    db.refresh(lead)

    assert lead.team_id == team.id
    assert lead.assigned_to_id == light.id
