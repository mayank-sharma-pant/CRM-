from pathlib import Path
from uuid import uuid4

from app.models.core.team import Team
from app.models.core.team_membership import TeamMembership
from app.models.ops.document import Document
from app.models.sales.lead import Lead
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


def _create_temp_doc_file(prefix: str) -> Path:
    base = Path("backend/tests/_tmp_docs")
    base.mkdir(parents=True, exist_ok=True)
    path = base / f"{prefix}-{uuid4().hex}.txt"
    path.write_text(prefix)
    return path


def test_manager_cannot_delete_document_outside_active_team(client, db):
    company = create_company(db, name="Doc Scope Co", company_code="DSC")
    manager = create_active_user(
        db,
        email="manager@dsc.com",
        role="manager",
        company_id=company.id,
        full_name="Manager User",
    )
    sales = create_active_user(
        db,
        email="sales@dsc.com",
        role="sales",
        company_id=company.id,
        full_name="Sales User",
    )
    team_a = Team(company_id=company.id, name="Team A")
    team_b = Team(company_id=company.id, name="Team B")
    db.add_all([team_a, team_b])
    db.commit()
    db.refresh(team_a)
    db.refresh(team_b)

    manager.team_id = team_a.id
    db.add(TeamMembership(company_id=company.id, team_id=team_a.id, user_id=manager.id))
    db.add(TeamMembership(company_id=company.id, team_id=team_b.id, user_id=sales.id))
    db.commit()

    lead_b = Lead(company_id=company.id, name="Lead B", status="New", team_id=team_b.id, assigned_to_id=sales.id)
    db.add(lead_b)
    db.commit()
    db.refresh(lead_b)

    doc_path = _create_temp_doc_file("outside-team")
    doc = Document(
        filename="outside-team.txt",
        stored_filename=f"outside-team-{uuid4().hex}.txt",
        file_path=str(doc_path),
        lead_id=lead_b.id,
        company_id=company.id,
        uploaded_by_id=sales.id,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    login_user(client, manager.email)
    response = client.delete(f"/api/documents/{doc.id}")
    assert response.status_code == 403
    assert "team" in response.json()["detail"].lower()


def test_manager_can_delete_document_within_active_team(client, db):
    company = create_company(db, name="Doc Allow Co", company_code="DAC")
    manager = create_active_user(
        db,
        email="manager@dac.com",
        role="manager",
        company_id=company.id,
        full_name="Manager User",
    )
    sales = create_active_user(
        db,
        email="sales@dac.com",
        role="sales",
        company_id=company.id,
        full_name="Sales User",
    )
    team_a = Team(company_id=company.id, name="Team A")
    db.add(team_a)
    db.commit()
    db.refresh(team_a)

    manager.team_id = team_a.id
    db.add(TeamMembership(company_id=company.id, team_id=team_a.id, user_id=manager.id))
    db.add(TeamMembership(company_id=company.id, team_id=team_a.id, user_id=sales.id))
    db.commit()

    lead_a = Lead(company_id=company.id, name="Lead A", status="New", team_id=team_a.id, assigned_to_id=sales.id)
    db.add(lead_a)
    db.commit()
    db.refresh(lead_a)

    doc_path = _create_temp_doc_file("same-team")
    doc = Document(
        filename="same-team.txt",
        stored_filename=f"same-team-{uuid4().hex}.txt",
        file_path=str(doc_path),
        lead_id=lead_a.id,
        company_id=company.id,
        uploaded_by_id=sales.id,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    login_user(client, manager.email)
    response = client.delete(f"/api/documents/{doc.id}")
    assert response.status_code == 200
    assert response.json()["message"] == "Document deleted successfully"
    assert db.query(Document).filter(Document.id == doc.id).first() is None
