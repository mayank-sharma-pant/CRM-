from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timedelta

from app.database import get_db
from app.utils.dependencies import get_current_user
from app.models.user import User
from app.schemas.sales import (
    LeadResponse, LeadListResponse, LeadCreate, LeadUpdate,
    TaskResponse, TaskListResponse, TaskCreate, TaskUpdate,
    SalesDashboardResponse, SalesDashboardMetrics, SalesDashboardTask
)

router = APIRouter()


# ===============================
# Dashboard Endpoint
# ===============================

@router.get("/dashboard", response_model=SalesDashboardResponse)
def get_sales_dashboard(
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)  # Uncomment when auth is ready
):
    """Get sales executive dashboard with metrics and priority tasks"""
    # Mock data for dashboard
    metrics = SalesDashboardMetrics(
        total_leads=127,
        closed_leads=42,
        conversion_rate=33
    )
    
    priority_tasks = [
        SalesDashboardTask(id=101, title="Finalize contract with Acme Corp", 
                          dueDate=datetime.now().isoformat(), statusReason="DUE_TODAY"),
        SalesDashboardTask(id=102, title="Follow up on missing requirements", 
                          dueDate=(datetime.now() - timedelta(days=1)).isoformat(), statusReason="OVERDUE"),
        SalesDashboardTask(id=103, title="Schedule demo for Q3 prospects", 
                          dueDate=datetime.now().isoformat(), statusReason="DUE_TODAY"),
        SalesDashboardTask(id=104, title="Send invoice to TechStart Inc", 
                          dueDate=(datetime.now() - timedelta(days=2)).isoformat(), statusReason="OVERDUE"),
        SalesDashboardTask(id=105, title="Update internal CRM records", 
                          dueDate=datetime.now().isoformat(), statusReason="DUE_TODAY")
    ]
    
    return SalesDashboardResponse(metrics=metrics, priority_tasks=priority_tasks)


# ===============================
# Leads Endpoints
# ===============================

@router.get("/", response_model=List[LeadResponse])
def list_leads(
    status: Optional[str] = Query(None, description="Filter by status"),
    search: Optional[str] = Query(None, description="Search by name, email, company"),
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """List all leads for the current sales user"""
    # Mock leads data
    leads = [
        LeadResponse(id=1, name="John Smith", email="john@acmecorp.com", phone="+1 555-0101",
                    company="Acme Corp", status="New", source="Website",
                    created_at="2024-01-15", next_task="2024-01-20"),
        LeadResponse(id=2, name="Sarah Johnson", email="sarah@techstart.io", phone="+1 555-0102",
                    company="TechStart Inc", status="Contacted", source="Referral",
                    created_at="2024-01-14", last_contacted_at="2024-01-16"),
        LeadResponse(id=3, name="Mike Williams", email="mike@designco.com", phone="+1 555-0103",
                    company="Design Co", status="Qualified", source="LinkedIn",
                    created_at="2024-01-10", last_response_at="2024-01-17"),
        LeadResponse(id=4, name="Emily Brown", email="emily@startup.io", phone="+1 555-0104",
                    company="Startup IO", status="New", source="Cold Call",
                    created_at="2024-01-18"),
        LeadResponse(id=5, name="David Lee", email="david@enterprise.com", phone="+1 555-0105",
                    company="Enterprise Solutions", status="Contacted", source="Trade Show",
                    created_at="2024-01-12", last_contacted_at="2024-01-15"),
        LeadResponse(id=6, name="Lisa Chen", email="lisa@globaltech.com", phone="+1 555-0106",
                    company="Global Tech", status="Converted", source="Website",
                    created_at="2024-01-05", last_contacted_at="2024-01-10"),
        LeadResponse(id=7, name="Robert Taylor", email="robert@oldclient.com", phone="+1 555-0107",
                    company="Old Client Corp", status="Lost", source="Referral",
                    created_at="2024-01-02", last_contacted_at="2024-01-08"),
    ]
    
    # Apply filters
    if status:
        leads = [l for l in leads if l.status == status]
    if search:
        search_lower = search.lower()
        leads = [l for l in leads if 
                search_lower in l.name.lower() or 
                (l.email and search_lower in l.email.lower()) or
                (l.company and search_lower in l.company.lower())]
    
    return leads


@router.get("/{lead_id}", response_model=LeadResponse)
def get_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Get lead details by ID"""
    leads = {
        1: LeadResponse(id=1, name="John Smith", email="john@acmecorp.com", phone="+1 555-0101",
                       company="Acme Corp", status="New", source="Website", service_type="Consulting",
                       notes="Initial contact via website form. Interested in consulting services.",
                       created_at="2024-01-15", next_task="2024-01-20"),
        2: LeadResponse(id=2, name="Sarah Johnson", email="sarah@techstart.io", phone="+1 555-0102",
                       company="TechStart Inc", status="Contacted", source="Referral",
                       created_at="2024-01-14", last_contacted_at="2024-01-16"),
    }
    
    if lead_id not in leads:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    return leads[lead_id]


@router.post("/", response_model=LeadResponse, status_code=status.HTTP_201_CREATED)
def create_lead(
    lead_data: LeadCreate,
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Create a new lead"""
    return LeadResponse(
        id=100,
        name=lead_data.name,
        email=lead_data.email,
        phone=lead_data.phone,
        company=lead_data.company,
        source=lead_data.source,
        status="New",
        created_at=datetime.now().strftime("%Y-%m-%d")
    )


@router.put("/{lead_id}", response_model=LeadResponse)
def update_lead(
    lead_id: int,
    lead_data: LeadUpdate,
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Update lead details"""
    return LeadResponse(
        id=lead_id,
        name=lead_data.name or "Updated Lead",
        email=lead_data.email,
        status=lead_data.status or "New",
        created_at="2024-01-15"
    )


@router.delete("/{lead_id}")
def delete_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Delete a lead"""
    return {"message": f"Lead {lead_id} deleted successfully"}


@router.post("/{lead_id}/convert")
def convert_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Convert a lead to a client"""
    return {
        "message": f"Lead {lead_id} converted to client successfully",
        "client_id": 50
    }
