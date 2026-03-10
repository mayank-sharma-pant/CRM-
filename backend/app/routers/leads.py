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
from app.models.note import Note
from app.utils.audit import log_activity
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
    total_leads = lead_query.count()
    closed_leads = lead_query.filter(Lead.status.in_(["Converted", "Lost"])).count()
    conversion_rate = int((closed_leads / total_leads * 100)) if total_leads > 0 else 0
    
    # Get priority tasks (overdue and due today)
    now = datetime.now()
    today_start = datetime(now.year, now.month, now.day)
    today_end = today_start + timedelta(days=1)
    
    task_query = apply_company_scope(db.query(Task), Task, current_user)
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
    
    lost_leads = lead_query.filter(Lead.status == "Lost").count()
    
    return {
        "metrics": {
            "total_leads": total_leads,
            "closed_leads": closed_leads,
            "lost_leads": lost_leads,
            "conversion_rate": conversion_rate
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
    """List leads for the current sales user (paginated)."""
    query = apply_company_scope(db.query(Lead), Lead, current_user)
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
    """Get lead details by ID"""
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
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
