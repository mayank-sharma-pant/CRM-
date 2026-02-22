from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from datetime import datetime, timedelta

from app.database import get_db
from app.utils.dependencies import get_current_user, apply_company_scope, ensure_company_access, is_platform_admin
from app.models.user import User
from app.models.lead import Lead
from app.models.client import Client
from app.models.invoice import Invoice, InvoiceItem
from app.models.task import Task
from app.models.team import Team

router = APIRouter()

MD_ROLES = {"md", "admin"}


def require_md(current_user: User = Depends(get_current_user)) -> User:
    if is_platform_admin(current_user):
        return current_user
    if current_user.role not in MD_ROLES:
        raise HTTPException(status_code=403, detail="MD access required")
    return current_user


# ===============================
# MD Dashboard
# ===============================

@router.get("/dashboard")
def get_md_dashboard(
    period: str = Query("30d"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_md)
):
    """Get MD executive dashboard with company-wide KPIs"""
    # Real counts (company-scoped)
    lead_q = apply_company_scope(db.query(Lead), Lead, current_user)
    total_leads = lead_q.count()
    converted = lead_q.filter(Lead.status == "Converted").count()
    lost = lead_q.filter(Lead.status == "Lost").count()
    active = total_leads - converted - lost
    win_rate = int((converted / (converted + lost) * 100)) if (converted + lost) > 0 else 0
    
    client_q = apply_company_scope(db.query(Client), Client, current_user)
    total_clients = client_q.count()
    inv_q = apply_company_scope(db.query(Invoice), Invoice, current_user)
    total_revenue = inv_q.filter(Invoice.status == "Paid").with_entities(func.sum(Invoice.total)).scalar() or 0
    
    # Invoice stats
    paid = inv_q.filter(Invoice.status == "Paid").count()
    pending = inv_q.filter(Invoice.status == "Pending").count()
    overdue = inv_q.filter(Invoice.status == "Overdue").count()
    
    return {
        "kpis": [
            {"id": 1, "label": "Total Revenue", "value": f"${total_revenue:,.0f}", "route": "/md/revenue"},
            {"id": 2, "label": "Pipeline Leads", "value": str(active), "route": "/md/leads"},
            {"id": 3, "label": "Win Rate", "value": f"{win_rate}%", "route": "/md/sales"},
            {"id": 4, "label": "Active Clients", "value": str(total_clients), "route": "/md/clients"},
            {"id": 5, "label": "Invoices Paid", "value": str(paid), "route": "/md/revenue"},
            {"id": 6, "label": "Invoices Pending", "value": str(pending), "route": "/md/revenue"}
        ],
        "pipelineSummary": {
            "stageDistribution": [
                {"stage": "New", "count": lead_q.filter(Lead.status == "New").count()},
                {"stage": "Contacted", "count": lead_q.filter(Lead.status == "Contacted").count()},
                {"stage": "Qualified", "count": lead_q.filter(Lead.status == "Qualified").count()},
                {"stage": "Proposal", "count": lead_q.filter(Lead.status == "Proposal").count()},
                {"stage": "Converted", "count": converted}
            ]
        },
        "financeSnapshot": {
            "invoiceHealth": [
                {"name": "Paid", "value": paid, "color": "#10b981"},
                {"name": "Pending", "value": pending, "color": "#f59e0b"},
                {"name": "Overdue", "value": overdue, "color": "#ef4444"}
            ],
            "counts": {"paid": paid, "outstanding": pending, "overdue": overdue}
        }
    }


# ===============================
# Revenue Analytics
# ===============================

@router.get("/revenue")
def get_revenue_analytics(
    period: str = Query("30d"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_md)
):
    """Get detailed revenue analytics"""
    inv_q = apply_company_scope(db.query(Invoice), Invoice, current_user)
    total_revenue = inv_q.filter(Invoice.status == "Paid").with_entities(func.sum(Invoice.total)).scalar() or 0
    outstanding = inv_q.filter(Invoice.status == "Pending").with_entities(func.sum(Invoice.total)).scalar() or 0
    
    return {
        "kpis": [
            {"id": 1, "label": "Total Revenue", "value": f"${total_revenue:,.0f}"},
            {"id": 2, "label": "Outstanding", "value": f"${outstanding:,.0f}"}
        ],
        "total_revenue": total_revenue,
        "outstanding": outstanding
    }


# ===============================
# Company-wide Sales Analytics
# ===============================

@router.get("/sales")
def get_company_sales(
    period: str = Query("30d"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_md)
):
    """Get company-wide sales analytics"""
    lead_q = apply_company_scope(db.query(Lead), Lead, current_user)
    total = lead_q.count()
    won = lead_q.filter(Lead.status == "Converted").count()
    lost = lead_q.filter(Lead.status == "Lost").count()
    active = total - won - lost
    win_rate = int((won / (won + lost) * 100)) if (won + lost) > 0 else 0
    
    # Team performance (company-scoped)
    teams = apply_company_scope(db.query(Team), Team, current_user).all()
    team_performance = []
    for team in teams:
        team_leads = lead_q.filter(Lead.team_id == team.id).count()
        team_won = lead_q.filter(Lead.team_id == team.id, Lead.status == "Converted").count()
        team_performance.append({
            "team": team.name,
            "leads": team_leads,
            "won": team_won,
            "win_rate": int((team_won / team_leads * 100)) if team_leads > 0 else 0
        })
    
    return {
        "summary": {
            "total_deals": total,
            "won": won,
            "lost": lost,
            "active": active,
            "win_rate": win_rate
        },
        "team_performance": team_performance
    }


# ===============================
# Company-wide Leads
# ===============================

@router.get("/leads")
def get_company_leads(
    status: Optional[str] = Query(None),
    team: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_md)
):
    """Get all company leads with filters"""
    query = apply_company_scope(db.query(Lead), Lead, current_user)
    
    if status:
        query = query.filter(Lead.status == status)
    
    leads = query.order_by(Lead.created_at.desc()).all()
    
    result = []
    team_q = apply_company_scope(db.query(Team), Team, current_user)
    user_q = apply_company_scope(db.query(User), User, current_user)
    for lead in leads:
        team_obj = team_q.filter(Team.id == lead.team_id).first() if lead.team_id else None
        owner = user_q.filter(User.id == lead.assigned_to_id).first() if lead.assigned_to_id else None
        result.append({
            "id": lead.id,
            "name": lead.name,
            "company": lead.company,
            "status": lead.status,
            "team": team_obj.name if team_obj else "Unassigned",
            "owner": owner.full_name if owner else "Unassigned"
        })
    
    return {"leads": result, "total": len(result)}


# ===============================
# Company-wide Clients
# ===============================

@router.get("/clients")
def get_company_clients(
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_md)
):
    """Get all company clients"""
    client_q = apply_company_scope(db.query(Client), Client, current_user)
    total = client_q.count()
    
    clients = client_q.order_by(Client.created_at.desc()).limit(10).all()
    
    return {
        "summary": {
            "total": total,
            "active": total
        },
        "top_clients": [
            {"id": c.id, "name": c.name, "company": c.company}
            for c in clients
        ]
    }


# ===============================
# Employee Lookup
# ===============================

@router.get("/employee-lookup")
def employee_lookup(
    search: Optional[str] = Query(None),
    team: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_md)
):
    """Search and lookup employees"""
    query = apply_company_scope(db.query(User), User, current_user)
    
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (User.full_name.ilike(search_pattern)) |
            (User.email.ilike(search_pattern))
        )
    if role:
        query = query.filter(User.role == role.lower())
    
    users = query.all()
    
    result = []
    team_q = apply_company_scope(db.query(Team), Team, current_user)
    for user in users:
        team_obj = team_q.filter(Team.id == user.team_id).first() if user.team_id else None
        result.append({
            "id": f"EMP{user.id:03d}",
            "user_id": user.id,
            "name": user.full_name,
            "email": user.email,
            "role": user.role.title(),
            "team": team_obj.name if team_obj else None,
            "status": user.status
        })
    
    return {"employees": result, "total": len(result)}


@router.get("/employee-lookup/{user_id}")
def get_employee_detail(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_md)
):
    """Get detailed employee information"""
    user = apply_company_scope(db.query(User), User, current_user).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    team = apply_company_scope(db.query(Team), Team, current_user).filter(Team.id == user.team_id).first() if user.team_id else None
    
    # Performance metrics (company-scoped)
    lead_q = apply_company_scope(db.query(Lead), Lead, current_user)
    leads = lead_q.filter(Lead.assigned_to_id == user_id).count()
    converted = lead_q.filter(Lead.assigned_to_id == user_id, Lead.status == "Converted").count()
    
    return {
        "employee": {
            "id": user.id,
            "name": user.full_name,
            "email": user.email,
            "phone": user.phone,
            "role": user.role,
            "team": team.name if team else None,
            "status": user.status
        },
        "performance": {
            "leads": leads,
            "converted": converted
        }
    }


# ===============================
# Company Monitoring
# ===============================

@router.get("/monitoring")
def get_company_monitoring(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_md)
):
    """Get company-wide monitoring and alerts"""
    # Get team status (company-scoped)
    teams = apply_company_scope(db.query(Team), Team, current_user).all()
    team_status = []
    lead_q = apply_company_scope(db.query(Lead), Lead, current_user)
    for team in teams:
        team_leads = lead_q.filter(Lead.team_id == team.id).count()
        team_status.append({
            "team": team.name,
            "status": "healthy",
            "leads": team_leads
        })
    
    # Get overdue tasks (company-scoped)
    overdue_count = apply_company_scope(db.query(Task), Task, current_user).filter(
        Task.due_date < datetime.now(),
        Task.status != "Completed"
    ).count()
    
    return {
        "alerts": [
            {"id": 1, "type": "tasks", "message": f"{overdue_count} overdue tasks", "severity": "Medium"}
        ] if overdue_count > 0 else [],
        "team_status": team_status
    }


# ===============================
# Company-wide Invoices
# ===============================

@router.get("/invoices")
def get_company_invoices(
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_md)
):
    """Get all company invoices for MD view"""
    inv_q = apply_company_scope(db.query(Invoice), Invoice, current_user)
    if status and status != "All":
        inv_q = inv_q.filter(Invoice.status == status)

    invoices = inv_q.order_by(Invoice.created_at.desc()).all()

    client_q = apply_company_scope(db.query(Client), Client, current_user)
    result = []
    for inv in invoices:
        client = client_q.filter(Client.id == inv.client_id).first() if inv.client_id else None
        result.append({
            "id": f"INV-{inv.id:04d}",
            "db_id": inv.id,
            "client": client.name if client else "Unknown",
            "amount": f"${inv.total:,.2f}" if inv.total else "$0.00",
            "status": inv.status or "Draft",
            "dueDate": inv.due_date.strftime("%Y-%m-%d") if inv.due_date else None,
            "linkedSale": None,
            "paymentStatus": "Settled" if inv.status == "Paid" else "Awaiting"
        })

    return {"invoices": result, "total": len(result)}


# ===============================
# Performance Points / Incentives
# ===============================

@router.get("/points")
def get_performance_points(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_md)
):
    """Get employee performance points based on lead conversions"""
    lead_q = apply_company_scope(db.query(Lead), Lead, current_user)
    user_q = apply_company_scope(db.query(User), User, current_user)

    sales_users = user_q.filter(User.role.in_(["sales", "manager"])).all()

    performance = []
    for user in sales_users:
        total_leads = lead_q.filter(Lead.assigned_to_id == user.id).count()
        converted = lead_q.filter(Lead.assigned_to_id == user.id, Lead.status == "Converted").count()
        points = converted * 500 + (total_leads - converted) * 50
        target = 2000

        if points >= 2000:
            tier = "Titanium"
        elif points >= 1500:
            tier = "Platinum"
        elif points >= 800:
            tier = "Gold"
        else:
            tier = "Silver"

        bonus_amount = points * 5
        trend = "up" if converted > 0 else ("flat" if total_leads > 0 else "down")

        performance.append({
            "id": f"EMP{user.id:03d}",
            "user_id": user.id,
            "name": user.full_name,
            "role": user.role.title(),
            "points": points,
            "tier": tier,
            "target": target,
            "trend": trend,
            "bonus": f"${bonus_amount:,}"
        })

    performance.sort(key=lambda x: x["points"], reverse=True)
    return {"performance": performance, "total": len(performance)}
