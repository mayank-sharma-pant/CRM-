from app.models import Lead
from app.models.core.team import Team
from app.models.core.team_membership import TeamMembership
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


def _seed(db, code="U1"):
    company = create_company(db, name=f"Pool {code}", company_code=code)
    team = Team(company_id=company.id, name="Alpha")
    db.add(team)
    db.commit()
    db.refresh(team)
    manager = create_active_user(
        db, email=f"mgr@{code}.com", role="manager", company_id=company.id, team_id=team.id
    )
    sales = create_active_user(
        db, email=f"sales@{code}.com", role="sales", company_id=company.id, team_id=team.id
    )
    other = create_active_user(
        db, email=f"other@{code}.com", role="sales", company_id=company.id, team_id=team.id
    )
    md = create_active_user(
        db, email=f"md@{code}.com", role="md", company_id=company.id
    )
    db.add_all([
        TeamMembership(company_id=company.id, team_id=team.id, user_id=manager.id),
        TeamMembership(company_id=company.id, team_id=team.id, user_id=sales.id),
        TeamMembership(company_id=company.id, team_id=team.id, user_id=other.id),
    ])
    open_lead = Lead(company_id=company.id, name="Open", status="Active", team_id=team.id, assigned_to_id=None)
    mine = Lead(company_id=company.id, name="Mine", status="Active", team_id=team.id, assigned_to_id=sales.id)
    db.add_all([open_lead, mine])
    db.commit()
    db.refresh(open_lead)
    return company, team, manager, sales, md, open_lead


def test_sales_unassigned_filter_hides_owned(client, db):
    _, team, _, sales, _, open_lead = _seed(db, "US")
    login_user(client, sales.email)
    resp = client.get("/api/leads", params={"unassigned": "true"}, headers={"X-Team-Id": str(team.id)})
    assert resp.status_code == 200
    ids = [row["id"] for row in resp.json()["items"]]
    assert open_lead.id in ids
    assert all(row["assigned_to_id"] is None for row in resp.json()["items"])
    assert resp.json()["total"] >= 1


def test_manager_sees_team_open_leads(client, db):
    _, team, manager, _, _, open_lead = _seed(db, "UM")
    login_user(client, manager.email)
    resp = client.get("/api/leads", params={"unassigned": "true"}, headers={"X-Team-Id": str(team.id)})
    assert resp.status_code == 200
    ids = [row["id"] for row in resp.json()["items"]]
    assert open_lead.id in ids
    row = next(item for item in resp.json()["items"] if item["id"] == open_lead.id)
    assert row.get("team_name") == "Alpha"


def test_md_sees_company_open_leads(client, db):
    _, _, _, _, md, open_lead = _seed(db, "UD")
    login_user(client, md.email)
    resp = client.get("/api/leads", params={"unassigned": "true"})
    assert resp.status_code == 200
    ids = [row["id"] for row in resp.json()["items"]]
    assert open_lead.id in ids


def test_purchase_unassigned_is_empty_or_forbidden(client, db):
    company, _, _, _, _, _ = _seed(db, "UP")
    purchase = create_active_user(db, email="buy@up.com", role="purchase", company_id=company.id)
    login_user(client, purchase.email)
    resp = client.get("/api/leads", params={"unassigned": "true"})
    assert resp.status_code in (200, 403)
    if resp.status_code == 200:
        assert resp.json()["items"] == [] or resp.json()["total"] == 0


def test_md_team_members_without_team_lists_company_sales(client, db):
    _, _, manager, sales, md, _ = _seed(db, "TM")
    login_user(client, md.email)
    resp = client.get("/api/leads/team-members")
    assert resp.status_code == 200
    ids = {row["id"] for row in resp.json()["members"]}
    assert sales.id in ids
    assert manager.id not in ids
    assert md.id not in ids


def test_md_team_members_accepts_team_id(client, db):
    _, team, _, sales, md, _ = _seed(db, "TT")
    login_user(client, md.email)
    resp = client.get("/api/leads/team-members", params={"team_id": team.id})
    assert resp.status_code == 200
    ids = {row["id"] for row in resp.json()["members"]}
    assert sales.id in ids


def test_sales_team_members_with_team_id_forbidden(client, db):
    _, team, _, sales, _, _ = _seed(db, "TS")
    login_user(client, sales.email)
    resp = client.get("/api/leads/team-members", params={"team_id": team.id})
    assert resp.status_code == 403


def test_manager_assigns_unassigned_team_lead(client, db):
    _, team, manager, sales, _, _ = _seed(db, "UA")
    open_lead = Lead(
        company_id=manager.company_id,
        name="Pool Lead",
        status="Active",
        team_id=team.id,
        assigned_to_id=None,
        created_by_id=sales.id,
    )
    db.add(open_lead)
    db.commit()
    db.refresh(open_lead)
    login_user(client, manager.email)
    resp = client.put(
        f"/api/leads/{open_lead.id}",
        json={"assigned_to_id": sales.id},
        headers={"X-Team-Id": str(team.id)},
    )
    assert resp.status_code == 200, resp.text
    db.refresh(open_lead)
    assert open_lead.assigned_to_id == sales.id
