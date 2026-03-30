"""Reproduce the manager-creates-lead 500 error."""

from app.models.core.team import Team
from app.models.core.team_membership import TeamMembership
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company, create_client


def test_manager_create_lead_basic(client, db):
    """Manager should be able to create a lead via POST /api/leads."""
    company = create_company(db, name="MgrCo", company_code="MGR")
    team = Team(company_id=company.id, name="Alpha")
    db.add(team)
    db.commit()
    db.refresh(team)

    mgr = create_active_user(
        db, email="mgr@mgrco.com", role="manager",
        company_id=company.id, full_name="Test Manager",
    )
    membership = TeamMembership(company_id=company.id, team_id=team.id, user_id=mgr.id)
    db.add(membership)
    db.commit()

    login_user(client, mgr.email)
    client.headers["X-Team-Id"] = str(team.id)

    resp = client.post("/api/leads", json={
        "name": "Mayank Sharma",
        "company": "tt",
        "email": "johndoe@gmail.com",
        "phone": "34",
        "source": "Referral",
        "service_type": "123",
        "notes": "ww",
        "team_id": team.id,
    })
    assert resp.status_code == 201, f"Expected 201, got {resp.status_code}: {resp.text}"


def test_manager_create_lead_duplicate_client_email_returns_400(client, db):
    """When a client with the same email already exists, lead creation should return 400, not 500."""
    company = create_company(db, name="DupCo", company_code="DUP")
    team = Team(company_id=company.id, name="Bravo")
    db.add(team)
    db.commit()
    db.refresh(team)

    mgr = create_active_user(
        db, email="mgr@dupco.com", role="manager",
        company_id=company.id, full_name="Dup Manager",
    )
    membership = TeamMembership(company_id=company.id, team_id=team.id, user_id=mgr.id)
    db.add(membership)
    db.commit()

    create_client(db, company_id=company.id, name="Existing Client", email="johndoe@gmail.com")

    login_user(client, mgr.email)
    client.headers["X-Team-Id"] = str(team.id)

    resp = client.post("/api/leads", json={
        "name": "Mayank Sharma",
        "company": "tt",
        "email": "johndoe@gmail.com",
        "phone": "34",
        "source": "Referral",
        "service_type": "123",
        "notes": "ww",
        "team_id": team.id,
    })
    assert resp.status_code == 400, f"Expected 400, got {resp.status_code}: {resp.text}"
    assert "client" in resp.json()["detail"].lower() or "email" in resp.json()["detail"].lower()


def test_manager_create_lead_duplicate_lead_email_returns_400(client, db):
    """When a lead with the same email already exists, should return 400."""
    company = create_company(db, name="DupLCo", company_code="DPL")
    team = Team(company_id=company.id, name="Charlie")
    db.add(team)
    db.commit()
    db.refresh(team)

    mgr = create_active_user(
        db, email="mgr@duplco.com", role="manager",
        company_id=company.id, full_name="DupLead Manager",
    )
    membership = TeamMembership(company_id=company.id, team_id=team.id, user_id=mgr.id)
    db.add(membership)
    db.commit()

    login_user(client, mgr.email)
    client.headers["X-Team-Id"] = str(team.id)

    # First lead succeeds
    resp1 = client.post("/api/leads", json={
        "name": "First Lead",
        "email": "johndoe@gmail.com",
        "team_id": team.id,
    })
    assert resp1.status_code == 201, f"First lead failed: {resp1.text}"

    # Second lead with same email should fail with 400
    resp2 = client.post("/api/leads", json={
        "name": "Second Lead",
        "email": "johndoe@gmail.com",
        "team_id": team.id,
    })
    assert resp2.status_code == 400, f"Expected 400, got {resp2.status_code}: {resp2.text}"
