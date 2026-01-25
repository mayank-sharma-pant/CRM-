from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from datetime import datetime, timedelta

from app.database import get_db
from app.utils.dependencies import get_current_user
from app.models.user import User
from app.models.lead import Lead
from app.models.task import Task
from app.models.client import Client
from app.models.invoice import Invoice

router = APIRouter()


# ===============================
# Manager Dashboard
# ===============================

@router.get("/dashboard")
def get_manager_dashboard(
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Get manager dashboard with team metrics"""
    # Get real counts
    total_leads = db.query(Lead).count()
    closed_leads = db.query(Lead).filter(Lead.status.in_(["Converted", "Lost"])).count()
    conversion_rate = int((closed_leads / total_leads * 100)) if total_leads > 0 else 0
    
    # Get team members (sales users)
    team_members = db.query(User).filter(User.role == "sales").all()
    team_stats = []
    for member in team_members:
        active = db.query(Lead).filter(Lead.assigned_to_id == member.id, Lead.status.notin_(["Converted", "Lost"])).count()
        converted = db.query(Lead).filter(Lead.assigned_to_id == member.id, Lead.status == "Converted").count()
        team_stats.append({
            "id": member.id,
            "name": member.full_name,
            "leads_active": active,
            "leads_converted": converted
        })
    
    # Get priority tasks
    now = datetime.now()
    today_start = datetime(now.year, now.month, now.day)
    
    overdue_tasks = db.query(Task).filter(
        Task.due_date < today_start,
        Task.status != "Completed"
    ).limit(3).all()
    
    priority_tasks = []
    for task in overdue_tasks:
        priority_tasks.append({
            "id": task.id,
            "title": task.title,
            "dueDate": task.due_date.isoformat() if task.due_date else None,
            "statusReason": "OVERDUE"
        })
    
    return {
        "metrics": {
            "total_team_leads": total_leads,
            "closed_deals": closed_leads,
            "team_conversion_rate": conversion_rate
        },
        "team_members": team_stats,
        "priority_tasks": priority_tasks
    }


# ===============================
# Team Monitoring
# ===============================

@router.get("/monitoring")
def get_team_monitoring(
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Get team activity monitoring data"""
    team_members = db.query(User).filter(User.role == "sales").all()
    
    members_data = []
    online_count = 0
    
    for member in team_members:
        # Check if active in last 5 minutes
        is_online = member.last_active_at and (datetime.now() - member.last_active_at).seconds < 300 if member.last_active_at else False
        
        pending = db.query(Task).filter(Task.assigned_to_id == member.id, Task.status == "Pending").count()
        overdue = db.query(Task).filter(
            Task.assigned_to_id == member.id,
            Task.due_date < datetime.now(),
            Task.status != "Completed"
        ).count()
        
        if is_online:
            online_count += 1
            status = "online"
            last_active = "Just now"
        elif member.last_active_at:
            status = "away" if (datetime.now() - member.last_active_at).seconds < 3600 else "offline"
            last_active = member.last_active_at.strftime("%I:%M %p")
        else:
            status = "offline"
            last_active = "Never"
        
        members_data.append({
            "id": member.id,
            "name": member.full_name,
            "role": "Sales Executive",
            "status": status,
            "last_active": last_active,
            "pending_tasks": pending,
            "overdue_tasks": overdue
        })
    
    return {
        "team_members": members_data,
        "team_summary": {
            "total_members": len(team_members),
            "online": online_count,
            "offline": len(team_members) - online_count
        }
    }


@router.get("/monitoring/{user_id}")
def get_team_member_detail(
    user_id: int,
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Get detailed activity for a team member"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get lead counts
    leads_contacted = db.query(Lead).filter(Lead.assigned_to_id == user_id, Lead.status == "Contacted").count()
    leads_converted = db.query(Lead).filter(Lead.assigned_to_id == user_id, Lead.status == "Converted").count()
    
    # Get active leads
    active_leads = db.query(Lead).filter(
        Lead.assigned_to_id == user_id,
        Lead.status.notin_(["Converted", "Lost"])
    ).limit(5).all()
    
    return {
        "user": {
            "id": user.id,
            "name": user.full_name,
            "email": user.email,
            "role": user.role,
            "status": "active" if user.status == "active" else "inactive"
        },
        "current_week": {
            "leads_contacted": leads_contacted,
            "leads_converted": leads_converted
        },
        "active_leads": [
            {"id": l.id, "name": l.name, "company": l.company, "status": l.status}
            for l in active_leads
        ]
    }


# ===============================
# Team Leads
# ===============================

@router.get("/leads")
def get_team_leads(
    status: Optional[str] = Query(None),
    member_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Get all leads for the manager's team"""
    query = db.query(Lead)
    
    if status:
        query = query.filter(Lead.status == status)
    if member_id:
        query = query.filter(Lead.assigned_to_id == member_id)
    
    leads = query.order_by(Lead.created_at.desc()).all()
    
    result = []
    for lead in leads:
        assignee = db.query(User).filter(User.id == lead.assigned_to_id).first() if lead.assigned_to_id else None
        result.append({
            "id": lead.id,
            "name": lead.name,
            "company": lead.company,
            "status": lead.status,
            "assigned_to": assignee.full_name if assignee else "Unassigned",
            "assigned_to_id": lead.assigned_to_id,
            "created_at": lead.created_at.strftime("%Y-%m-%d") if lead.created_at else None
        })
    
    return {"leads": result, "total": len(result)}


@router.post("/leads/{lead_id}/reassign")
def reassign_lead(
    lead_id: int,
    new_assignee_id: int = Query(...),
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Reassign a lead to a different team member"""
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    new_assignee = db.query(User).filter(User.id == new_assignee_id).first()
    if not new_assignee:
        raise HTTPException(status_code=404, detail="Assignee not found")
    
    lead.assigned_to_id = new_assignee_id
    db.commit()
    
    return {
        "message": f"Lead {lead_id} reassigned to {new_assignee.full_name}",
        "lead_id": lead_id,
        "new_assignee_id": new_assignee_id
    }


# ===============================
# Team Tasks
# ===============================

@router.get("/tasks")
def get_team_tasks(
    status: Optional[str] = Query(None),
    member_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Get all tasks for the team"""
    query = db.query(Task)
    
    if status:
        query = query.filter(Task.status == status)
    if member_id:
        query = query.filter(Task.assigned_to_id == member_id)
    
    tasks = query.order_by(Task.due_date.asc()).all()
    
    result = []
    for task in tasks:
        assignee = db.query(User).filter(User.id == task.assigned_to_id).first() if task.assigned_to_id else None
        result.append({
            "id": task.id,
            "title": task.title,
            "dueDate": task.due_date.strftime("%Y-%m-%d") if task.due_date else None,
            "status": task.status,
            "assigned_to": assignee.full_name if assignee else "Unassigned",
            "assigned_to_id": task.assigned_to_id,
            "priority": task.priority
        })
    
    return {"tasks": result, "total": len(result)}


@router.post("/tasks")
def create_team_task(
    title: str = Query(...),
    assignee_id: int = Query(...),
    due_date: str = Query(...),
    priority: str = Query("medium"),
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Create and assign a task to a team member"""
    assignee = db.query(User).filter(User.id == assignee_id).first()
    if not assignee:
        raise HTTPException(status_code=404, detail="Assignee not found")
    
    new_task = Task(
        title=title,
        assigned_to_id=assignee_id,
        due_date=datetime.strptime(due_date, "%Y-%m-%d"),
        priority=priority,
        status="Pending",
        is_manager_assigned=True
    )
    
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    
    return {
        "message": "Task created and assigned",
        "task": {
            "id": new_task.id,
            "title": new_task.title,
            "assigned_to": assignee.full_name,
            "due_date": due_date
        }
    }


# ===============================
# Performance Reports
# ===============================

@router.get("/reports/performance")
def get_team_performance(
    period: str = Query("month"),
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Get team performance report"""
    leads_total = db.query(Lead).count()
    leads_converted = db.query(Lead).filter(Lead.status == "Converted").count()
    conversion_rate = round((leads_converted / leads_total * 100), 1) if leads_total > 0 else 0
    
    # Get revenue from paid invoices
    revenue = db.query(func.sum(Invoice.total)).filter(Invoice.status == "Paid").scalar() or 0
    
    # Member breakdown
    team_members = db.query(User).filter(User.role == "sales").all()
    member_breakdown = []
    for member in team_members:
        m_leads = db.query(Lead).filter(Lead.assigned_to_id == member.id).count()
        m_converted = db.query(Lead).filter(Lead.assigned_to_id == member.id, Lead.status == "Converted").count()
        member_breakdown.append({
            "id": member.id,
            "name": member.full_name,
            "leads": m_leads,
            "converted": m_converted
        })
    
    return {
        "period": period,
        "team_totals": {
            "leads_created": leads_total,
            "leads_converted": leads_converted,
            "conversion_rate": conversion_rate,
            "revenue": revenue
        },
        "member_breakdown": member_breakdown
    }


# ===============================
# Invoices
# ===============================

@router.get("/invoices")
def get_team_invoices(
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Get all invoices created by team members"""
    query = db.query(Invoice)
    
    if status:
        query = query.filter(Invoice.status == status)
    
    invoices = query.order_by(Invoice.created_at.desc()).all()
    
    result = []
    for inv in invoices:
        client = db.query(Client).filter(Client.id == inv.client_id).first()
        creator = db.query(User).filter(User.id == inv.created_by_id).first() if inv.created_by_id else None
        result.append({
            "id": inv.id,
            "number": inv.invoice_number,
            "client": client.name if client else "Unknown",
            "amount": inv.total,
            "status": inv.status,
            "created_by": creator.full_name if creator else "Unknown",
            "date": inv.issued_date.strftime("%Y-%m-%d") if inv.issued_date else None
        })
    
    return {"invoices": result, "total": len(result)}


@router.post("/invoices/{invoice_id}/approve")
def approve_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Approve an invoice"""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    invoice.status = "Pending"  # Approved and sent to client
    db.commit()
    
    return {
        "message": f"Invoice {invoice_id} approved",
        "new_status": "Pending"
    }
