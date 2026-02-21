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
from app.schemas.sales import (
    LeadResponse, LeadListResponse, LeadCreate, LeadUpdate,
    SalesDashboardResponse, SalesDashboardMetrics, SalesDashboardTask
)

router = APIRouter()


# ===============================
# Dashboard Endpoint
# ===============================

@router.get("/dashboard")
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
    
    return {
        "metrics": {
            "total_leads": total_leads,
            "closed_leads": closed_leads,
            "conversion_rate": conversion_rate
        },
        "priority_tasks": priority_tasks
    }


# ===============================
# Leads Endpoints
# ===============================

@router.get("/")
def list_leads(
    status: Optional[str] = Query(None, description="Filter by status"),
    search: Optional[str] = Query(None, description="Search by name, email, company"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all leads for the current sales user"""
    query = apply_company_scope(db.query(Lead), Lead, current_user)
    
    # Apply filters
    if status:
        query = query.filter(Lead.status == status)
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (Lead.name.ilike(search_pattern)) |
            (Lead.email.ilike(search_pattern)) |
            (Lead.company.ilike(search_pattern))
        )
    
    leads = query.order_by(Lead.created_at.desc()).all()
    
    return [
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
    ]


@router.get("/{lead_id}")
def get_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get lead details by ID"""
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    ensure_company_access(lead, current_user)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
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
        "created_at": lead.created_at.strftime("%Y-%m-%d") if lead.created_at else None,
        "last_contacted_at": lead.last_contacted_at.isoformat() if lead.last_contacted_at else None,
        "last_response_at": lead.last_response_at.isoformat() if lead.last_response_at else None,
        "next_task": lead.next_follow_up.isoformat() if lead.next_follow_up else None
    }


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_lead(
    lead_data: LeadCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new lead"""
    if current_user.company_id is None:
        raise HTTPException(status_code=403, detail="User must be assigned to a company")
    new_lead = Lead(
        company_id=current_user.company_id,
        name=lead_data.name,
        email=lead_data.email,
        phone=lead_data.phone,
        company=lead_data.company,
        source=lead_data.source,
        service_type=lead_data.service_type if hasattr(lead_data, 'service_type') else None,
        status="New"
    )
    
    db.add(new_lead)
    db.commit()
    db.refresh(new_lead)
    
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
    ensure_company_access(lead, current_user)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
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
    
    db.commit()
    db.refresh(lead)
    
    return {
        "id": lead.id,
        "name": lead.name,
        "email": lead.email,
        "status": lead.status,
        "message": "Lead updated successfully"
    }


@router.delete("/{lead_id}")
def delete_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a lead"""
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    ensure_company_access(lead, current_user)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    db.delete(lead)
    db.commit()
    
    return {"message": f"Lead {lead_id} deleted successfully"}


@router.post("/{lead_id}/convert")
def convert_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Convert a lead to a client"""
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    ensure_company_access(lead, current_user)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
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
    db.commit()
    db.refresh(new_client)
    
    return {
        "message": f"Lead {lead_id} converted to client successfully",
        "client_id": new_client.id
    }
