from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from datetime import datetime, timedelta

from app.database import get_db
from app.utils.dependencies import get_current_user
from app.models.user import User
from app.models.lead import Lead
from app.models.client import Client
from app.models.invoice import Invoice
from app.models.task import Task
from app.models.team import Team

router = APIRouter()


# ===============================
# MD Dashboard
# ===============================

@router.get("/dashboard")
def get_md_dashboard(
    period: str = Query("30d"),
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Get MD executive dashboard with company-wide KPIs"""
    # Real counts
    total_leads = db.query(Lead).count()
    converted = db.query(Lead).filter(Lead.status == "Converted").count()
    lost = db.query(Lead).filter(Lead.status == "Lost").count()
    active = total_leads - converted - lost
    win_rate = int((converted / (converted + lost) * 100)) if (converted + lost) > 0 else 0
    
    total_clients = db.query(Client).count()
    total_revenue = db.query(func.sum(Invoice.total)).filter(Invoice.status == "Paid").scalar() or 0
    
    # Invoice stats
    paid = db.query(Invoice).filter(Invoice.status == "Paid").count()
    pending = db.query(Invoice).filter(Invoice.status == "Pending").count()
    overdue = db.query(Invoice).filter(Invoice.status == "Overdue").count()
    
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
                {"stage": "New", "count": db.query(Lead).filter(Lead.status == "New").count()},
                {"stage": "Contacted", "count": db.query(Lead).filter(Lead.status == "Contacted").count()},
                {"stage": "Qualified", "count": db.query(Lead).filter(Lead.status == "Qualified").count()},
                {"stage": "Proposal", "count": db.query(Lead).filter(Lead.status == "Proposal").count()},
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
    # current_user: User = Depends(get_current_user)
):
    """Get detailed revenue analytics"""
    total_revenue = db.query(func.sum(Invoice.total)).filter(Invoice.status == "Paid").scalar() or 0
    outstanding = db.query(func.sum(Invoice.total)).filter(Invoice.status == "Pending").scalar() or 0
    
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
    # current_user: User = Depends(get_current_user)
):
    """Get company-wide sales analytics"""
    total = db.query(Lead).count()
    won = db.query(Lead).filter(Lead.status == "Converted").count()
    lost = db.query(Lead).filter(Lead.status == "Lost").count()
    active = total - won - lost
    win_rate = int((won / (won + lost) * 100)) if (won + lost) > 0 else 0
    
    # Team performance
    teams = db.query(Team).all()
    team_performance = []
    for team in teams:
        team_leads = db.query(Lead).filter(Lead.team_id == team.id).count()
        team_won = db.query(Lead).filter(Lead.team_id == team.id, Lead.status == "Converted").count()
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
    # current_user: User = Depends(get_current_user)
):
    """Get all company leads with filters"""
    query = db.query(Lead)
    
    if status:
        query = query.filter(Lead.status == status)
    
    leads = query.order_by(Lead.created_at.desc()).all()
    
    result = []
    for lead in leads:
        team_obj = db.query(Team).filter(Team.id == lead.team_id).first() if lead.team_id else None
        owner = db.query(User).filter(User.id == lead.assigned_to_id).first() if lead.assigned_to_id else None
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
    # current_user: User = Depends(get_current_user)
):
    """Get all company clients"""
    total = db.query(Client).count()
    
    clients = db.query(Client).order_by(Client.created_at.desc()).limit(10).all()
    
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
    # current_user: User = Depends(get_current_user)
):
    """Search and lookup employees"""
    query = db.query(User)
    
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
    for user in users:
        team_obj = db.query(Team).filter(Team.id == user.team_id).first() if user.team_id else None
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
    # current_user: User = Depends(get_current_user)
):
    """Get detailed employee information"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    team = db.query(Team).filter(Team.id == user.team_id).first() if user.team_id else None
    
    # Performance metrics
    leads = db.query(Lead).filter(Lead.assigned_to_id == user_id).count()
    converted = db.query(Lead).filter(Lead.assigned_to_id == user_id, Lead.status == "Converted").count()
    
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
    # current_user: User = Depends(get_current_user)
):
    """Get company-wide monitoring and alerts"""
    # Get team status
    teams = db.query(Team).all()
    team_status = []
    for team in teams:
        team_leads = db.query(Lead).filter(Lead.team_id == team.id).count()
        team_status.append({
            "team": team.name,
            "status": "healthy",
            "leads": team_leads
        })
    
    # Get overdue tasks
    overdue_count = db.query(Task).filter(
        Task.due_date < datetime.now(),
        Task.status != "Completed"
    ).count()
    
    return {
        "alerts": [
            {"id": 1, "type": "tasks", "message": f"{overdue_count} overdue tasks", "severity": "Medium"}
        ] if overdue_count > 0 else [],
        "team_status": team_status
    }
