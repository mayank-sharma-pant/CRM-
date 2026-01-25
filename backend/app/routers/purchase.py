from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime

from app.database import get_db
from app.utils.dependencies import get_current_user
from app.models.user import User

router = APIRouter()


# ===============================
# Purchase Dashboard
# ===============================

@router.get("/dashboard")
def get_purchase_dashboard(
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Get purchase department dashboard"""
    return {
        "kpis": [
            {"id": 1, "label": "Pending Approvals", "value": 18, "change": "+3", "trend": "up", "route": "/purchase/sales"},
            {"id": 2, "label": "Approved Today", "value": 12, "change": "+5", "trend": "up", "route": "/purchase/sales"},
            {"id": 3, "label": "Rejected Today", "value": 2, "change": "-1", "trend": "down", "route": "/purchase/sales"},
            {"id": 4, "label": "Overdue Invoices", "value": 8, "change": "+2", "trend": "up", "route": "/purchase/invoices"}
        ],
        "approval_queue": [
            {"id": 1, "client": "BigBank International", "amount": 45000, "type": "Enterprise", 
             "date": "2024-01-10", "priority": "high", "salesperson": "James Wilson"},
            {"id": 2, "client": "TechFlow Inc.", "amount": 12500, "type": "SMB",
             "date": "2024-01-09", "priority": "medium", "salesperson": "Alex Johnson"},
            {"id": 3, "client": "CloudNet Corp", "amount": 8200, "type": "SMB",
             "date": "2024-01-07", "priority": "low", "salesperson": "Sarah Smith"}
        ],
        "invoice_health": {
            "paid": 145,
            "pending": 24,
            "overdue": 8,
            "draft": 12
        },
        "monitoring_highlights": [
            {"id": 1, "title": "High discount rate detected", "severity": "Medium", "time": "2h ago"},
            {"id": 2, "title": "Invoice collection delay", "severity": "High", "time": "4h ago"}
        ]
    }


# ===============================
# Sales Approvals
# ===============================

@router.get("/sales")
def list_sales_for_approval(
    status: Optional[str] = Query(None, description="pending, approved, rejected"),
    priority: Optional[str] = Query(None, description="high, medium, low"),
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """List all sales pending approval"""
    sales = [
        {"id": 1, "client": "BigBank International", "amount": 45000, "discount": 15,
         "type": "Enterprise", "date": "2024-01-10", "status": "pending", "priority": "high",
         "salesperson": "James Wilson", "team": "Enterprise", "notes": "Strategic account"},
        {"id": 2, "client": "TechFlow Inc.", "amount": 12500, "discount": 10,
         "type": "SMB", "date": "2024-01-09", "status": "pending", "priority": "medium",
         "salesperson": "Alex Johnson", "team": "Sales Alpha", "notes": "Referral from existing client"},
        {"id": 3, "client": "CloudNet Corp", "amount": 8200, "discount": 5,
         "type": "SMB", "date": "2024-01-07", "status": "pending", "priority": "low",
         "salesperson": "Sarah Smith", "team": "Sales Bravo", "notes": ""},
        {"id": 4, "client": "StartupXYZ", "amount": 4500, "discount": 20,
         "type": "Startup", "date": "2024-01-06", "status": "pending", "priority": "medium",
         "salesperson": "Mike Williams", "team": "Sales Charlie", "notes": "High discount - needs review"},
        {"id": 5, "client": "RetailGiant", "amount": 85000, "discount": 8,
         "type": "Enterprise", "date": "2024-01-05", "status": "approved", "priority": "high",
         "salesperson": "Lisa Chen", "team": "Enterprise", "notes": "Multi-year deal"}
    ]
    
    if status:
        sales = [s for s in sales if s["status"] == status]
    if priority:
        sales = [s for s in sales if s["priority"] == priority]
    
    return {"sales": sales, "total": len(sales)}


@router.get("/sales/{sale_id}")
def get_sale_detail(
    sale_id: int,
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Get detailed sale information for approval"""
    return {
        "id": sale_id,
        "client": {
            "name": "BigBank International",
            "type": "Enterprise",
            "industry": "Banking",
            "existing_client": True,
            "total_revenue": 250000
        },
        "deal": {
            "amount": 45000,
            "discount": 15,
            "discount_amount": 7941,
            "net_amount": 37059,
            "products": ["CRM Pro", "Analytics Suite"],
            "term": "Annual"
        },
        "salesperson": {
            "name": "James Wilson",
            "team": "Enterprise",
            "performance": "above_target"
        },
        "history": [
            {"action": "Created", "by": "James Wilson", "date": "2024-01-10 09:30"},
            {"action": "Submitted for approval", "by": "James Wilson", "date": "2024-01-10 14:00"}
        ],
        "flags": [
            {"type": "discount", "message": "Discount above 10% threshold", "severity": "medium"}
        ]
    }


@router.post("/sales/{sale_id}/approve")
def approve_sale(
    sale_id: int,
    notes: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Approve a sale"""
    return {
        "message": f"Sale {sale_id} approved successfully",
        "sale_id": sale_id,
        "status": "approved",
        "approved_at": datetime.now().isoformat(),
        "approved_by": "Purchase Admin"
    }


@router.post("/sales/{sale_id}/reject")
def reject_sale(
    sale_id: int,
    reason: str = Query(..., description="Rejection reason"),
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Reject a sale"""
    return {
        "message": f"Sale {sale_id} rejected",
        "sale_id": sale_id,
        "status": "rejected",
        "reason": reason,
        "rejected_at": datetime.now().isoformat()
    }


@router.post("/sales/{sale_id}/request-revision")
def request_revision(
    sale_id: int,
    feedback: str = Query(...),
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Request revision on a sale"""
    return {
        "message": f"Revision requested for sale {sale_id}",
        "sale_id": sale_id,
        "status": "revision_requested",
        "feedback": feedback
    }


# ===============================
# Invoices Management
# ===============================

@router.get("/invoices")
def list_invoices(
    status: Optional[str] = Query(None, description="draft, pending, paid, overdue"),
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """List all invoices"""
    invoices = [
        {"id": 1, "number": "INV-2024-001", "client": "BigBank International", "amount": 45000,
         "status": "paid", "issued": "2024-01-05", "due": "2024-02-04", "paid_at": "2024-01-20"},
        {"id": 2, "number": "INV-2024-002", "client": "TechFlow Inc.", "amount": 12500,
         "status": "pending", "issued": "2024-01-10", "due": "2024-02-09", "paid_at": None},
        {"id": 3, "number": "INV-2024-003", "client": "GlobalRetail Corp", "amount": 28000,
         "status": "overdue", "issued": "2023-12-15", "due": "2024-01-14", "paid_at": None},
        {"id": 4, "number": "INV-2024-004", "client": "StartupXYZ", "amount": 4500,
         "status": "draft", "issued": None, "due": None, "paid_at": None},
        {"id": 5, "number": "INV-2024-005", "client": "CloudNet Corp", "amount": 8200,
         "status": "pending", "issued": "2024-01-12", "due": "2024-02-11", "paid_at": None}
    ]
    
    if status:
        invoices = [i for i in invoices if i["status"] == status]
    
    summary = {
        "paid": sum(1 for i in invoices if i["status"] == "paid"),
        "pending": sum(1 for i in invoices if i["status"] == "pending"),
        "overdue": sum(1 for i in invoices if i["status"] == "overdue"),
        "draft": sum(1 for i in invoices if i["status"] == "draft"),
        "total_outstanding": sum(i["amount"] for i in invoices if i["status"] in ["pending", "overdue"])
    }
    
    return {"invoices": invoices, "summary": summary}


@router.get("/invoices/{invoice_id}")
def get_invoice_detail(
    invoice_id: int,
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Get detailed invoice information"""
    return {
        "id": invoice_id,
        "number": "INV-2024-002",
        "client": {
            "name": "TechFlow Inc.",
            "email": "billing@techflow.io",
            "address": "456 Tech Ave, San Francisco, CA"
        },
        "items": [
            {"description": "CRM Pro License (Annual)", "quantity": 1, "unit_price": 10000, "total": 10000},
            {"description": "Implementation Services", "quantity": 1, "unit_price": 2500, "total": 2500}
        ],
        "subtotal": 12500,
        "tax": 0,
        "total": 12500,
        "status": "pending",
        "issued": "2024-01-10",
        "due": "2024-02-09",
        "payment_history": []
    }


@router.post("/invoices/{invoice_id}/send")
def send_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Send invoice to client"""
    return {
        "message": f"Invoice {invoice_id} sent to client",
        "sent_at": datetime.now().isoformat()
    }


@router.post("/invoices/{invoice_id}/mark-paid")
def mark_invoice_paid(
    invoice_id: int,
    payment_date: str = Query(...),
    payment_method: str = Query("bank_transfer"),
    reference: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Mark invoice as paid"""
    return {
        "message": f"Invoice {invoice_id} marked as paid",
        "payment_date": payment_date,
        "payment_method": payment_method,
        "reference": reference
    }


@router.post("/invoices/{invoice_id}/send-reminder")
def send_payment_reminder(
    invoice_id: int,
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Send payment reminder for invoice"""
    return {
        "message": f"Payment reminder sent for invoice {invoice_id}",
        "sent_at": datetime.now().isoformat()
    }


# ===============================
# Purchase Monitoring
# ===============================

@router.get("/monitoring")
def get_purchase_monitoring(
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Get purchase department monitoring and analytics"""
    return {
        "alerts": [
            {"id": 1, "type": "discount", "severity": "High", "title": "Excessive discount pattern",
             "message": "3 sales this week with >20% discount from Sales Charlie",
             "detected": "2h ago", "action_required": True},
            {"id": 2, "type": "invoice", "severity": "High", "title": "Invoice collection delay",
             "message": "8 invoices overdue totaling $186K",
             "detected": "4h ago", "action_required": True},
            {"id": 3, "type": "approval", "severity": "Medium", "title": "Pending approval backlog",
             "message": "5 sales pending >48 hours",
             "detected": "1d ago", "action_required": False}
        ],
        "metrics": {
            "avg_approval_time": "4.2 hours",
            "approval_rate": "92%",
            "avg_discount": "8.5%",
            "collection_rate": "94%"
        },
        "discount_analysis": [
            {"team": "Sales Alpha", "avg_discount": 7.2, "count": 24},
            {"team": "Sales Bravo", "avg_discount": 9.1, "count": 18},
            {"team": "Sales Charlie", "avg_discount": 14.5, "count": 12},
            {"team": "Enterprise", "avg_discount": 6.8, "count": 8}
        ],
        "collection_timeline": [
            {"range": "0-30 days", "count": 145, "amount": 1250000},
            {"range": "31-60 days", "count": 16, "amount": 98000},
            {"range": "60+ days", "count": 8, "amount": 186000}
        ]
    }
