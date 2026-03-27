from datetime import datetime, timezone

from app.models import Client, Invoice, Lead, Task
from app.models.core.team import Team
from app.models.core.team_membership import TeamMembership
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_client, create_company


def setup_test_data(db):
    company = create_company(db, name="Functional Test Co", company_code="FTC")
    admin = create_active_user(
        db,
        email="admin@ftc.com",
        role="admin",
        company_id=company.id,
        full_name="FTC Admin",
    )
    return company, admin


def test_lead_conversion_flow(client, db):
    company, admin = setup_test_data(db)
    login_user(client, admin.email)

    lead = Lead(
        name="Convert Me",
        email="convert@test.com",
        company="Alpha Corp",
        company_id=company.id,
        status="New",
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)

    response = client.post(f"/api/leads/{lead.id}/convert")
    assert response.status_code == 200
    assert response.json()["message"] == f"Lead {lead.id} converted to client successfully"

    converted_client = db.query(Client).filter(Client.converted_from_lead_id == lead.id).first()
    assert converted_client is not None
    assert converted_client.name == "Convert Me"

    db.refresh(lead)
    assert lead.status == "Converted"


def test_sales_can_create_lead_with_team_id_from_memberships(client, db):
    company, _admin = setup_test_data(db)

    team = Team(company_id=company.id, name="Alpha")
    db.add(team)
    db.commit()
    db.refresh(team)

    sales = create_active_user(
        db,
        email="sales@ftc.com",
        role="sales",
        company_id=company.id,
        full_name="FTC Sales",
        team_id=None,
    )

    db.add(TeamMembership(company_id=company.id, team_id=team.id, user_id=sales.id))
    db.commit()

    login_user(client, sales.email)
    response = client.post("/api/leads", json={"name": "TLead", "team_id": team.id})
    assert response.status_code == 201, response.text

    lead_id = response.json()["id"]
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    assert lead is not None
    assert lead.team_id == team.id


def test_task_management_creation(client, db):
    company, admin = setup_test_data(db)
    login_user(client, admin.email)

    lead = Lead(name="Task Lead", company_id=company.id, status="New")
    db.add(lead)
    db.commit()
    db.refresh(lead)

    task_data = {
        "title": "Follow up with Task Lead",
        "description": "Call them tomorrow",
        "priority": "High",
        "due_date": datetime.now(timezone.utc).isoformat(),
        "lead_id": lead.id,
    }
    response = client.post("/api/tasks", json=task_data)
    assert response.status_code == 201
    assert response.json()["message"] == "Task created successfully"

    task_id = response.json()["id"]
    task = db.query(Task).filter(Task.id == task_id).first()
    assert task is not None
    assert task.title == "Follow up with Task Lead"
    assert task.assigned_to_id == admin.id


def test_invoice_generation(client, db):
    company, admin = setup_test_data(db)
    login_user(client, admin.email)

    customer = create_client(
        db,
        company_id=company.id,
        name="Invoice Client",
        assigned_to_id=admin.id,
        email="inv@client.com",
    )

    invoice_data = {
        "client_id": customer.id,
        "items": [
            {"description": "Service Alpha", "quantity": 1, "unit_price": 100.0},
            {"description": "Service Beta", "quantity": 2, "unit_price": 50.0},
        ],
        "notes": "Test invoice",
    }
    response = client.post("/api/invoices", json=invoice_data)
    assert response.status_code == 201

    data = response.json()
    assert data["subtotal"] == 200.0
    assert data["tax"] == 36.0
    assert data["total"] == 236.0

    invoice = db.query(Invoice).filter(Invoice.id == data["id"]).first()
    assert invoice is not None
    assert invoice.client_id == customer.id
