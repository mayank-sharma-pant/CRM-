from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from datetime import datetime, timedelta
from pydantic import BaseModel
from decimal import Decimal

from app.database import get_db
from app.utils.dependencies import get_current_user, apply_company_scope, ensure_company_access, is_platform_admin
from app.models.user import User
from app.models.client import Client
from app.models.invoice import Invoice, InvoiceItem
from app.models.company_settings import CompanySettings
from app.models.lead import Lead
from app.schemas.user import MessageResponse

router = APIRouter()

PURCHASE_ROLES = {"purchase", "md", "admin"}


# ===============================
# Pydantic Schemas
# ===============================

class InvoiceItemCreate(BaseModel):
    description: str
    quantity: int = 1
    unit_price: float = 0

class InvoiceCreate(BaseModel):
    client_id: int
    items: List[InvoiceItemCreate]
    tax: float = 0
    discount: float = 0
    notes: Optional[str] = None
    due_days: int = 30  # days until due


def require_purchase(current_user: User = Depends(get_current_user)) -> User:
    if is_platform_admin(current_user):
        return current_user
    if current_user.role not in PURCHASE_ROLES:
        raise HTTPException(status_code=403, detail="Purchase department access required")
    return current_user


# ===============================
# Purchase Dashboard
# ===============================

@router.get("/dashboard")
def get_purchase_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_purchase)
):
    """Get purchase department dashboard"""
    inv_q = apply_company_scope(db.query(Invoice), Invoice, current_user)
    # Invoice stats
    paid = inv_q.filter(Invoice.status == "Paid").count()
    pending = inv_q.filter(Invoice.status == "Pending").count()
    overdue = inv_q.filter(Invoice.status == "Overdue").count()
    draft = inv_q.filter(Invoice.status == "Draft").count()
    
    # Get recent pending invoices
    pending_invoices = inv_q.filter(Invoice.status == "Pending").order_by(Invoice.created_at.desc()).limit(5).all()
    
    approval_queue = []
    client_q = apply_company_scope(db.query(Client), Client, current_user)
    user_q = apply_company_scope(db.query(User), User, current_user)
    for inv in pending_invoices:
        client = client_q.filter(Client.id == inv.client_id).first()
        creator = user_q.filter(User.id == inv.created_by_id).first() if inv.created_by_id else None
        approval_queue.append({
            "id": inv.id,
            "client": client.name if client else "Unknown",
            "amount": inv.total,
            "date": inv.issued_date.strftime("%Y-%m-%d") if inv.issued_date else None,
            "salesperson": creator.full_name if creator else "Unknown"
        })
    
    return {
        "kpis": [
            {"id": 1, "label": "Pending Invoices", "value": pending, "route": "/purchase/invoices"},
            {"id": 2, "label": "Paid Invoices", "value": paid, "route": "/purchase/invoices"},
            {"id": 3, "label": "Overdue Invoices", "value": overdue, "route": "/purchase/invoices"},
            {"id": 4, "label": "Draft Invoices", "value": draft, "route": "/purchase/invoices"}
        ],
        "approval_queue": approval_queue,
        "invoice_health": {
            "paid": paid,
            "pending": pending,
            "overdue": overdue,
            "draft": draft
        }
    }


# ===============================
# Sales Approvals (Invoices pending approval)
# ===============================

@router.get("/sales")
def list_sales_for_approval(
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_purchase)
):
    """List all sales/invoices pending approval (paginated)."""
    query = apply_company_scope(db.query(Invoice), Invoice, current_user)
    
    if status:
        query = query.filter(Invoice.status == status.title())
    else:
        query = query.filter(Invoice.status.in_(["Draft", "Pending"]))
    
    total = query.count()
    invoices = query.order_by(Invoice.created_at.desc()).offset(skip).limit(limit).all()
    
    result = []
    client_q = apply_company_scope(db.query(Client), Client, current_user)
    user_q = apply_company_scope(db.query(User), User, current_user)
    for inv in invoices:
        client = client_q.filter(Client.id == inv.client_id).first()
        creator = user_q.filter(User.id == inv.created_by_id).first() if inv.created_by_id else None
        result.append({
            "id": inv.id,
            "client": client.name if client else "Unknown",
            "amount": inv.total,
            "status": inv.status.lower(),
            "date": inv.issued_date.strftime("%Y-%m-%d") if inv.issued_date else None,
            "salesperson": creator.full_name if creator else "Unknown"
        })
    
    return {"sales": result, "total": total, "skip": skip, "limit": limit}


@router.get("/sales/{sale_id}")
def get_sale_detail(
    sale_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_purchase)
):
    """Get detailed sale/invoice information for approval"""
    invoice = db.query(Invoice).filter(Invoice.id == sale_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Sale not found")
    ensure_company_access(invoice, current_user)
    
    client = apply_company_scope(db.query(Client), Client, current_user).filter(Client.id == invoice.client_id).first()
    creator = apply_company_scope(db.query(User), User, current_user).filter(User.id == invoice.created_by_id).first() if invoice.created_by_id else None
    items = db.query(InvoiceItem).filter(InvoiceItem.invoice_id == sale_id).all()
    
    return {
        "id": invoice.id,
        "client": {
            "name": client.name if client else "Unknown",
            "email": client.email if client else None
        },
        "deal": {
            "amount": invoice.total,
            "subtotal": invoice.subtotal,
            "tax": invoice.tax,
            "items": [{"description": i.description, "quantity": i.quantity, "total": i.total} for i in items]
        },
        "salesperson": {
            "name": creator.full_name if creator else "Unknown"
        },
        "status": invoice.status
    }


@router.post("/sales/{sale_id}/approve")
def approve_sale(
    sale_id: int,
    notes: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_purchase)
):
    """Approve a sale/invoice"""
    invoice = db.query(Invoice).filter(Invoice.id == sale_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Sale not found")
    ensure_company_access(invoice, current_user)
    
    invoice.status = "Pending"  # Move from Draft to Pending (sent to client)
    db.commit()
    
    return {
        "message": f"Sale {sale_id} approved successfully",
        "status": "Pending",
        "approved_at": datetime.now().isoformat()
    }


@router.post("/sales/{sale_id}/reject")
def reject_sale(
    sale_id: int,
    reason: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_purchase)
):
    """Reject a sale/invoice"""
    invoice = db.query(Invoice).filter(Invoice.id == sale_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Sale not found")
    ensure_company_access(invoice, current_user)
    
    invoice.status = "Rejected"
    db.commit()
    
    return {
        "message": f"Sale {sale_id} rejected",
        "reason": reason,
        "rejected_at": datetime.now().isoformat()
    }


# ===============================
# Invoices Management
# ===============================

@router.get("/invoices")
def list_invoices(
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_purchase)
):
    """List all invoices (paginated list with summary)."""
    base_query = apply_company_scope(db.query(Invoice), Invoice, current_user)
    
    filtered_query = base_query
    if status:
        filtered_query = filtered_query.filter(Invoice.status == status.title())
    
    total = filtered_query.count()
    invoices = filtered_query.order_by(Invoice.created_at.desc()).offset(skip).limit(limit).all()
    
    result = []
    for inv in invoices:
        client = apply_company_scope(db.query(Client), Client, current_user).filter(Client.id == inv.client_id).first()
        creator = apply_company_scope(db.query(User), User, current_user).filter(User.id == inv.created_by_id).first() if inv.created_by_id else None
        result.append({
            "id": inv.id,
            "number": inv.invoice_number,
            "client": client.name if client else "Unknown",
            "amount": inv.total,
            "status": inv.status.lower(),
            "issued": inv.issued_date.strftime("%Y-%m-%d") if inv.issued_date else None,
            "due": inv.due_date.strftime("%Y-%m-%d") if inv.due_date else None,
            "paid_at": inv.paid_date.strftime("%Y-%m-%d") if inv.paid_date else None,
            "sales_rep_name": creator.full_name if creator else "System"
        })
    
    summary = {
        "paid": base_query.filter(Invoice.status == "Paid").count(),
        "pending": base_query.filter(Invoice.status == "Pending").count(),
        "overdue": base_query.filter(Invoice.status == "Overdue").count(),
        "draft": base_query.filter(Invoice.status == "Draft").count(),
        "total_outstanding": base_query.filter(Invoice.status.in_(["Pending", "Overdue"])).with_entities(func.sum(Invoice.total)).scalar() or 0
    }
    
    return {"invoices": result, "summary": summary, "total": total, "skip": skip, "limit": limit}


@router.post("/invoices")
def create_invoice(
    body: InvoiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_purchase)
):
    """Create a new invoice from purchase department"""
    if current_user.company_id is None:
        raise HTTPException(status_code=403, detail="Platform Admin cannot create invoices")
    
    # Validate client
    client = apply_company_scope(db.query(Client), Client, current_user).filter(Client.id == body.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Generate invoice number
    settings = db.query(CompanySettings).filter(CompanySettings.company_id == current_user.company_id).first()
    prefix = (settings.invoice_prefix or "INV").strip() if settings and settings.invoice_prefix else "INV"
    prefix = prefix or "INV"
    
    count = apply_company_scope(db.query(Invoice), Invoice, current_user).count()
    inv_number = f"{prefix}-{current_user.company_id:03d}-{count + 1:04d}"
    
    # Robust collision guard against concurrent creates or deleted invoices
    while apply_company_scope(db.query(Invoice), Invoice, current_user).filter(Invoice.invoice_number == inv_number).first():
        count += 1
        inv_number = f"{prefix}-{current_user.company_id:03d}-{count + 1:04d}"
    
    # Calculate totals
    subtotal = Decimal(0)
    for item in body.items:
        subtotal += Decimal(str(item.unit_price)) * item.quantity
    
    tax_amount = Decimal(str(body.tax))
    discount_amount = Decimal(str(body.discount))
    total = subtotal + tax_amount - discount_amount
    
    today = datetime.now().date()
    due_date = today + timedelta(days=body.due_days)
    
    invoice = Invoice(
        company_id=current_user.company_id,
        invoice_number=inv_number,
        client_id=body.client_id,
        subtotal=subtotal,
        tax=tax_amount,
        discount=discount_amount,
        total=total,
        status="Draft",
        issued_date=today,
        due_date=due_date,
        notes=body.notes,
        created_by_id=current_user.id
    )
    db.add(invoice)
    db.flush()
    
    # Add line items
    for item in body.items:
        line = InvoiceItem(
            company_id=current_user.company_id,
            invoice_id=invoice.id,
            description=item.description,
            quantity=item.quantity,
            unit_price=Decimal(str(item.unit_price)),
            total=Decimal(str(item.unit_price)) * item.quantity
        )
        db.add(line)
    
    db.commit()
    db.refresh(invoice)
    
    return {
        "id": invoice.id,
        "number": inv_number,
        "total": float(total),
        "status": "Draft",
        "message": f"Invoice {inv_number} created successfully"
    }


@router.get("/invoices/{invoice_id}")
def get_invoice_detail(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_purchase)
):
    """Get detailed invoice information"""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    ensure_company_access(invoice, current_user)
    
    client = apply_company_scope(db.query(Client), Client, current_user).filter(Client.id == invoice.client_id).first()
    items = db.query(InvoiceItem).filter(InvoiceItem.invoice_id == invoice_id).all()
    
    return {
        "id": invoice.id,
        "number": invoice.invoice_number,
        "client": {
            "name": client.name if client else "Unknown",
            "email": client.email if client else None,
            "address": client.address if client else None
        },
        "items": [
            {"description": i.description, "quantity": i.quantity, "unit_price": i.unit_price, "total": i.total}
            for i in items
        ],
        "subtotal": invoice.subtotal,
        "tax": invoice.tax,
        "total": invoice.total,
        "status": invoice.status,
        "issued": invoice.issued_date.strftime("%Y-%m-%d") if invoice.issued_date else None,
        "due": invoice.due_date.strftime("%Y-%m-%d") if invoice.due_date else None
    }


@router.post("/invoices/{invoice_id}/send", response_model=MessageResponse)
def send_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_purchase)
):
    """Send invoice to client"""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    ensure_company_access(invoice, current_user)
    
    invoice.status = "Pending"
    invoice.issued_date = datetime.now().date()
    db.commit()
    
    return {"message": f"Invoice {invoice_id} sent to client"}


@router.post("/invoices/{invoice_id}/mark-paid", response_model=MessageResponse)
def mark_invoice_paid(
    invoice_id: int,
    payment_date: str = Query(...),
    payment_method: str = Query("bank_transfer"),
    reference: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_purchase)
):
    """Mark invoice as paid"""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    ensure_company_access(invoice, current_user)
    
    invoice.status = "Paid"
    invoice.paid_date = datetime.strptime(payment_date, "%Y-%m-%d").date()
    db.commit()
    
    return {"message": f"Invoice {invoice_id} marked as paid"}


@router.post("/invoices/{invoice_id}/send-reminder", response_model=MessageResponse)
def send_payment_reminder(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_purchase)
):
    """Send payment reminder for invoice"""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    ensure_company_access(invoice, current_user)
    
    return {"message": f"Payment reminder sent for invoice {invoice_id}"}


# ===============================
# Purchase Monitoring
# ===============================

@router.get("/monitoring")
def get_purchase_monitoring(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_purchase)
):
    """Get purchase department monitoring and analytics"""
    inv_q = apply_company_scope(db.query(Invoice), Invoice, current_user)
    
    # Invoice stats
    overdue_count = inv_q.filter(Invoice.status == "Overdue").count()
    overdue_amount = inv_q.filter(Invoice.status == "Overdue").with_entities(func.sum(Invoice.total)).scalar() or 0
    pending_count = inv_q.filter(Invoice.status == "Pending").count()
    pending_amount = inv_q.filter(Invoice.status == "Pending").with_entities(func.sum(Invoice.total)).scalar() or 0
    paid_count = inv_q.filter(Invoice.status == "Paid").count()
    paid_amount = inv_q.filter(Invoice.status == "Paid").with_entities(func.sum(Invoice.total)).scalar() or 0
    draft_count = inv_q.filter(Invoice.status == "Draft").count()
    total_invoices = inv_q.count()
    
    # Build alerts dynamically
    alerts = []
    if overdue_count > 0:
        alerts.append({
            "id": 1, "type": "invoice", "severity": "High",
            "title": f"{overdue_count} invoices overdue",
            "message": f"{overdue_count} invoices overdue totaling ${float(overdue_amount):,.0f}",
            "category": "Finance", "detected": "Now",
            "evidence": [f"${float(overdue_amount):,.0f} outstanding"]
        })
    if pending_count > 3:
        alerts.append({
            "id": 2, "type": "invoice", "severity": "Medium",
            "title": f"{pending_count} invoices pending settlement",
            "message": f"High volume of pending invoices ({pending_count})",
            "category": "Operations", "detected": "Now",
            "evidence": [f"{pending_count} pending invoices"]
        })
    if draft_count > 0:
        alerts.append({
            "id": 3, "type": "invoice", "severity": "Low",
            "title": f"{draft_count} draft invoices need attention",
            "message": f"{draft_count} invoices still in draft status",
            "category": "Workflow", "detected": "Now",
            "evidence": [f"{draft_count} unsent drafts"]
        })
    
    # Dynamic risk trend (last 7 days of invoice activity)
    risk_trend = []
    day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    for i in range(6, -1, -1):
        d = datetime.now() - timedelta(days=i)
        day_count = inv_q.filter(
            func.date(Invoice.created_at) == d.date()
        ).count()
        risk_trend.append({"date": day_names[d.weekday()], "value": day_count})
    
    # Determine trend direction
    trend_direction = "stable"
    if overdue_count > 0:
        trend_direction = "worsening"
    elif paid_count > pending_count:
        trend_direction = "improving"
    
    # Operational metrics
    settlement_rate = round((paid_count / total_invoices * 100), 1) if total_invoices > 0 else 0
    
    return {
        "alerts": alerts,
        "metrics": {
            "pending_invoices": pending_count,
            "overdue_invoices": overdue_count,
            "overdue_amount": float(overdue_amount),
            "paid_amount": float(paid_amount),
            "pending_amount": float(pending_amount),
            "total_invoices": total_invoices,
            "settlement_rate": settlement_rate
        },
        "risk_trend": risk_trend,
        "summary": {
            "trendDirection": trend_direction
        }
    }

