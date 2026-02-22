"""Invoice creation and list (company-scoped)."""
from fastapi import APIRouter, Depends, HTTPException, status
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
    ensure_company_access(client, current_user)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    company_id = current_user.company_id
    settings = db.query(CompanySettings).filter(CompanySettings.company_id == company_id).first()
    prefix = (settings.invoice_prefix or "INV").strip() or "INV"

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

    tax_rate = getattr(settings, "tax_rate", None) or 0
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
