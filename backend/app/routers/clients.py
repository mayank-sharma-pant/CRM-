from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime

from app.database import get_db
from app.utils.dependencies import get_current_user, apply_company_scope, ensure_company_access
from app.models.user import User
from app.models.client import Client
from app.models.invoice import Invoice

router = APIRouter()


# ===============================
# Clients Endpoints
# ===============================

@router.get("/")
def list_clients(
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all clients"""
    query = apply_company_scope(db.query(Client), Client, current_user)
    
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (Client.name.ilike(search_pattern)) |
            (Client.email.ilike(search_pattern)) |
            (Client.company.ilike(search_pattern))
        )
    
    clients = query.order_by(Client.created_at.desc()).all()
    
    return [
        {
            "id": client.id,
            "name": client.name,
            "email": client.email,
            "phone": client.phone,
            "company": client.company,
            "address": client.address,
            "created_at": client.created_at.strftime("%Y-%m-%d") if client.created_at else None
        }
        for client in clients
    ]


@router.get("/{client_id}")
def get_client(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get client details by ID"""
    client = db.query(Client).filter(Client.id == client_id).first()
    ensure_company_access(client, current_user)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Get client invoices (company-scoped)
    inv_query = apply_company_scope(db.query(Invoice), Invoice, current_user)
    invoices = inv_query.filter(Invoice.client_id == client_id).all()
    
    return {
        "id": client.id,
        "name": client.name,
        "email": client.email,
        "phone": client.phone,
        "company": client.company,
        "address": client.address,
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
        ]
    }


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_client(
    name: str = Query(...),
    email: Optional[str] = Query(None),
    phone: Optional[str] = Query(None),
    company: Optional[str] = Query(None),
    address: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new client"""
    if current_user.company_id is None:
        raise HTTPException(status_code=403, detail="User must be assigned to a company")
    new_client = Client(
        company_id=current_user.company_id,
        name=name,
        email=email,
        phone=phone,
        company=company,
        address=address
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
    name: Optional[str] = Query(None),
    email: Optional[str] = Query(None),
    phone: Optional[str] = Query(None),
    company: Optional[str] = Query(None),
    address: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update client details"""
    client = db.query(Client).filter(Client.id == client_id).first()
    ensure_company_access(client, current_user)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    if name:
        client.name = name
    if email:
        client.email = email
    if phone:
        client.phone = phone
    if company:
        client.company = company
    if address:
        client.address = address
    
    db.commit()
    db.refresh(client)
    
    return {"message": "Client updated successfully", "id": client.id}


@router.delete("/{client_id}")
def delete_client(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a client"""
    client = db.query(Client).filter(Client.id == client_id).first()
    ensure_company_access(client, current_user)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
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
    ensure_company_access(client, current_user)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
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
