from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date, timedelta, timezone

from app.database import get_db
from app.utils.dependencies import get_current_user, apply_company_scope, ensure_company_access, get_active_team_id
from app.models.core.user import User
from app.models.core.team_membership import TeamMembership
from app.models.sales.follow_up import FollowUp
from app.models.sales.lead import Lead
from app.schemas.sales import FollowUpCreate, FollowUpListResponse
from app.schemas.admin import MessageResponse

router = APIRouter()


class FollowUpUpdateBody(BaseModel):
    scheduled_date: Optional[str] = None
    scheduled_time: Optional[str] = None
    notes: Optional[str] = None


class FollowUpCompleteBody(BaseModel):
    outcome: str


class FollowUpRescheduleBody(BaseModel):
    new_date: str
    new_time: Optional[str] = None
    reason: Optional[str] = None


# ===============================
# Follow-ups Endpoints
# ===============================

@router.get("", response_model=FollowUpListResponse)
def list_follow_ups(
    status: Optional[str] = Query(None, description="Pending, Completed, Cancelled"),
    lead_id: Optional[int] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    active_team_id: Optional[int] = Depends(get_active_team_id),
):
    """List follow-ups for the current user (paginated)."""
    query = apply_company_scope(db.query(FollowUp), FollowUp, current_user)
    # Role-based scoping: sales users only see follow-ups on their own leads
    if current_user.role == "sales":
        own_lead_ids = [l.id for l in apply_company_scope(db.query(Lead.id), Lead, current_user).filter(Lead.assigned_to_id == current_user.id).all()]
        query = query.filter(FollowUp.lead_id.in_(own_lead_ids)) if own_lead_ids else query.filter(False)
    elif current_user.role == "manager":
        if active_team_id is None:
            team_lead_ids = []
        else:
            team_lead_ids = [
                l.id
                for l in apply_company_scope(db.query(Lead.id), Lead, current_user)
                .filter(Lead.team_id == active_team_id)
                .all()
            ]
        query = query.filter(FollowUp.lead_id.in_(team_lead_ids)) if team_lead_ids else query.filter(False)
    if status:
        query = query.filter(FollowUp.status == status)
    if lead_id:
        query = query.filter(FollowUp.lead_id == lead_id)
    total = query.count()
    follow_ups = query.order_by(FollowUp.scheduled_date.asc()).offset(skip).limit(limit).all()
    lead_ids = {fu.lead_id for fu in follow_ups if fu.lead_id}
    leads = {l.id: l for l in apply_company_scope(db.query(Lead), Lead, current_user).filter(Lead.id.in_(lead_ids)).all()} if lead_ids else {}
    
    result = []
    for fu in follow_ups:
        lead = leads.get(fu.lead_id)
        lead_name = f"{lead.name} - {lead.company}" if lead else "Unknown Lead"
        result.append({
            "id": fu.id,
            "lead_id": fu.lead_id,
            "lead_name": lead_name,
            "scheduled_date": fu.scheduled_date.strftime("%Y-%m-%d") if fu.scheduled_date else None,
            "scheduled_time": fu.scheduled_time.strftime("%I:%M %p") if fu.scheduled_time else None,
            "status": fu.status,
            "notes": fu.notes
        })
    return {"items": result, "total": total, "skip": skip, "limit": limit}


@router.get("/today")
def get_todays_follow_ups(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    active_team_id: Optional[int] = Depends(get_active_team_id),
):
    """Get follow-ups scheduled for today"""
    today = date.today()
    fu_query = apply_company_scope(db.query(FollowUp), FollowUp, current_user)
    # Role-based scoping
    if current_user.role == "sales":
        own_lead_ids = [l.id for l in apply_company_scope(db.query(Lead.id), Lead, current_user).filter(Lead.assigned_to_id == current_user.id).all()]
        fu_query = fu_query.filter(FollowUp.lead_id.in_(own_lead_ids)) if own_lead_ids else fu_query.filter(False)
    elif current_user.role == "manager":
        if active_team_id is None:
            team_lead_ids = []
        else:
            team_lead_ids = [l.id for l in apply_company_scope(db.query(Lead.id), Lead, current_user).filter(Lead.team_id == active_team_id).all()]
        fu_query = fu_query.filter(FollowUp.lead_id.in_(team_lead_ids)) if team_lead_ids else fu_query.filter(False)
    follow_ups = fu_query.filter(
        FollowUp.scheduled_date == today,
        FollowUp.status == "Pending"
    ).all()
    
    lead_ids = {fu.lead_id for fu in follow_ups if fu.lead_id}
    leads = {l.id: l for l in apply_company_scope(db.query(Lead), Lead, current_user).filter(Lead.id.in_(lead_ids)).all()} if lead_ids else {}
    
    result = []
    for fu in follow_ups:
        lead = leads.get(fu.lead_id)
        result.append({
            "id": fu.id,
            "lead_name": lead.name if lead else "Unknown",
            "company": lead.company if lead else "",
            "time": fu.scheduled_time.strftime("%I:%M %p") if fu.scheduled_time else "No time set",
            "notes": fu.notes,
            "status": fu.status
        })
    
    return {
        "date": today.strftime("%Y-%m-%d"),
        "follow_ups": result,
        "total": len(result)
    }


@router.get("/overdue")
def get_overdue_follow_ups(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    active_team_id: Optional[int] = Depends(get_active_team_id),
):
    """Get overdue follow-ups"""
    today = date.today()
    fu_query = apply_company_scope(db.query(FollowUp), FollowUp, current_user)
    # Role-based scoping
    if current_user.role == "sales":
        own_lead_ids = [l.id for l in apply_company_scope(db.query(Lead.id), Lead, current_user).filter(Lead.assigned_to_id == current_user.id).all()]
        fu_query = fu_query.filter(FollowUp.lead_id.in_(own_lead_ids)) if own_lead_ids else fu_query.filter(False)
    elif current_user.role == "manager":
        if active_team_id is None:
            team_lead_ids = []
        else:
            team_lead_ids = [l.id for l in apply_company_scope(db.query(Lead.id), Lead, current_user).filter(Lead.team_id == active_team_id).all()]
        fu_query = fu_query.filter(FollowUp.lead_id.in_(team_lead_ids)) if team_lead_ids else fu_query.filter(False)
    follow_ups = fu_query.filter(
        FollowUp.scheduled_date < today,
        FollowUp.status == "Pending"
    ).all()
    
    lead_ids = {fu.lead_id for fu in follow_ups if fu.lead_id}
    leads = {l.id: l for l in apply_company_scope(db.query(Lead), Lead, current_user).filter(Lead.id.in_(lead_ids)).all()} if lead_ids else {}
    
    result = []
    for fu in follow_ups:
        lead = leads.get(fu.lead_id)
        days_overdue = (today - fu.scheduled_date).days if fu.scheduled_date else 0
        result.append({
            "id": fu.id,
            "lead_name": lead.name if lead else "Unknown",
            "company": lead.company if lead else "",
            "scheduled_date": fu.scheduled_date.strftime("%Y-%m-%d") if fu.scheduled_date else None,
            "days_overdue": days_overdue,
            "notes": fu.notes
        })
    
    return {
        "follow_ups": result,
        "total": len(result)
    }


@router.get("/{follow_up_id}")
def get_follow_up(
    follow_up_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    active_team_id: Optional[int] = Depends(get_active_team_id),
):
    """Get follow-up details by ID"""
    fu = db.query(FollowUp).filter(FollowUp.id == follow_up_id).first()
    if not fu:
        raise HTTPException(status_code=404, detail="Follow-up not found")
    ensure_company_access(fu, current_user)
    
    # Role-based scoping
    if current_user.role == "sales":
        lead = db.query(Lead).filter(Lead.id == fu.lead_id).first()
        if lead and lead.assigned_to_id != current_user.id:
            raise HTTPException(status_code=403, detail="You do not have access to this follow-up")
    elif current_user.role == "manager":
        lead = db.query(Lead).filter(Lead.id == fu.lead_id).first()
        if lead and (active_team_id is None or lead.team_id != active_team_id):
            raise HTTPException(status_code=403, detail="You do not have access to follow-ups outside your team")
    
    lead = apply_company_scope(db.query(Lead), Lead, current_user).filter(Lead.id == fu.lead_id).first()
    
    return {
        "id": fu.id,
        "lead_id": fu.lead_id,
        "lead_name": f"{lead.name} - {lead.company}" if lead else "Unknown",
        "scheduled_date": fu.scheduled_date.strftime("%Y-%m-%d") if fu.scheduled_date else None,
        "scheduled_time": fu.scheduled_time.strftime("%I:%M %p") if fu.scheduled_time else None,
        "status": fu.status,
        "notes": fu.notes,
        "outcome": fu.outcome
    }


@router.post("", status_code=201)
def create_follow_up(
    body: FollowUpCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new follow-up"""
    lead = apply_company_scope(db.query(Lead), Lead, current_user).filter(Lead.id == body.lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    new_fu = FollowUp(
        company_id=lead.company_id,
        lead_id=body.lead_id,
        scheduled_date=datetime.strptime(body.scheduled_date, "%Y-%m-%d").date(),
        scheduled_time=datetime.strptime(body.scheduled_time, "%H:%M").time() if body.scheduled_time else None,
        notes=body.notes,
        status="Pending"
    )
    
    db.add(new_fu)
    db.commit()
    db.refresh(new_fu)
    
    return {
        "id": new_fu.id,
        "lead_id": new_fu.lead_id,
        "scheduled_date": new_fu.scheduled_date.strftime("%Y-%m-%d"),
        "status": new_fu.status,
        "message": "Follow-up created successfully"
    }


@router.put("/{follow_up_id}")
def update_follow_up(
    follow_up_id: int,
    body: FollowUpUpdateBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    active_team_id: Optional[int] = Depends(get_active_team_id),
):
    """Update follow-up details"""
    fu = db.query(FollowUp).filter(FollowUp.id == follow_up_id).first()
    if not fu:
        raise HTTPException(status_code=404, detail="Follow-up not found")
    ensure_company_access(fu, current_user)
    
    # Role-based scoping
    if current_user.role == "sales":
        lead = db.query(Lead).filter(Lead.id == fu.lead_id).first()
        if lead and lead.assigned_to_id != current_user.id:
            raise HTTPException(status_code=403, detail="You cannot edit this follow-up")
    elif current_user.role == "manager":
        lead = db.query(Lead).filter(Lead.id == fu.lead_id).first()
        if lead and (active_team_id is None or lead.team_id != active_team_id):
            raise HTTPException(status_code=403, detail="You cannot edit follow-ups outside your team")
    
    if body.scheduled_date is not None:
        fu.scheduled_date = datetime.strptime(body.scheduled_date, "%Y-%m-%d").date()
    if body.scheduled_time is not None:
        fu.scheduled_time = datetime.strptime(body.scheduled_time, "%H:%M").time()
    if body.notes is not None:
        fu.notes = body.notes
    
    db.commit()
    
    return {"message": f"Follow-up {follow_up_id} updated"}


@router.post("/{follow_up_id}/complete")
def complete_follow_up(
    follow_up_id: int,
    body: FollowUpCompleteBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    active_team_id: Optional[int] = Depends(get_active_team_id),
):
    """Mark follow-up as completed"""
    fu = db.query(FollowUp).filter(FollowUp.id == follow_up_id).first()
    if not fu:
        raise HTTPException(status_code=404, detail="Follow-up not found")
    ensure_company_access(fu, current_user)
    
    # Role-based scoping
    if current_user.role == "sales":
        lead = db.query(Lead).filter(Lead.id == fu.lead_id).first()
        if lead and lead.assigned_to_id != current_user.id:
            raise HTTPException(status_code=403, detail="You cannot complete this follow-up")
    elif current_user.role == "manager":
        lead = db.query(Lead).filter(Lead.id == fu.lead_id).first()
        if lead and (active_team_id is None or lead.team_id != active_team_id):
            raise HTTPException(status_code=403, detail="You cannot complete follow-ups outside your team")
    
    fu.status = "Completed"
    fu.outcome = body.outcome
    fu.completed_at = datetime.now(timezone.utc)
    
    db.commit()
    
    return {
        "message": f"Follow-up {follow_up_id} marked as completed",
        "outcome": body.outcome,
        "completed_at": fu.completed_at.isoformat()
    }


@router.post("/{follow_up_id}/reschedule")
def reschedule_follow_up(
    follow_up_id: int,
    body: FollowUpRescheduleBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    active_team_id: Optional[int] = Depends(get_active_team_id),
):
    """Reschedule a follow-up"""
    fu = db.query(FollowUp).filter(FollowUp.id == follow_up_id).first()
    if not fu:
        raise HTTPException(status_code=404, detail="Follow-up not found")
    ensure_company_access(fu, current_user)
    
    # Role-based scoping
    if current_user.role == "sales":
        lead = db.query(Lead).filter(Lead.id == fu.lead_id).first()
        if lead and lead.assigned_to_id != current_user.id:
            raise HTTPException(status_code=403, detail="You cannot reschedule this follow-up")
    elif current_user.role == "manager":
        lead = db.query(Lead).filter(Lead.id == fu.lead_id).first()
        if lead and (active_team_id is None or lead.team_id != active_team_id):
            raise HTTPException(status_code=403, detail="You cannot reschedule follow-ups outside your team")
    
    fu.scheduled_date = datetime.strptime(body.new_date, "%Y-%m-%d").date()
    if body.new_time:
        fu.scheduled_time = datetime.strptime(body.new_time, "%H:%M").time()
    if body.reason:
        fu.notes = f"{fu.notes or ''}\n[Rescheduled: {body.reason}]"
    
    db.commit()
    
    return {
        "message": f"Follow-up {follow_up_id} rescheduled",
        "new_date": body.new_date,
        "new_time": body.new_time
    }


@router.delete("/{follow_up_id}", response_model=MessageResponse)
def delete_follow_up(
    follow_up_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a follow-up"""
    fu = db.query(FollowUp).filter(FollowUp.id == follow_up_id).first()
    if not fu:
        raise HTTPException(status_code=404, detail="Follow-up not found")
    ensure_company_access(fu, current_user)

    # Role-based delete permission
    if current_user.role == "sales":
        lead = db.query(Lead).filter(Lead.id == fu.lead_id).first()
        if lead and lead.assigned_to_id != current_user.id:
            raise HTTPException(status_code=403, detail="You can only delete follow-ups for your own leads")
    
    db.delete(fu)
    db.commit()
    
    return {"message": f"Follow-up {follow_up_id} deleted"}
