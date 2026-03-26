import pytest
from datetime import datetime, timezone
from app.models import User, Lead, Company, Client, Task, Invoice
from app.utils.security import get_password_hash
from app.models.core.team import Team
from app.models.core.team_membership import TeamMembership

def login_user(client, email):
    # Utility to log in
    response = client.post(
        "/api/auth/login",
        data={"username": email, "password": "pw"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    client.headers["Authorization"] = f"Bearer {token}"
    return response

def setup_test_data(db):
    # Helper to setup a standard company + admin
    c1 = Company(name="Functional Test Co", company_code="FTC", status="active")
    db.add(c1)
    db.commit()
    db.refresh(c1)
    
    admin = User(
        email="admin@ftc.com", full_name="FTC Admin",
        hashed_password=get_password_hash("pw"),
        role="admin", company_id=c1.id, is_active=True, status="active"
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return c1, admin

def test_lead_conversion_flow(client, db):
    c, u = setup_test_data(db)
    login_user(client, u.email)
    
    # Create a lead
    lead = Lead(name="Convert Me", email="convert@test.com", company="Alpha Corp", company_id=c.id, status="New")
    db.add(lead)
    db.commit()
    db.refresh(lead)
    
    # Action: Convert lead
    response = client.post(f"/api/leads/{lead.id}/convert")
    assert response.status_code == 200
    assert response.json()["message"] == f"Lead {lead.id} converted to client successfully"
    
    # Assert: Client exists
    client_obj = db.query(Client).filter(Client.converted_from_lead_id == lead.id).first()
    assert client_obj is not None
    assert client_obj.name == "Convert Me"
    
    # Assert: Lead status updated
    db.refresh(lead)
    assert lead.status == "Converted"


def test_sales_can_create_lead_with_team_id_from_memberships(client, db):
    c, admin = setup_test_data(db)

    # Create team + sales and membership
    team = Team(company_id=c.id, name="Alpha")
    db.add(team)
    db.commit()
    db.refresh(team)

    sales = User(
        email="sales@ftc.com",
        full_name="FTC Sales",
        hashed_password=get_password_hash("pw"),
        role="sales",
        company_id=c.id,
        is_active=True,
        status="active",
        team_id=None,
    )
    db.add(sales)
    db.commit()
    db.refresh(sales)

    db.add(TeamMembership(company_id=c.id, team_id=team.id, user_id=sales.id))
    db.commit()

    login_user(client, sales.email)
    r = client.post("/api/leads", json={"name": "TLead", "team_id": team.id})
    assert r.status_code == 201, r.text
    lead_id = r.json()["id"]
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    assert lead.team_id == team.id

def test_task_management_creation(client, db):
    c, u = setup_test_data(db)
    login_user(client, u.email)
    
    # Create a lead to attach task to
    lead = Lead(name="Task Lead", company_id=c.id, status="New")
    db.add(lead)
    db.commit()
    db.refresh(lead)
    
    # Action: Create task via API
    task_data = {
        "title": "Follow up with Task Lead",
        "description": "Call them tomorrow",
        "priority": "High",
        "due_date": (datetime.now(timezone.utc)).isoformat(),
        "lead_id": lead.id
    }
    response = client.post("/api/tasks", json=task_data)
    assert response.status_code == 201
    assert response.json()["message"] == "Task created successfully"
    
    # Assert: Task exists in DB
    task_id = response.json()["id"]
    task = db.query(Task).filter(Task.id == task_id).first()
    assert task is not None
    assert task.title == "Follow up with Task Lead"
    assert task.assigned_to_id == u.id

def test_invoice_generation(client, db):
    c, u = setup_test_data(db)
    login_user(client, u.email)
    
    # Create a client for the invoice
    cl = Client(name="Invoice Client", email="inv@client.com", company_id=c.id)
    db.add(cl)
    db.commit()
    db.refresh(cl)
    
    # Action: Create invoice via API
    invoice_data = {
        "client_id": cl.id,
        "items": [
            {"description": "Service Alpha", "quantity": 1, "unit_price": 100.0},
            {"description": "Service Beta", "quantity": 2, "unit_price": 50.0}
        ],
        "notes": "Test invoice"
    }
    response = client.post("/api/invoices", json=invoice_data)
    assert response.status_code == 201
    
    # Assert: Invoice totals
    data = response.json()
    assert data["subtotal"] == 200.0
    # Default tax is 18% -> 36.0
    assert data["tax"] == 36.0
    assert data["total"] == 236.0
    
    # Assert: Invoice exists in DB
    inv = db.query(Invoice).filter(Invoice.id == data["id"]).first()
    assert inv is not None
    assert inv.client_id == cl.id
