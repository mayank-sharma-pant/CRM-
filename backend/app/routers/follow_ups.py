from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, date, timedelta

from app.database import get_db
from app.utils.dependencies import get_current_user
from app.models.user import User
from app.models.follow_up import FollowUp
from app.models.lead import Lead

router = APIRouter()


# ===============================
# Follow-ups Endpoints
# ===============================

@router.get("/")
def list_follow_ups(
    status: Optional[str] = Query(None, description="Pending, Completed, Cancelled"),
    lead_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """List all follow-ups for the current user"""
    query = db.query(FollowUp)
    
    if status:
        query = query.filter(FollowUp.status == status)
    if lead_id:
        query = query.filter(FollowUp.lead_id == lead_id)
    
    follow_ups = query.order_by(FollowUp.scheduled_date.asc()).all()
    
    result = []
    for fu in follow_ups:
        lead = db.query(Lead).filter(Lead.id == fu.lead_id).first()
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
    
    return result


@router.get("/today")
def get_todays_follow_ups(
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Get follow-ups scheduled for today"""
    today = date.today()
    
    follow_ups = db.query(FollowUp).filter(
        FollowUp.scheduled_date == today,
        FollowUp.status == "Pending"
    ).all()
    
    result = []
    for fu in follow_ups:
        lead = db.query(Lead).filter(Lead.id == fu.lead_id).first()
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
    # current_user: User = Depends(get_current_user)
):
    """Get overdue follow-ups"""
    today = date.today()
    
    follow_ups = db.query(FollowUp).filter(
        FollowUp.scheduled_date < today,
        FollowUp.status == "Pending"
    ).all()
    
    result = []
    for fu in follow_ups:
        lead = db.query(Lead).filter(Lead.id == fu.lead_id).first()
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
    # current_user: User = Depends(get_current_user)
):
    """Get follow-up details by ID"""
    fu = db.query(FollowUp).filter(FollowUp.id == follow_up_id).first()
    
    if not fu:
        raise HTTPException(status_code=404, detail="Follow-up not found")
    
    lead = db.query(Lead).filter(Lead.id == fu.lead_id).first()
    
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


@router.post("/")
def create_follow_up(
    lead_id: int = Query(...),
    scheduled_date: str = Query(...),
    scheduled_time: Optional[str] = Query(None),
    notes: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Create a new follow-up"""
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    new_fu = FollowUp(
        lead_id=lead_id,
        scheduled_date=datetime.strptime(scheduled_date, "%Y-%m-%d").date(),
        scheduled_time=datetime.strptime(scheduled_time, "%H:%M").time() if scheduled_time else None,
        notes=notes,
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
    scheduled_date: Optional[str] = Query(None),
    scheduled_time: Optional[str] = Query(None),
    notes: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Update follow-up details"""
    fu = db.query(FollowUp).filter(FollowUp.id == follow_up_id).first()
    
    if not fu:
        raise HTTPException(status_code=404, detail="Follow-up not found")
    
    if scheduled_date:
        fu.scheduled_date = datetime.strptime(scheduled_date, "%Y-%m-%d").date()
    if scheduled_time:
        fu.scheduled_time = datetime.strptime(scheduled_time, "%H:%M").time()
    if notes:
        fu.notes = notes
    
    db.commit()
    
    return {"message": f"Follow-up {follow_up_id} updated"}


@router.post("/{follow_up_id}/complete")
def complete_follow_up(
    follow_up_id: int,
    outcome: str = Query(..., description="Outcome of the follow-up"),
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Mark follow-up as completed"""
    fu = db.query(FollowUp).filter(FollowUp.id == follow_up_id).first()
    
    if not fu:
        raise HTTPException(status_code=404, detail="Follow-up not found")
    
    fu.status = "Completed"
    fu.outcome = outcome
    fu.completed_at = datetime.now()
    
    db.commit()
    
    return {
        "message": f"Follow-up {follow_up_id} marked as completed",
        "outcome": outcome,
        "completed_at": fu.completed_at.isoformat()
    }


@router.post("/{follow_up_id}/reschedule")
def reschedule_follow_up(
    follow_up_id: int,
    new_date: str = Query(...),
    new_time: Optional[str] = Query(None),
    reason: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Reschedule a follow-up"""
    fu = db.query(FollowUp).filter(FollowUp.id == follow_up_id).first()
    
    if not fu:
        raise HTTPException(status_code=404, detail="Follow-up not found")
    
    fu.scheduled_date = datetime.strptime(new_date, "%Y-%m-%d").date()
    if new_time:
        fu.scheduled_time = datetime.strptime(new_time, "%H:%M").time()
    if reason:
        fu.notes = f"{fu.notes or ''}\n[Rescheduled: {reason}]"
    
    db.commit()
    
    return {
        "message": f"Follow-up {follow_up_id} rescheduled",
        "new_date": new_date,
        "new_time": new_time
    }


@router.delete("/{follow_up_id}")
def delete_follow_up(
    follow_up_id: int,
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Delete a follow-up"""
    fu = db.query(FollowUp).filter(FollowUp.id == follow_up_id).first()
    
    if not fu:
        raise HTTPException(status_code=404, detail="Follow-up not found")
    
    db.delete(fu)
    db.commit()
    
    return {"message": f"Follow-up {follow_up_id} deleted"}
