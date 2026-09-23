from app.models.core.team import Team
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


def test_teams_mine_bootstraps_default_when_none_exist(client, db):
    company = create_company(db, name="Bootstrap Co", company_code="BSC")
    sales = create_active_user(
        db,
        email="no-team-sales@ftc.com",
        role="sales",
        company_id=company.id,
        team_id=None,
    )
    login_user(client, sales.email)

    res = client.get("/api/teams/mine")
    assert res.status_code == 200, res.text
    body = res.json()
    assert len(body["teams"]) == 1
    assert body["teams"][0]["name"] == "Default"
    assert body["active_team_id"] == body["teams"][0]["id"]


def test_teams_mine_joins_existing_company_team(client, db):
    company = create_company(db, name="Join Co", company_code="JNC")
    team = Team(company_id=company.id, name="Sales Pod")
    db.add(team)
    db.commit()
    db.refresh(team)

    sales = create_active_user(
        db,
        email="orphan-sales@ftc.com",
        role="sales",
        company_id=company.id,
        team_id=None,
    )
    login_user(client, sales.email)

    res = client.get("/api/teams/mine")
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["teams"][0]["id"] == team.id
    assert body["active_team_id"] == team.id
