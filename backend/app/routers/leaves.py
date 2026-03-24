from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.leave_request import LeaveRequest
from app.models.user import User
from app.utils.dependencies import get_current_user, apply_company_scope
from app.schemas.user import MessageResponse
from app.utils.notify import send_notification, notify_role_users

router = APIRouter()


class LeaveCreateRequest(BaseModel):
    from_date: datetime
    to_date: datetime
    reason: str | None = None


class LeaveApproveRequest(BaseModel):
    status: str


@router.get("")
def list_leaves(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = apply_company_scope(db.query(LeaveRequest), LeaveRequest, current_user)

    if current_user.role == "manager":
        query = query.join(User, LeaveRequest.user_id == User.id).filter(
            (LeaveRequest.user_id == current_user.id)
            | (User.team_id == current_user.team_id)
        )
    elif current_user.role in ["admin", "md"]:
        # Admin and MD see all leaves in the company
        pass
    else:
        # Sales, Purchase, and others only see their own leaves
        query = query.filter(LeaveRequest.user_id == current_user.id)

    total = query.count()
    leaves = query.order_by(LeaveRequest.created_at.desc()).offset(skip).limit(limit).all()
    items = [
        {
            "id": l.id,
            "user_id": l.user_id,
            "user_name": l.user.full_name if l.user else None,
            "from_date": l.from_date.date().isoformat() if l.from_date else None,
            "to_date": l.to_date.date().isoformat() if l.to_date else None,
            "reason": l.reason,
            "status": l.status,
        }
        for l in leaves
    ]
    return {"items": items, "total": total, "skip": skip, "limit": limit}


@router.post("")
def create_leave(
    payload: LeaveCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.company_id is None:
        raise HTTPException(status_code=403, detail="User must be assigned to a company")
    if payload.to_date < payload.from_date:
        raise HTTPException(status_code=400, detail="to_date cannot be before from_date")

    leave = LeaveRequest(
        company_id=current_user.company_id,
        user_id=current_user.id,
        from_date=payload.from_date,
        to_date=payload.to_date,
        reason=payload.reason,
        status="Pending",
    )
    db.add(leave)
    db.commit()
    db.refresh(leave)

    # Notify Manager or Admins about the new leave request
    if current_user.manager_id:
        send_notification(db, current_user.manager_id,
            title="New Leave Request",
            message=f"{current_user.full_name} requested leave from {payload.from_date.date()} to {payload.to_date.date()}.",
            type="info",
            link="/manager/leaves")
    else:
        # Fallback to Company Admins if no direct manager is assigned
        notify_role_users(db, current_user.company_id, role="admin",
            title="New Leave Request",
            message=f"{current_user.full_name} has requested leave. Please review.",
            type="info",
            link="/settings/leave")

    return {"id": leave.id, "message": "Leave request created"}


@router.post("/{leave_id}/approve")
def approve_leave(
    leave_id: int,
    payload: LeaveApproveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    leave = apply_company_scope(db.query(LeaveRequest), LeaveRequest, current_user).filter(LeaveRequest.id == leave_id).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found")

    if current_user.role not in ["manager", "admin", "md"]:
        raise HTTPException(status_code=403, detail="Only manager/admin/md can approve leaves")

    # Role-based approval restrictions
    leave_user = db.query(User).filter(User.id == leave.user_id).first()
    if current_user.role == "manager":
        if not leave_user or leave_user.role != "sales" or leave_user.team_id != current_user.team_id:
            raise HTTPException(status_code=403, detail="Managers can only approve leaves for their sales team")

    normalized = payload.status.strip().capitalize()
    if normalized not in ["Approved", "Rejected"]:
        raise HTTPException(status_code=400, detail="status must be Approved or Rejected")

    leave.status = normalized
    leave.approved_by_id = current_user.id
    leave.approved_at = datetime.now(timezone.utc)
    
    # Notify the employee about their leave decision
    send_notification(db, leave.user_id,
        title=f"Leave {normalized}",
        message=f"Your leave request was {normalized.lower()} by {current_user.full_name}.",
        type="success" if normalized == "Approved" else "warning",
        link="/settings/leave")
    
    db.commit()

    return MessageResponse(message=f"Leave request {normalized.lower()}")
