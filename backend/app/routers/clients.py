from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime

from app.database import get_db
from app.utils.dependencies import get_current_user, apply_company_scope, ensure_company_access
from app.models.user import User
from app.models.client import Client
from app.models.invoice import Invoice
from app.models.note import Note
from app.models.task import Task
from app.models.audit import AuditLog
from app.schemas.sales import ClientCreate, ClientUpdate, ClientListResponse
from app.schemas.user import MessageResponse

router = APIRouter()


# ===============================
# Clients Endpoints
# ===============================

@router.get("", response_model=ClientListResponse)
def list_clients(
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List clients (paginated)."""
    query = apply_company_scope(db.query(Client), Client, current_user)
    
    # Sales executives only see their own clients
    if getattr(current_user, 'role', '') == 'sales':
        query = query.filter(Client.assigned_to_id == current_user.id)
    
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (Client.name.ilike(search_pattern)) |
            (Client.email.ilike(search_pattern)) |
            (Client.company.ilike(search_pattern))
        )
    total = query.count()
    clients = query.order_by(Client.created_at.desc()).offset(skip).limit(limit).all()

    # Pre-fetch assignee names for all clients in one query
    assignee_ids = list({c.assigned_to_id for c in clients if c.assigned_to_id})
    assignee_map = {}
    if assignee_ids:
        assignees = db.query(User).filter(User.id.in_(assignee_ids)).all()
        assignee_map = {u.id: u.full_name for u in assignees}

    return {
        "items": [
            {
                "id": client.id,
                "name": client.name,
                "email": client.email,
                "phone": client.phone,
                "company": client.company,
                "address": client.address,
                "assigned_to_id": client.assigned_to_id,
                "assigned_to_name": assignee_map.get(client.assigned_to_id, "Unassigned"),
                "created_at": client.created_at.strftime("%Y-%m-%d") if client.created_at else None
            }
            for client in clients
        ],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.get("/{client_id}")
def get_client(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get client details by ID"""
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    ensure_company_access(client, current_user)
    
    # Get client invoices (company-scoped)
    inv_query = apply_company_scope(db.query(Invoice), Invoice, current_user)
    invoices = inv_query.filter(Invoice.client_id == client_id).all()
    
    # Get client notes
    notes = db.query(Note).filter(Note.client_id == client_id).order_by(Note.created_at.desc()).all()
    
    # Get client tasks
    tasks = db.query(Task).filter(Task.client_id == client_id).order_by(Task.due_date.asc()).all()
    
    # Look up assignee name
    assignee_name = "Unassigned"
    if client.assigned_to_id:
        assignee = db.query(User).filter(User.id == client.assigned_to_id).first()
        if assignee:
            assignee_name = assignee.full_name

    return {
        "id": client.id,
        "name": client.name,
        "email": client.email,
        "phone": client.phone,
        "company": client.company,
        "address": client.address,
        "assigned_to_id": client.assigned_to_id,
        "assigned_to_name": assignee_name,
        "created_at": client.created_at.strftime("%Y-%m-%d") if client.created_at else None,
        "invoices": [
            {
                "id": inv.id,
                "invoice_number": inv.invoice_number,
                "total": inv.total,
                "status": inv.status,
                "issued_date": inv.issued_date.strftime("%Y-%m-%d") if inv.issued_date else None
            }
            for inv in invoices
        ],
        "notes": [
            {
                "id": note.id,
                "content": note.content,
                "author": note.author_name or "System",
                "date": note.created_at.strftime("%b %d, %Y") if note.created_at else None
            }
            for note in notes
        ],
        "tasks": [
            {
                "id": task.id,
                "title": task.title,
                "due": task.due_date.strftime("%b %d") if task.due_date else "No date",
                "priority": task.priority.capitalize(),
                "status": task.status,
                "assigned_to": task.assigned_to_id
            }
            for task in tasks
        ]
    }


@router.post("", status_code=status.HTTP_201_CREATED)
def create_client(
    body: ClientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new client"""
    if current_user.company_id is None:
        raise HTTPException(status_code=403, detail="User must be assigned to a company")
    
    # Prevent duplicate conversion from same lead
    if body.converted_from_lead_id:
        existing = db.query(Client).filter(
            Client.company_id == current_user.company_id,
            Client.converted_from_lead_id == body.converted_from_lead_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="This lead has already been converted to a client.")
    
    new_client = Client(
        company_id=current_user.company_id,
        name=body.name,
        email=body.email,
        phone=body.phone,
        company=body.company,
        address=body.address,
        assigned_to_id=body.assigned_to_id or current_user.id,
        team_id=body.team_id or current_user.team_id,
        converted_from_lead_id=body.converted_from_lead_id,
    )
    
    db.add(new_client)
    db.commit()
    db.refresh(new_client)
    
    return {
        "id": new_client.id,
        "name": new_client.name,
        "message": "Client created successfully"
    }


@router.put("/{client_id}")
def update_client(
    client_id: int,
    body: ClientUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update client details"""
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    ensure_company_access(client, current_user)
    
    if body.name is not None:
        client.name = body.name
    if body.email is not None:
        client.email = body.email
    if body.phone is not None:
        client.phone = body.phone
    if body.company is not None:
        client.company = body.company
    if body.address is not None:
        client.address = body.address
    
    db.commit()
    db.refresh(client)
    
    return {"message": "Client updated successfully", "id": client.id}


@router.delete("/{client_id}", response_model=MessageResponse)
def delete_client(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a client"""
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    ensure_company_access(client, current_user)
    
    db.delete(client)
    db.commit()
    
    return {"message": f"Client {client_id} deleted successfully"}


# ===============================
# Client Invoices
# ===============================

@router.get("/{client_id}/invoices")
def get_client_invoices(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all invoices for a client"""
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    ensure_company_access(client, current_user)
    
    inv_query = apply_company_scope(db.query(Invoice), Invoice, current_user)
    invoices = inv_query.filter(Invoice.client_id == client_id).all()
    
    return [
        {
            "id": inv.id,
            "invoice_number": inv.invoice_number,
            "total": inv.total,
            "status": inv.status,
            "issued_date": inv.issued_date.strftime("%Y-%m-%d") if inv.issued_date else None,
            "due_date": inv.due_date.strftime("%Y-%m-%d") if inv.due_date else None,
            "paid_date": inv.paid_date.strftime("%Y-%m-%d") if inv.paid_date else None
        }
        for inv in invoices
    ]


@router.post("/{client_id}/notes", status_code=status.HTTP_201_CREATED)
def add_client_note(
    client_id: int,
    content: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a note to a client"""
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    ensure_company_access(client, current_user)
    
    new_note = Note(
        client_id=client_id,
        content=content,
        author_id=current_user.id,
        author_name=current_user.full_name
    )
    db.add(new_note)
    
    # Audit log
    log = AuditLog(
        company_id=client.company_id,
        entity_type="client",
        entity_id=str(client.id),
        entity_name=client.name,
        action="note_added",
        admin_id=current_user.id,
        admin_name=current_user.full_name,
        after_value=content
    )
    db.add(log)
    
    db.commit()
    db.refresh(new_note)
    
    return {
        "id": new_note.id,
        "content": new_note.content,
        "author": new_note.author_name,
        "date": new_note.created_at.strftime("%b %d, %Y") if new_note.created_at else None
    }

