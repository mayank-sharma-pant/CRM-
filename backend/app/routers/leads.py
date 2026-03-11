from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timedelta

from app.database import get_db
from app.utils.dependencies import get_current_user, apply_company_scope, ensure_company_access
from app.models.user import User
from app.models.lead import Lead
from app.models.task import Task
from app.models.client import Client
from app.models.invoice import Invoice
from app.models.note import Note
from app.utils.audit import log_activity
from sqlalchemy import func as sa_func
from app.schemas.sales import (
    LeadResponse, LeadListResponse, LeadCreate, LeadUpdate,
    SalesDashboardResponse, SalesDashboardMetrics, SalesDashboardTask,
)
from app.schemas.user import MessageResponse

router = APIRouter()


# ===============================
# Dashboard Endpoint
# ===============================

@router.get("/dashboard", response_model=SalesDashboardResponse)
def get_sales_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get sales executive dashboard with metrics and priority tasks"""
    # Get real counts from database (company-scoped)
    lead_query = apply_company_scope(db.query(Lead), Lead, current_user)
    
    # Role-based scoping for leads
    if current_user.role == "sales":
        lead_query = lead_query.filter(Lead.assigned_to_id == current_user.id)
    elif current_user.role == "manager":
        lead_query = lead_query.filter(Lead.team_id == current_user.team_id)
    total_leads = lead_query.count()
    closed_leads = lead_query.filter(Lead.status.in_(["Converted", "Lost"])).count()
    conversion_rate = int((closed_leads / total_leads * 100)) if total_leads > 0 else 0
    
    # Get priority tasks (overdue and due today)
    now = datetime.now()
    today_start = datetime(now.year, now.month, now.day)
    today_end = today_start + timedelta(days=1)
    
    task_query = apply_company_scope(db.query(Task), Task, current_user)
    
    # Role-based filtering for tasks
    if current_user.role == "sales":
        task_query = task_query.filter((Task.assigned_to_id == current_user.id) | (Task.assigned_by_id == current_user.id))
    elif current_user.role == "manager":
        team_members = db.query(User.id).filter(User.team_id == current_user.team_id).all()
        team_member_ids = [m[0] for m in team_members]
        task_query = task_query.filter((Task.assigned_to_id.in_(team_member_ids)) | (Task.assigned_by_id == current_user.id))
    overdue_tasks = task_query.filter(
        Task.due_date < today_start,
        Task.status != "Completed"
    ).limit(3).all()
    
    today_tasks = task_query.filter(
        Task.due_date >= today_start,
        Task.due_date < today_end,
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
    for task in today_tasks:
        priority_tasks.append({
            "id": task.id,
            "title": task.title,
            "dueDate": task.due_date.isoformat() if task.due_date else None,
            "statusReason": "DUE_TODAY"
        })
    
    # Status breakdown for charts
    from sqlalchemy import func as sa_func
    status_counts = lead_query.with_entities(Lead.status, sa_func.count(Lead.id)).group_by(Lead.status).all()
    leads_by_status = [{"status": s, "count": c} for s, c in status_counts]
    
    # Source breakdown for charts
    source_counts = lead_query.with_entities(Lead.source, sa_func.count(Lead.id)).group_by(Lead.source).all()
    leads_by_source = [{"source": s or "Unknown", "count": c} for s, c in source_counts]
    
    active_leads = lead_query.filter(Lead.status.notin_(["Converted", "Lost"])).count()
    two_weeks_ago = datetime.now() - timedelta(days=14)
    stalled_leads = lead_query.filter(Lead.status.in_(["New", "Contacted"]), Lead.created_at < two_weeks_ago).count()
    
    # Revenue calculations (company-scoped)
    inv_query = apply_company_scope(db.query(Invoice), Invoice, current_user)
    if current_user.role == "sales":
        client_ids = db.query(Client.id).filter(Client.assigned_to_id == current_user.id).all()
        client_ids = [c[0] for c in client_ids]
        inv_query = inv_query.filter(Invoice.client_id.in_(client_ids))
    elif current_user.role == "manager":
        team_client_ids = db.query(Client.id).filter(Client.team_id == current_user.team_id).all()
        team_client_ids = [c[0] for c in team_client_ids]
        inv_query = inv_query.filter(Invoice.client_id.in_(team_client_ids))

    total_rev = inv_query.with_entities(sa_func.sum(Invoice.total)).scalar() or 0.0
    paid_rev = inv_query.filter(Invoice.status == "Paid").with_entities(sa_func.sum(Invoice.total)).scalar() or 0.0
    outstanding_rev = total_rev - paid_rev

    # Task metrics
    completed_tasks = task_query.filter(Task.status == "Completed").count()
    in_progress_tasks = task_query.filter(Task.status == "Pending").count()
    overdue_task_count = task_query.filter(Task.due_date < today_start, Task.status != "Completed").count()

    # Activity this week
    one_week_ago = datetime.now() - timedelta(days=7)
    new_leads_this_week = lead_query.filter(Lead.created_at >= one_week_ago).count()
    tasks_done_this_week = task_query.filter(Task.status == "Completed", Task.completed_at >= one_week_ago).count()

    return {
        "metrics": {
            "total_leads": total_leads,
            "closed_leads": closed_leads,
            "lost_leads": lost_leads,
            "active_leads": active_leads,
            "stalled_leads": stalled_leads,
            "conversion_rate": conversion_rate,
            "total_revenue": float(total_rev),
            "paid_revenue": float(paid_rev),
            "outstanding_revenue": float(outstanding_rev)
        },
        "task_metrics": {
            "completed": completed_tasks,
            "in_progress": in_progress_tasks,
            "overdue": overdue_task_count
        },
        "activity": {
            "new_leads_this_week": new_leads_this_week,
            "tasks_done_this_week": tasks_done_this_week
        },
        "priority_tasks": priority_tasks,
        "leadsByStatus": leads_by_status,
        "leadsBySource": leads_by_source
    }


# ===============================
# Leads Endpoints
# ===============================

@router.get("", response_model=LeadListResponse)
def list_leads(
    status: Optional[str] = Query(None, description="Filter by status"),
    search: Optional[str] = Query(None, description="Search by name, email, company"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List leads based on user role."""
    query = apply_company_scope(db.query(Lead), Lead, current_user)
    
    # Apply role-based scoping
    if current_user.role == "sales":
        query = query.filter(Lead.assigned_to_id == current_user.id)
    elif current_user.role == "manager":
        # Managers see leads assigned to their team (or explicitly owned by the manager)
        query = query.filter(Lead.team_id == current_user.team_id)
    if status:
        query = query.filter(Lead.status == status)
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (Lead.name.ilike(search_pattern)) |
            (Lead.email.ilike(search_pattern)) |
            (Lead.company.ilike(search_pattern))
        )
    total = query.count()
    leads = query.order_by(Lead.created_at.desc()).offset(skip).limit(limit).all()
    return {
        "items": [
            {
                "id": lead.id,
                "name": lead.name,
                "email": lead.email,
                "phone": lead.phone,
                "company": lead.company,
                "status": lead.status,
                "source": lead.source,
                "service_type": lead.service_type,
                "created_at": lead.created_at.strftime("%Y-%m-%d") if lead.created_at else None,
                "last_contacted_at": lead.last_contacted_at.isoformat() if lead.last_contacted_at else None,
                "last_response_at": lead.last_response_at.isoformat() if lead.last_response_at else None,
                "next_task": lead.next_follow_up.isoformat() if lead.next_follow_up else None
            }
            for lead in leads
        ],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.get("/{lead_id}")
def get_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get lead details by ID (with role scoping)"""
    lead = apply_company_scope(db.query(Lead), Lead, current_user).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
        
    # Apply role-based scoping
    if current_user.role == "sales" and lead.assigned_to_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have access to this lead")
    if current_user.role == "manager" and lead.team_id != current_user.team_id:
        raise HTTPException(status_code=403, detail="You do not have access to this team's lead")
    ensure_company_access(lead, current_user)
    
    # Fetch tasks linked to this lead
    tasks = db.query(Task).filter(Task.lead_id == lead_id).order_by(Task.created_at.desc()).all()
    tasks_list = [
        {
            "id": t.id,
            "title": t.title,
            "status": t.status,
            "priority": t.priority,
            "due_date": t.due_date.isoformat() if t.due_date else None,
            "completed_at": t.completed_at.isoformat() if t.completed_at else None,
            "updated_at": t.updated_at.isoformat() if t.updated_at else None,
        }
        for t in tasks
    ]
    
    # Fetch notes linked to this lead
    notes = db.query(Note).filter(Note.lead_id == lead_id).order_by(Note.created_at.desc()).all()
    notes_list = [
        {
            "id": n.id,
            "content": n.content,
            "created_by_id": n.created_by_id,
            "created_by_name": n.created_by.full_name if n.created_by else None,
            "created_at": n.created_at.isoformat() if n.created_at else None,
        }
        for n in notes
    ]
    
    # Fetch assignee name
    assignee = db.query(User).filter(User.id == lead.assigned_to_id).first() if lead.assigned_to_id else None
    
    return {
        "id": lead.id,
        "name": lead.name,
        "email": lead.email,
        "phone": lead.phone,
        "company": lead.company,
        "status": lead.status,
        "source": lead.source,
        "service_type": lead.service_type,
        "notes": lead.notes,
        "tasks": tasks_list,
        "notes_list": notes_list,
        "assignee": assignee.full_name if assignee else "Unassigned",
        "created_at": lead.created_at.strftime("%Y-%m-%d") if lead.created_at else None,
        "last_contacted_at": lead.last_contacted_at.isoformat() if lead.last_contacted_at else None,
        "last_response_at": lead.last_response_at.isoformat() if lead.last_response_at else None,
        "next_task": lead.next_follow_up.isoformat() if lead.next_follow_up else None
    }


@router.post("", status_code=status.HTTP_201_CREATED)
def create_lead(
    lead_data: LeadCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new lead"""
    if current_user.company_id is None:
        raise HTTPException(status_code=403, detail="User must be assigned to a company")
        
    # Validation for assigned_to_id
    assigned_to_id = lead_data.assigned_to_id
    if assigned_to_id:
        assignee = apply_company_scope(db.query(User), User, current_user).filter(User.id == assigned_to_id).first()
        if not assignee:
            raise HTTPException(status_code=400, detail="Assigned user not found in your company")
            
    # Auto-assign team_id if current_user is a manager
    team_id = current_user.team_id if current_user.role == "manager" else None
    
    new_lead = Lead(
        company_id=current_user.company_id,
        name=lead_data.name,
        email=lead_data.email,
        phone=lead_data.phone,
        company=lead_data.company,
        source=lead_data.source,
        service_type=lead_data.service_type if hasattr(lead_data, 'service_type') else None,
        status="New",
        assigned_to_id=assigned_to_id,
        team_id=team_id
    )
    
    db.add(new_lead)
    db.commit()
    db.refresh(new_lead)
    
    log_activity(db, user=current_user, action='created', entity_type='lead',
                 entity_id=new_lead.id, entity_name=new_lead.name)
    db.commit()
    
    return {
        "id": new_lead.id,
        "name": new_lead.name,
        "email": new_lead.email,
        "phone": new_lead.phone,
        "company": new_lead.company,
        "status": new_lead.status,
        "source": new_lead.source,
        "created_at": new_lead.created_at.strftime("%Y-%m-%d") if new_lead.created_at else None
    }


@router.put("/{lead_id}")
def update_lead(
    lead_id: int,
    lead_data: LeadUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update lead details"""
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    ensure_company_access(lead, current_user)
    
    # Apply role-based scoping
    if current_user.role == "sales" and lead.assigned_to_id != current_user.id:
        raise HTTPException(status_code=403, detail="You cannot edit a lead you do not own")
    if current_user.role == "manager" and lead.team_id != current_user.team_id:
        raise HTTPException(status_code=403, detail="You cannot edit a lead outside your team")
    
    old_status = lead.status
    # Update fields if provided
    if lead_data.name is not None:
        lead.name = lead_data.name
    if lead_data.email is not None:
        lead.email = lead_data.email
    if lead_data.phone is not None:
        lead.phone = lead_data.phone
    if lead_data.company is not None:
        lead.company = lead_data.company
    if lead_data.status is not None:
        lead.status = lead_data.status
    if lead_data.source is not None:
        lead.source = lead_data.source
    if lead_data.notes is not None:
        lead.notes = lead_data.notes
    
    # Log activity
    if lead_data.status is not None and lead_data.status != old_status:
        log_activity(db, user=current_user, action='status_changed', entity_type='lead',
                     entity_id=lead.id, entity_name=lead.name, before=old_status, after=lead_data.status)
    else:
        log_activity(db, user=current_user, action='updated', entity_type='lead',
                     entity_id=lead.id, entity_name=lead.name)
    
    db.commit()
    db.refresh(lead)
    
    return {
        "id": lead.id,
        "name": lead.name,
        "email": lead.email,
        "status": lead.status,
        "message": "Lead updated successfully"
    }


@router.delete("/{lead_id}", response_model=MessageResponse)
def delete_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a lead"""
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    ensure_company_access(lead, current_user)
    
    db.delete(lead)
    db.commit()
    
    return {"message": f"Lead {lead_id} deleted successfully"}


@router.get("/{lead_id}/notes")
def list_lead_notes(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List notes attached to a lead."""
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    ensure_company_access(lead, current_user)

    notes = db.query(Note).filter(Note.lead_id == lead_id).order_by(Note.created_at.desc()).all()
    return [
        {
            "id": n.id,
            "content": n.content,
            "created_by_id": n.created_by_id,
            "created_by_name": n.created_by.full_name if n.created_by else None,
            "created_at": n.created_at.isoformat() if n.created_at else None,
        }
        for n in notes
    ]


@router.post("/{lead_id}/notes", status_code=status.HTTP_201_CREATED)
def add_lead_note(
    lead_id: int,
    content: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a note for a lead."""
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    ensure_company_access(lead, current_user)

    note = Note(
        company_id=current_user.company_id,
        content=content.strip(),
        lead_id=lead.id,
        created_by_id=current_user.id,
    )
    db.add(note)
    db.commit()
    db.refresh(note)

    return {
        "id": note.id,
        "content": note.content,
        "lead_id": note.lead_id,
        "created_by_id": note.created_by_id,
        "created_at": note.created_at.isoformat() if note.created_at else None,
    }


@router.post("/{lead_id}/convert")
def convert_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Convert a lead to a client"""
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    ensure_company_access(lead, current_user)
    
    # Create client from lead
    new_client = Client(
        company_id=lead.company_id,
        name=lead.name,
        email=lead.email,
        phone=lead.phone,
        company=lead.company,
        converted_from_lead_id=lead.id,
        assigned_to_id=lead.assigned_to_id,
        team_id=lead.team_id
    )
    
    # Update lead status
    lead.status = "Converted"
    lead.converted_at = datetime.now()
    
    db.add(new_client)
    db.flush()  # Get new_client.id before committing
    
    # Migrate all tasks from lead to also point to the new client
    lead_tasks = db.query(Task).filter(Task.lead_id == lead.id).all()
    for task in lead_tasks:
        task.client_id = new_client.id
    
    db.commit()
    db.refresh(new_client)
    
    log_activity(db, user=current_user, action='converted', entity_type='lead',
                 entity_id=lead.id, entity_name=lead.name, after=f'Client #{new_client.id}')
    db.commit()
    
    return {
        "message": f"Lead {lead_id} converted to client successfully",
        "client_id": new_client.id
    }
