from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from datetime import datetime, timedelta, timezone

from app.database import get_db
from app.utils.dependencies import get_current_user, apply_company_scope, ensure_company_access, is_platform_admin
from app.models.user import User
from app.models.lead import Lead
from app.models.task import Task
from app.models.client import Client
from app.models.invoice import Invoice
from app.schemas.user import MessageResponse
from app.schemas.transfer import TransferRequestCreate, TransferRequestResponse
from app.models.transfer_request import TeamTransferRequest

router = APIRouter()

MANAGER_ROLES = {"manager", "md", "admin"}


def require_manager(current_user: User = Depends(get_current_user)) -> User:
    if is_platform_admin(current_user):
        return current_user
    if current_user.role not in MANAGER_ROLES:
        raise HTTPException(status_code=403, detail="Manager access required")
    return current_user


# ===============================
# Manager Dashboard
# ===============================

@router.get("/dashboard")
def get_manager_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager)
):
    """Get manager dashboard with team metrics"""
    # Get real counts (company-scoped and team-scoped)
    lead_query = apply_company_scope(db.query(Lead), Lead, current_user).filter(Lead.team_id == current_user.team_id)
    total_leads = lead_query.count()
    closed_leads = lead_query.filter(Lead.status == "Converted").count()
    conversion_rate = int((closed_leads / total_leads * 100)) if total_leads > 0 else 0
    
    # Get team members (sales users, team-scoped)
    user_query = apply_company_scope(db.query(User), User, current_user).filter(User.team_id == current_user.team_id)
    team_members = user_query.filter(User.role == "sales").all()
    team_member_ids = [m.id for m in team_members]
    
    from sqlalchemy import case
    
    lead_stats = apply_company_scope(db.query(
        Lead.assigned_to_id,
        func.sum(case((Lead.status == "Converted", 1), else_=0)).label("converted_count"),
        func.sum(case((Lead.status.notin_(["Converted", "Lost"]), 1), else_=0)).label("active_count")
    ), Lead, current_user).filter(Lead.team_id == current_user.team_id).group_by(Lead.assigned_to_id).all()
    
    stats_map = {row.assigned_to_id: {"active": row.active_count or 0, "converted": row.converted_count or 0} for row in lead_stats}
    
    team_stats = []
    for member in team_members:
        member_stat = stats_map.get(member.id, {"active": 0, "converted": 0})
        team_stats.append({
            "id": member.id,
            "name": member.full_name,
            "leads_active": member_stat["active"],
            "leads_converted": member_stat["converted"]
        })
    
    # Get priority tasks
    now = datetime.now(timezone.utc)
    today_start = datetime(now.year, now.month, now.day)
    
    task_query = apply_company_scope(db.query(Task), Task, current_user)
    if team_member_ids:
        task_query = task_query.filter((Task.assigned_to_id.in_(team_member_ids)) | (Task.assigned_by_id == current_user.id))
    else:
        task_query = task_query.filter(Task.assigned_by_id == current_user.id)
    overdue_tasks = task_query.filter(
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
    current_user: User = Depends(require_manager)
):
    """Get team activity monitoring data"""
    team_members = apply_company_scope(db.query(User), User, current_user).filter(User.role == "sales", User.team_id == current_user.team_id).all()
    
    team_member_ids = [m.id for m in team_members]
    from sqlalchemy import case
    task_stats = apply_company_scope(db.query(
        Task.assigned_to_id,
        func.sum(case((Task.status == "Pending", 1), else_=0)).label("pending_count"),
        func.sum(case(((Task.due_date < datetime.now()) & (Task.status != "Completed"), 1), else_=0)).label("overdue_count")
    ), Task, current_user).filter(Task.assigned_to_id.in_(team_member_ids)).group_by(Task.assigned_to_id).all()
    
    task_map = {row.assigned_to_id: {"pending": row.pending_count or 0, "overdue": row.overdue_count or 0} for row in task_stats}
    
    members_data = []
    online_count = 0
    
    for member in team_members:
        # Check if active in last 5 minutes
        now = datetime.now(timezone.utc)
        if member.last_active_at:
            # Ensure last_active_at has tzinfo before subtraction, or make it naive
            member_last_active = member.last_active_at if member.last_active_at.tzinfo else member.last_active_at.replace(tzinfo=timezone.utc)
            is_online = (now - member_last_active).total_seconds() < 300
        else:
            is_online = False
            member_last_active = None
        
        member_tasks = task_map.get(member.id, {"pending": 0, "overdue": 0})
        pending = member_tasks["pending"]
        overdue = member_tasks["overdue"]
        
        if is_online:
            online_count += 1
            status = "online"
            last_active = "Just now"
        elif member_last_active:
            status = "away" if (now - member_last_active).total_seconds() < 3600 else "offline"
            last_active = member_last_active.strftime("%I:%M %p")
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
    current_user: User = Depends(require_manager)
):
    """Get detailed activity for a team member"""
    user = apply_company_scope(db.query(User), User, current_user).filter(User.id == user_id, User.team_id == current_user.team_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found or not in your team")
    
    # Get lead counts (company-scoped)
    lead_q = apply_company_scope(db.query(Lead), Lead, current_user)
    leads_contacted = lead_q.filter(Lead.assigned_to_id == user_id, Lead.status == "Contacted").count()
    leads_converted = lead_q.filter(Lead.assigned_to_id == user_id, Lead.status == "Converted").count()
    
    # Get active leads
    active_leads = lead_q.filter(
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
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager)
):
    """Get leads for the manager's team (paginated)."""
    query = apply_company_scope(db.query(Lead), Lead, current_user).filter(Lead.team_id == current_user.team_id)
    if status:
        query = query.filter(Lead.status == status)
    if member_id:
        query = query.filter(Lead.assigned_to_id == member_id)
    total = query.count()
    leads = query.order_by(Lead.created_at.desc()).offset(skip).limit(limit).all()
    assignee_ids = {lead.assigned_to_id for lead in leads if lead.assigned_to_id}
    assignees = {u.id: u for u in apply_company_scope(db.query(User), User, current_user).filter(User.id.in_(assignee_ids)).all()} if assignee_ids else {}
    
    result = []
    for lead in leads:
        assignee = assignees.get(lead.assigned_to_id)
        result.append({
            "id": lead.id,
            "name": lead.name,
            "company": lead.company,
            "status": lead.status,
            "assigned_to": assignee.full_name if assignee else "Unassigned",
            "assigned_to_id": lead.assigned_to_id,
            "created_at": lead.created_at.strftime("%Y-%m-%d") if lead.created_at else None
        })
    return {"leads": result, "total": total, "skip": skip, "limit": limit}


@router.post("/leads/{lead_id}/reassign")
def reassign_lead(
    lead_id: int,
    new_assignee_id: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager)
):
    """Reassign a lead to a different team member"""
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    ensure_company_access(lead, current_user)
    
    if lead.team_id != current_user.team_id:
        raise HTTPException(status_code=403, detail="Lead does not belong to your team")
    
    new_assignee = apply_company_scope(db.query(User), User, current_user).filter(User.id == new_assignee_id, User.team_id == current_user.team_id).first()
    if not new_assignee:
        raise HTTPException(status_code=404, detail="Assignee not found or not in your team")
    
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
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager)
):
    """Get tasks for the team (paginated)."""
    query = apply_company_scope(db.query(Task), Task, current_user)
    # Default team scoping for managers
    team_member_ids = [m.id for m in apply_company_scope(db.query(User.id), User, current_user).filter(User.team_id == current_user.team_id).all()]
    query = query.filter((Task.assigned_to_id.in_(team_member_ids)) | (Task.assigned_by_id == current_user.id))
    if status:
        query = query.filter(Task.status == status)
    if member_id:
        query = query.filter(Task.assigned_to_id == member_id)
    total = query.count()
    tasks = query.order_by(Task.due_date.asc()).offset(skip).limit(limit).all()
    result = []
    user_query = apply_company_scope(db.query(User), User, current_user)
    for task in tasks:
        assignee = user_query.filter(User.id == task.assigned_to_id).first() if task.assigned_to_id else None
        result.append({
            "id": task.id,
            "title": task.title,
            "dueDate": task.due_date.strftime("%Y-%m-%d") if task.due_date else None,
            "status": task.status,
            "assigned_to": assignee.full_name if assignee else "Unassigned",
            "assigned_to_id": task.assigned_to_id,
            "priority": task.priority
        })
    return {"tasks": result, "total": total, "skip": skip, "limit": limit}


@router.post("/tasks")
def create_team_task(
    title: str = Query(...),
    assignee_id: int = Query(...),
    due_date: str = Query(...),
    priority: str = Query("medium"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager)
):
    """Create and assign a task to a team member"""
    assignee = apply_company_scope(db.query(User), User, current_user).filter(User.id == assignee_id).first()
    if not assignee:
        raise HTTPException(status_code=404, detail="Assignee not found")
    
    new_task = Task(
        company_id=current_user.company_id,
        title=title,
        assigned_to_id=assignee_id,
        assigned_by_id=current_user.id,
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
    current_user: User = Depends(require_manager)
):
    """Get team performance report"""
    lead_q = apply_company_scope(db.query(Lead), Lead, current_user)
    leads_total = lead_q.count()
    leads_converted = lead_q.filter(Lead.status == "Converted").count()
    conversion_rate = round((leads_converted / leads_total * 100), 1) if leads_total > 0 else 0
    
    # Get revenue from paid invoices (company + team scoped)
    inv_q = apply_company_scope(db.query(Invoice), Invoice, current_user)
    revenue = inv_q.filter(Invoice.status == "Paid").with_entities(func.sum(Invoice.total)).scalar() or 0
    
    # Member breakdown (team-scoped)
    team_member_ids = [m.id for m in team_members]
    from sqlalchemy import case
    lead_perf = apply_company_scope(db.query(
        Lead.assigned_to_id,
        func.count(Lead.id).label("total"),
        func.sum(case((Lead.status == "Converted", 1), else_=0)).label("converted")
    ), Lead, current_user).filter(Lead.team_id == current_user.team_id, Lead.assigned_to_id.in_(team_member_ids)).group_by(Lead.assigned_to_id).all()
    
    perf_map = {row.assigned_to_id: {"total": row.total, "converted": row.converted or 0} for row in lead_perf}
    
    member_breakdown = []
    for member in team_members:
        stats = perf_map.get(member.id, {"total": 0, "converted": 0})
        member_breakdown.append({
            "id": member.id,
            "name": member.full_name,
            "leads": stats["total"],
            "converted": stats["converted"]
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
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager)
):
    """Get invoices created by team members (paginated)."""
    # Restrict invoices to those created by the manager's team members
    team_members = apply_company_scope(db.query(User.id), User, current_user).filter(User.team_id == current_user.team_id).all()
    team_member_ids = [m.id for m in team_members]
    
    query = apply_company_scope(db.query(Invoice), Invoice, current_user).filter(Invoice.created_by_id.in_(team_member_ids))
    if status:
        query = query.filter(Invoice.status == status)
    total = query.count()
    invoices = query.order_by(Invoice.created_at.desc()).offset(skip).limit(limit).all()
    result = []
    client_q = apply_company_scope(db.query(Client), Client, current_user)
    user_q = apply_company_scope(db.query(User), User, current_user)
    
    client_ids = {inv.client_id for inv in invoices if inv.client_id}
    clients = client_q.filter(Client.id.in_(client_ids)).all() if client_ids else []
    client_map = {c.id: c for c in clients}
    
    creator_ids = {inv.created_by_id for inv in invoices if getattr(inv, "created_by_id", None)}
    creators = user_q.filter(User.id.in_(creator_ids)).all() if creator_ids else []
    creator_map = {c.id: c for c in creators}
    
    for inv in invoices:
        client = client_map.get(inv.client_id)
        creator = creator_map.get(inv.created_by_id)
        
        result.append({
            "id": inv.id,
            "invoice_number": inv.invoice_number,
            "client": client.name if client else "Unknown",
            "client_id": inv.client_id,
            "sales_rep_id": inv.created_by_id,
            "sales_rep_name": creator.full_name if creator else "System",
            "subtotal": float(inv.subtotal or 0),
            "tax": float(inv.tax or 0),
            "discount": float(inv.discount or 0),
            "total": float(inv.total or 0),
            "status": inv.status,
            "issued_date": inv.issued_date.isoformat() if inv.issued_date else None,
            "due_date": inv.due_date.isoformat() if inv.due_date else None,
            "created_at": inv.created_at.isoformat() if getattr(inv, "created_at", None) else None,
        })
        
    return {"items": result, "total": total, "skip": skip, "limit": limit}


@router.post("/invoices/{invoice_id}/approve", response_model=MessageResponse)
def approve_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager)
):
    """Approve an invoice"""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    ensure_company_access(invoice, current_user)
    
    invoice.status = "Pending"  # Approved and sent to client
    db.commit()
    
    return {"message": f"Invoice {invoice_id} approved"}

# ===============================
# Team Management
# ===============================

@router.get("/team")
def get_manager_team(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager)
):
    """List all team members assigned to this manager's team"""
    team_members = apply_company_scope(db.query(User), User, current_user).filter(
        User.team_id == current_user.team_id,
        User.role == "sales"
    ).all()
    
    team_member_ids = [m.id for m in team_members]
    
    lead_counts = db.query(Lead.assigned_to_id, func.count(Lead.id)).filter(Lead.assigned_to_id.in_(team_member_ids)).group_by(Lead.assigned_to_id).all()
    lead_map = {row[0]: row[1] for row in lead_counts}
    
    order_counts = db.query(Invoice.created_by_id, func.count(Invoice.id)).filter(Invoice.created_by_id.in_(team_member_ids)).group_by(Invoice.created_by_id).all()
    order_map = {row[0]: row[1] for row in order_counts}
    
    result = []
    for member in team_members:
        result.append({
            "id": member.id,
            "full_name": member.full_name,
            "email": member.email,
            "role": member.role,
            "status": member.status,
            "lead_count": lead_map.get(member.id, 0),
            "order_count": order_map.get(member.id, 0),
            "last_active": member.last_active_at.isoformat() if member.last_active_at else None
        })
        
    return {"team": result}

@router.get("/team/{user_id}/performance")
def get_team_member_performance(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager)
):
    """Detailed performance metrics for a specific team member"""
    member = apply_company_scope(db.query(User), User, current_user).filter(
        User.id == user_id,
        User.team_id == current_user.team_id
    ).first()
    
    if not member:
        raise HTTPException(status_code=404, detail="Team member not found")
        
    # Lead metrics
    lead_q = apply_company_scope(db.query(Lead), Lead, current_user).filter(Lead.assigned_to_id == user_id)
    total_leads = lead_q.count()
    converted_leads = lead_q.filter(Lead.status == "Converted").count()
    lost_leads = lead_q.filter(Lead.status == "Lost").count()
    
    # Order metrics
    inv_q = apply_company_scope(db.query(Invoice), Invoice, current_user).filter(Invoice.created_by_id == user_id)
    total_orders = inv_q.count()
    revenue_sourced = inv_q.filter(Invoice.status != "Cancelled").with_entities(func.sum(Invoice.total)).scalar() or 0.0
    paid_revenue = inv_q.filter(Invoice.status == "Paid").with_entities(func.sum(Invoice.total)).scalar() or 0.0
    
    # Task metrics
    task_q = apply_company_scope(db.query(Task), Task, current_user).filter(Task.assigned_to_id == user_id)
    tasks_completed = task_q.filter(Task.status == "Completed").count()
    tasks_pending = task_q.filter(Task.status == "Pending").count()
    
    return {
        "member": {
            "id": member.id,
            "full_name": member.full_name,
            "email": member.email,
            "role": member.role,
            "created_at": member.created_at.isoformat() if member.created_at else None
        },
        "metrics": {
            "leads": {
                "total": total_leads,
                "converted": converted_leads,
                "lost": lost_leads,
                "conversion_rate": round((converted_leads / total_leads * 100), 1) if total_leads > 0 else 0
            },
            "orders": {
                "total_count": total_orders,
                "total_value": float(revenue_sourced),
                "paid_value": float(paid_revenue)
            },
            "tasks": {
                "completed": tasks_completed,
                "pending": tasks_pending
            }
        }
    }

@router.post("/transfer-request", response_model=TransferRequestResponse)
def create_transfer_request(
    request_data: TransferRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager)
):
    """Request a team transfer for a sales executive in the manager's team"""
    # Verify the target user exists and is in the manager's team
    target_user = db.query(User).filter(User.id == request_data.user_id, User.company_id == current_user.company_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Target user not found")
    
    # Manager can only request for their own team members (sales)
    if target_user.team_id != current_user.team_id:
        raise HTTPException(status_code=403, detail="User is not in your team")
    
    if target_user.role != "sales":
        raise HTTPException(status_code=403, detail="Can only request transfers for sales executives")
    
    # Check if target team exists in the same company
    from app.models.team import Team
    target_team = db.query(Team).filter(Team.id == request_data.target_team_id, Team.company_id == current_user.company_id).first()
    if not target_team:
        raise HTTPException(status_code=404, detail="Target team not found")
    
    # Create the request
    new_request = TeamTransferRequest(
        company_id=current_user.company_id,
        user_id=target_user.id,
        requested_by_id=current_user.id,
        current_team_id=target_user.team_id,
        target_team_id=request_data.target_team_id,
        reason=request_data.reason,
        status="pending"
    )
    
    db.add(new_request)
    db.commit()
    db.refresh(new_request)
    
    return new_request
