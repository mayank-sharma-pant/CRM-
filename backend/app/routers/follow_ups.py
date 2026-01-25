from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime

from app.database import get_db
from app.utils.dependencies import get_current_user
from app.models.user import User
from app.schemas.sales import FollowUpResponse, FollowUpListResponse, FollowUpCreate

router = APIRouter()


# ===============================
# Follow-ups Endpoints
# ===============================

@router.get("/", response_model=List[FollowUpResponse])
def list_follow_ups(
    status: Optional[str] = Query(None, description="pending, completed, overdue"),
    lead_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """List all follow-ups for the current user"""
    follow_ups = [
        FollowUpResponse(id=1, lead_id=1, lead_name="John Smith - Acme Corp",
                        scheduled_date="2024-01-20", scheduled_time="10:00 AM",
                        status="Pending", notes="Discuss pricing options"),
        FollowUpResponse(id=2, lead_id=2, lead_name="Sarah Johnson - TechStart",
                        scheduled_date="2024-01-19", scheduled_time="2:00 PM",
                        status="Overdue", notes="Send updated proposal"),
        FollowUpResponse(id=3, lead_id=3, lead_name="Mike Williams - Design Co",
                        scheduled_date="2024-01-22", scheduled_time="11:00 AM",
                        status="Pending", notes="Demo presentation"),
        FollowUpResponse(id=4, lead_id=4, lead_name="Emily Brown - Startup IO",
                        scheduled_date="2024-01-18", scheduled_time="3:00 PM",
                        status="Completed", notes="Initial call completed"),
    ]
    
    if status:
        status_lower = status.lower()
        follow_ups = [f for f in follow_ups if f.status.lower() == status_lower]
    if lead_id:
        follow_ups = [f for f in follow_ups if f.lead_id == lead_id]
    
    return follow_ups


@router.get("/today")
def get_todays_follow_ups(
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Get follow-ups scheduled for today"""
    return {
        "date": datetime.now().strftime("%Y-%m-%d"),
        "follow_ups": [
            {"id": 1, "lead_name": "John Smith", "company": "Acme Corp", 
             "time": "10:00 AM", "notes": "Discuss pricing", "status": "Pending"},
            {"id": 2, "lead_name": "Emily Brown", "company": "Startup IO",
             "time": "3:00 PM", "notes": "Contract review", "status": "Pending"},
        ],
        "total": 2
    }


@router.get("/overdue")
def get_overdue_follow_ups(
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Get overdue follow-ups"""
    return {
        "follow_ups": [
            {"id": 2, "lead_name": "Sarah Johnson", "company": "TechStart",
             "scheduled_date": "2024-01-17", "days_overdue": 2, "notes": "Send proposal"},
        ],
        "total": 1
    }


@router.get("/{follow_up_id}", response_model=FollowUpResponse)
def get_follow_up(
    follow_up_id: int,
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Get follow-up details by ID"""
    return FollowUpResponse(
        id=follow_up_id,
        lead_id=1,
        lead_name="John Smith - Acme Corp",
        scheduled_date="2024-01-20",
        scheduled_time="10:00 AM",
        status="Pending",
        notes="Discuss pricing options and timeline"
    )


@router.post("/", response_model=FollowUpResponse)
def create_follow_up(
    follow_up_data: FollowUpCreate,
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Create a new follow-up"""
    return FollowUpResponse(
        id=100,
        lead_id=follow_up_data.lead_id,
        lead_name="Lead Name",  # Would be fetched from DB
        scheduled_date=follow_up_data.scheduled_date,
        scheduled_time=follow_up_data.scheduled_time,
        status="Pending",
        notes=follow_up_data.notes
    )


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
    return {
        "message": f"Follow-up {follow_up_id} updated",
        "updates": {
            "scheduled_date": scheduled_date,
            "scheduled_time": scheduled_time,
            "notes": notes
        }
    }


@router.post("/{follow_up_id}/complete")
def complete_follow_up(
    follow_up_id: int,
    outcome: str = Query(..., description="Outcome of the follow-up"),
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Mark follow-up as completed"""
    return {
        "message": f"Follow-up {follow_up_id} marked as completed",
        "outcome": outcome,
        "completed_at": datetime.now().isoformat()
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
    return {
        "message": f"Follow-up {follow_up_id} rescheduled",
        "new_date": new_date,
        "new_time": new_time,
        "reason": reason
    }


@router.delete("/{follow_up_id}")
def delete_follow_up(
    follow_up_id: int,
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Delete a follow-up"""
    return {"message": f"Follow-up {follow_up_id} deleted"}
