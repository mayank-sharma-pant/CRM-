from sqlalchemy import inspect

from app.models.core.team import Team
from app.models.sales.territory import Territory, TerritoryRule
from tests.helpers.factories import create_company


def test_territories_and_territory_rules_tables_exist(db_engine):
    tables = set(inspect(db_engine).get_table_names())
    assert {"territories", "territory_rules"} <= tables
    territory_cols = {c["name"] for c in inspect(db_engine).get_columns("territories")}
    assert {
        "company_id", "name", "team_id", "priority", "is_active", "created_at", "updated_at",
    } <= territory_cols
    rule_cols = {c["name"] for c in inspect(db_engine).get_columns("territory_rules")}
    assert {"company_id", "territory_id", "match_field", "match_value"} <= rule_cols


def test_can_persist_territory_and_rule(db):
    company = create_company(db, name="Terr Co", company_code="TRC")
    team = Team(company_id=company.id, name="East")
    db.add(team)
    db.flush()
    territory = Territory(
        company_id=company.id,
        name="East India",
        team_id=team.id,
        priority=50,
    )
    db.add(territory)
    db.flush()
    rule = TerritoryRule(
        company_id=company.id,
        territory_id=territory.id,
        match_field="service_type",
        match_value="consulting",
    )
    db.add(rule)
    db.commit()
    db.refresh(territory)
    db.refresh(rule)
    assert territory.id is not None
    assert territory.priority == 50
    assert territory.is_active is True
    assert rule.id is not None
    assert rule.match_field == "service_type"
    assert rule.match_value == "consulting"


def test_deleting_territory_cascades_rules(db):
    company = create_company(db, name="Cascade Co", company_code="CSC")
    team = Team(company_id=company.id, name="West")
    db.add(team)
    db.flush()
    territory = Territory(company_id=company.id, name="West India", team_id=team.id)
    db.add(territory)
    db.flush()
    rule = TerritoryRule(
        company_id=company.id,
        territory_id=territory.id,
        match_field="source",
        match_value="website",
    )
    db.add(rule)
    db.commit()
    rule_id = rule.id
    db.delete(territory)
    db.commit()
    assert db.query(TerritoryRule).filter_by(id=rule_id).first() is None
