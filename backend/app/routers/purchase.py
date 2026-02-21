from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from datetime import datetime

from app.database import get_db
from app.utils.dependencies import get_current_user, apply_company_scope, ensure_company_access
from app.models.user import User
from app.models.client import Client
from app.models.invoice import Invoice, InvoiceItem
from app.models.lead import Lead

router = APIRouter()


# ===============================
# Purchase Dashboard
# ===============================

@router.get("/dashboard")
def get_purchase_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all sales/invoices pending approval"""
    query = apply_company_scope(db.query(Invoice), Invoice, current_user)
    
    if status:
        query = query.filter(Invoice.status == status.title())
    else:
        query = query.filter(Invoice.status.in_(["Draft", "Pending"]))
    
    invoices = query.order_by(Invoice.created_at.desc()).all()
    
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
    
    return {"sales": result, "total": len(result)}


@router.get("/sales/{sale_id}")
def get_sale_detail(
    sale_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get detailed sale/invoice information for approval"""
    invoice = db.query(Invoice).filter(Invoice.id == sale_id).first()
    ensure_company_access(invoice, current_user)
    if not invoice:
        raise HTTPException(status_code=404, detail="Sale not found")
    
    client = db.query(Client).filter(Client.id == invoice.client_id).first()
    creator = db.query(User).filter(User.id == invoice.created_by_id).first() if invoice.created_by_id else None
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
    current_user: User = Depends(get_current_user)
):
    """Approve a sale/invoice"""
    invoice = db.query(Invoice).filter(Invoice.id == sale_id).first()
    ensure_company_access(invoice, current_user)
    if not invoice:
        raise HTTPException(status_code=404, detail="Sale not found")
    
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
    current_user: User = Depends(get_current_user)
):
    """Reject a sale/invoice"""
    invoice = db.query(Invoice).filter(Invoice.id == sale_id).first()
    ensure_company_access(invoice, current_user)
    if not invoice:
        raise HTTPException(status_code=404, detail="Sale not found")
    
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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all invoices"""
    query = apply_company_scope(db.query(Invoice), Invoice, current_user)
    
    if status:
        query = query.filter(Invoice.status == status.title())
    
    invoices = query.order_by(Invoice.created_at.desc()).all()
    
    result = []
    for inv in invoices:
        client = db.query(Client).filter(Client.id == inv.client_id).first()
        result.append({
            "id": inv.id,
            "number": inv.invoice_number,
            "client": client.name if client else "Unknown",
            "amount": inv.total,
            "status": inv.status.lower(),
            "issued": inv.issued_date.strftime("%Y-%m-%d") if inv.issued_date else None,
            "due": inv.due_date.strftime("%Y-%m-%d") if inv.due_date else None,
            "paid_at": inv.paid_date.strftime("%Y-%m-%d") if inv.paid_date else None
        })
    
    # Summary (use same company-scoped query)
    summary = {
        "paid": query.filter(Invoice.status == "Paid").count(),
        "pending": query.filter(Invoice.status == "Pending").count(),
        "overdue": query.filter(Invoice.status == "Overdue").count(),
        "draft": query.filter(Invoice.status == "Draft").count(),
        "total_outstanding": query.filter(Invoice.status.in_(["Pending", "Overdue"])).with_entities(func.sum(Invoice.total)).scalar() or 0
    }
    
    return {"invoices": result, "summary": summary}


@router.get("/invoices/{invoice_id}")
def get_invoice_detail(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get detailed invoice information"""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    ensure_company_access(invoice, current_user)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    client = db.query(Client).filter(Client.id == invoice.client_id).first()
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


@router.post("/invoices/{invoice_id}/send")
def send_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Send invoice to client"""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    ensure_company_access(invoice, current_user)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    invoice.status = "Pending"
    invoice.issued_date = datetime.now().date()
    db.commit()
    
    return {"message": f"Invoice {invoice_id} sent to client"}


@router.post("/invoices/{invoice_id}/mark-paid")
def mark_invoice_paid(
    invoice_id: int,
    payment_date: str = Query(...),
    payment_method: str = Query("bank_transfer"),
    reference: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark invoice as paid"""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    ensure_company_access(invoice, current_user)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    invoice.status = "Paid"
    invoice.paid_date = datetime.strptime(payment_date, "%Y-%m-%d").date()
    db.commit()
    
    return {"message": f"Invoice {invoice_id} marked as paid"}


@router.post("/invoices/{invoice_id}/send-reminder")
def send_payment_reminder(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Send payment reminder for invoice"""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    ensure_company_access(invoice, current_user)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    return {"message": f"Payment reminder sent for invoice {invoice_id}"}


# ===============================
# Purchase Monitoring
# ===============================

@router.get("/monitoring")
def get_purchase_monitoring(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get purchase department monitoring and analytics"""
    inv_q = apply_company_scope(db.query(Invoice), Invoice, current_user)
    # Invoice stats
    overdue_count = inv_q.filter(Invoice.status == "Overdue").count()
    overdue_amount = inv_q.filter(Invoice.status == "Overdue").with_entities(func.sum(Invoice.total)).scalar() or 0
    
    pending_count = inv_q.filter(Invoice.status == "Pending").count()
    
    return {
        "alerts": [
            {"id": 1, "type": "invoice", "severity": "High", 
             "message": f"{overdue_count} invoices overdue totaling ${overdue_amount:,.0f}"}
        ] if overdue_count > 0 else [],
        "metrics": {
            "pending_invoices": pending_count,
            "overdue_invoices": overdue_count,
            "overdue_amount": overdue_amount
        }
    }
