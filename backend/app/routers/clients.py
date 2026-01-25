from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime

from app.database import get_db
from app.utils.dependencies import get_current_user
from app.models.user import User
from app.schemas.sales import ClientResponse, ClientListResponse, ClientCreate, ClientUpdate

router = APIRouter()


# ===============================
# Clients Endpoints
# ===============================

@router.get("/", response_model=List[ClientResponse])
def list_clients(
    search: Optional[str] = Query(None, description="Search by name, email, company"),
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """List all clients for the current user"""
    clients = [
        ClientResponse(id=1, name="John Smith", email="john@acmecorp.com", phone="+1 555-0101",
                      company="Acme Corp", address="123 Business St, New York",
                      created_at="2024-01-15", total_invoices=3, total_revenue=15000.0),
        ClientResponse(id=2, name="Sarah Johnson", email="sarah@techstart.io", phone="+1 555-0102",
                      company="TechStart Inc", address="456 Tech Ave, San Francisco",
                      created_at="2024-01-10", total_invoices=2, total_revenue=8500.0),
        ClientResponse(id=3, name="Mike Williams", email="mike@designco.com", phone="+1 555-0103",
                      company="Design Co", address="789 Creative Blvd, Los Angeles",
                      created_at="2024-01-05", total_invoices=5, total_revenue=25000.0),
        ClientResponse(id=4, name="Emily Brown", email="emily@globaltech.com", phone="+1 555-0104",
                      company="Global Tech", address="321 Innovation Way, Seattle",
                      created_at="2023-12-20", total_invoices=8, total_revenue=42000.0),
        ClientResponse(id=5, name="David Lee", email="david@enterprise.com", phone="+1 555-0105",
                      company="Enterprise Solutions", address="654 Corporate Park, Chicago",
                      created_at="2023-11-15", total_invoices=12, total_revenue=78000.0),
    ]
    
    if search:
        search_lower = search.lower()
        clients = [c for c in clients if 
                  search_lower in c.name.lower() or 
                  (c.email and search_lower in c.email.lower()) or
                  (c.company and search_lower in c.company.lower())]
    
    return clients


@router.get("/{client_id}", response_model=ClientResponse)
def get_client(
    client_id: int,
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Get client details by ID"""
    clients = {
        1: ClientResponse(id=1, name="John Smith", email="john@acmecorp.com", phone="+1 555-0101",
                         company="Acme Corp", address="123 Business St, New York, NY 10001",
                         created_at="2024-01-15", total_invoices=3, total_revenue=15000.0),
        2: ClientResponse(id=2, name="Sarah Johnson", email="sarah@techstart.io", phone="+1 555-0102",
                         company="TechStart Inc", address="456 Tech Ave, San Francisco, CA 94102",
                         created_at="2024-01-10", total_invoices=2, total_revenue=8500.0),
    }
    
    if client_id not in clients:
        raise HTTPException(status_code=404, detail="Client not found")
    
    return clients[client_id]


@router.post("/", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
def create_client(
    client_data: ClientCreate,
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Create a new client"""
    return ClientResponse(
        id=100,
        name=client_data.name,
        email=client_data.email,
        phone=client_data.phone,
        company=client_data.company,
        address=client_data.address,
        created_at=datetime.now().strftime("%Y-%m-%d"),
        total_invoices=0,
        total_revenue=0.0
    )


@router.put("/{client_id}", response_model=ClientResponse)
def update_client(
    client_id: int,
    client_data: ClientUpdate,
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Update client details"""
    return ClientResponse(
        id=client_id,
        name=client_data.name or "Updated Client",
        email=client_data.email,
        phone=client_data.phone,
        company=client_data.company,
        address=client_data.address,
        created_at="2024-01-15",
        total_invoices=0,
        total_revenue=0.0
    )


@router.delete("/{client_id}")
def delete_client(
    client_id: int,
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Delete a client"""
    return {"message": f"Client {client_id} deleted successfully"}


# ===============================
# Client Activity Endpoints
# ===============================

@router.get("/{client_id}/invoices")
def get_client_invoices(
    client_id: int,
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Get all invoices for a client"""
    invoices = [
        {"id": 1, "invoice_number": "INV-001", "amount": 5000.0, "status": "Paid", "date": "2024-01-10"},
        {"id": 2, "invoice_number": "INV-002", "amount": 7500.0, "status": "Pending", "date": "2024-01-15"},
        {"id": 3, "invoice_number": "INV-003", "amount": 2500.0, "status": "Draft", "date": "2024-01-18"},
    ]
    return {"client_id": client_id, "invoices": invoices}


@router.get("/{client_id}/tasks")
def get_client_tasks(
    client_id: int,
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Get all tasks related to a client"""
    tasks = [
        {"id": 1, "title": "Quarterly review meeting", "dueDate": "Jan 25", "status": "Pending"},
        {"id": 2, "title": "Send updated contract", "dueDate": "Jan 22", "status": "Completed"},
    ]
    return {"client_id": client_id, "tasks": tasks}


@router.get("/{client_id}/notes")
def get_client_notes(
    client_id: int,
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Get all notes for a client"""
    notes = [
        {"id": 1, "content": "Discussed Q1 requirements", "created_at": "2024-01-15 10:30", "created_by": "Sales User"},
        {"id": 2, "content": "Client prefers email communication", "created_at": "2024-01-12 14:00", "created_by": "Sales User"},
    ]
    return {"client_id": client_id, "notes": notes}
