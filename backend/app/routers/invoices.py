"""Invoice creation and list (company-scoped)."""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional, List
from datetime import date

from app.database import get_db
from app.utils.dependencies import get_current_user, apply_company_scope, ensure_company_access
from app.models.user import User
from app.models.client import Client
from app.models.invoice import Invoice, InvoiceItem
from app.models.company_settings import CompanySettings

router = APIRouter()


class InvoiceItemCreate(BaseModel):
    description: str
    quantity: int = 1
    unit_price: float = 0.0


class InvoiceCreate(BaseModel):
    client_id: int
    items: List[InvoiceItemCreate]
    invoice_number: Optional[str] = None
    issued_date: Optional[date] = None
    due_date: Optional[date] = None
    notes: Optional[str] = None


@router.post("", status_code=status.HTTP_201_CREATED)
def create_invoice(
    body: InvoiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new invoice for a client (company-scoped)."""
    if not body.items:
        raise HTTPException(status_code=400, detail="At least one line item is required")

    client = db.query(Client).filter(Client.id == body.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    ensure_company_access(client, current_user)

    company_id = current_user.company_id
    settings = db.query(CompanySettings).filter(CompanySettings.company_id == company_id).first()
    
    # Use defaults if settings don't exist
    prefix = "INV"
    tax_rate = 18.0
    if settings:
        prefix = (settings.invoice_prefix or "INV").strip() or "INV"
        tax_rate = getattr(settings, "tax_rate", 18.0) or 18.0

    if body.invoice_number:
        invoice_number = body.invoice_number.strip()
        existing = db.query(Invoice).filter(
            Invoice.company_id == company_id,
            Invoice.invoice_number == invoice_number,
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Invoice number already exists for this company")
    else:
        count = db.query(Invoice).filter(Invoice.company_id == company_id).count()
        invoice_number = f"{prefix}-{company_id}-{count + 1}"

    subtotal = 0.0
    for it in body.items:
        total = (it.quantity or 0) * (it.unit_price or 0)
        subtotal += total

    # Use the tax_rate determined above
    tax = round(subtotal * (float(tax_rate) / 100), 2)
    total = subtotal + tax

    invoice = Invoice(
        company_id=company_id,
        invoice_number=invoice_number,
        client_id=body.client_id,
        subtotal=subtotal,
        tax=tax,
        discount=0.0,
        total=total,
        status="Draft",
        issued_date=body.issued_date,
        due_date=body.due_date,
        notes=body.notes,
        created_by_id=current_user.id,
    )
    db.add(invoice)
    db.flush()

    for it in body.items:
        total = (it.quantity or 0) * (it.unit_price or 0)
        db.add(InvoiceItem(
            company_id=company_id,
            invoice_id=invoice.id,
            description=it.description,
            quantity=it.quantity or 1,
            unit_price=it.unit_price or 0.0,
            total=total,
        ))

    db.commit()
    db.refresh(invoice)

    return {
        "id": invoice.id,
        "invoice_number": invoice.invoice_number,
        "client_id": invoice.client_id,
        "subtotal": invoice.subtotal,
        "tax": invoice.tax,
        "total": invoice.total,
        "status": invoice.status,
        "issued_date": invoice.issued_date.isoformat() if invoice.issued_date else None,
        "due_date": invoice.due_date.isoformat() if invoice.due_date else None,
    }


@router.get("")
def list_invoices(
    status: Optional[str] = Query(None, description="Filter by status (Paid/Pending/Overdue/Draft)"),
    search: Optional[str] = Query(None, description="Search by client name or invoice number"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List invoices for the current company (paginated).
    This is a company-scoped list endpoint, separate from role-specific MD/Purchase views.
    """
    if current_user.company_id is None:
        raise HTTPException(status_code=403, detail="User must be assigned to a company")

    query = apply_company_scope(db.query(Invoice), Invoice, current_user)

    if status and status != "All":
        query = query.filter(Invoice.status == status)

    if search:
        search_pattern = f"%{search}%"
        query = query.join(Client, Client.id == Invoice.client_id).filter(
            (Client.name.ilike(search_pattern)) |
            (Invoice.invoice_number.ilike(search_pattern))
        )

    total = query.count()
    invoices = query.order_by(Invoice.created_at.desc()).offset(skip).limit(limit).all()

    client_q = apply_company_scope(db.query(Client), Client, current_user)
    items = []
    for inv in invoices:
        client = client_q.filter(Client.id == inv.client_id).first() if inv.client_id else None
        items.append({
            "id": inv.id,
            "invoice_number": inv.invoice_number,
            "client": client.name if client else None,
            "client_id": inv.client_id,
            "subtotal": float(inv.subtotal or 0),
            "tax": float(inv.tax or 0),
            "discount": float(inv.discount or 0),
            "total": float(inv.total or 0),
            "status": inv.status,
            "issued_date": inv.issued_date.isoformat() if inv.issued_date else None,
            "due_date": inv.due_date.isoformat() if inv.due_date else None,
            "created_at": inv.created_at.isoformat() if getattr(inv, "created_at", None) else None,
        })

    return {
        "items": items,
        "total": total,
        "skip": skip,
        "limit": limit,
    }
