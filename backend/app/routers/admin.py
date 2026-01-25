from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from datetime import datetime, timedelta

from app.database import get_db
from app.utils.dependencies import get_current_user
from app.models.user import User
from app.models.team import Team
from app.models.lead import Lead
from app.models.audit import AuditLog
from app.models.company_settings import CompanySettings
from app.utils.security import get_password_hash

router = APIRouter()


# ===============================
# Dashboard
# ===============================

@router.get("/dashboard/stats")
def get_dashboard(
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Get admin dashboard with stats"""
    active_users = db.query(User).filter(User.status == "active").count()
    pending_users = db.query(User).filter(User.status == "pending").count()
    disabled_users = db.query(User).filter(User.status == "disabled").count()
    teams_count = db.query(Team).count()
    
    # Get recent activity
    recent_logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(10).all()
    
    recent_activity = []
    for log in recent_logs:
        recent_activity.append({
            "id": log.id,
            "action": log.action,
            "entity": log.entity_type,
            "time": log.created_at.strftime("%Y-%m-%d %H:%M") if log.created_at else None
        })
    
    return {
        "stats": [
            {"id": 1, "label": "Active Users", "value": str(active_users), "route": "/admin/users"},
            {"id": 2, "label": "Pending Users", "value": str(pending_users), "route": "/admin/users"},
            {"id": 3, "label": "Teams", "value": str(teams_count), "route": "/admin/teams-hierarchy"},
            {"id": 4, "label": "Disabled Users", "value": str(disabled_users), "route": "/admin/users"}
        ],
        "action_required": [],
        "recent_activity": recent_activity
    }


# ===============================
# Users Management
# ===============================

@router.get("/users")
def list_users(
    status: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """List all users with filters"""
    query = db.query(User)
    
    if status and status.lower() != "all":
        query = query.filter(User.status == status.lower())
    if role and role.lower() != "all":
        query = query.filter(User.role == role.lower())
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (User.full_name.ilike(search_pattern)) |
            (User.email.ilike(search_pattern))
        )
    
    users = query.order_by(User.created_at.desc()).all()
    
    result = []
    for user in users:
        team = db.query(Team).filter(Team.id == user.team_id).first() if user.team_id else None
        result.append({
            "id": f"EMP{user.id:03d}",
            "user_id": user.id,
            "name": user.full_name,
            "email": user.email,
            "phone": user.phone,
            "role": user.role.title(),
            "team": team.name if team else None,
            "status": user.status.title(),
            "joined_at": user.created_at.strftime("%Y-%m-%d") if user.created_at else None,
            "last_active": user.last_active_at.strftime("%Y-%m-%d %H:%M") if user.last_active_at else None
        })
    
    return {"users": result, "total": len(result)}


@router.get("/users/{user_id}")
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Get user details by ID"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    team = db.query(Team).filter(Team.id == user.team_id).first() if user.team_id else None
    
    return {
        "id": user.id,
        "name": user.full_name,
        "email": user.email,
        "phone": user.phone,
        "role": user.role,
        "team": team.name if team else None,
        "team_id": user.team_id,
        "status": user.status,
        "created_at": user.created_at.isoformat() if user.created_at else None
    }


@router.put("/users/{user_id}")
def update_user(
    user_id: int,
    role: Optional[str] = Query(None),
    team_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Update user role, team, or status"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if role:
        user.role = role
    if team_id is not None:
        user.team_id = team_id if team_id > 0 else None
    if status:
        user.status = status
    
    db.commit()
    
    return {"message": f"User {user_id} updated successfully"}


@router.post("/users/{user_id}/activate")
def activate_user(
    user_id: int,
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Activate a user"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.status = "active"
    db.commit()
    
    return {"message": f"User {user.full_name} activated"}


@router.post("/users/{user_id}/disable")
def disable_user(
    user_id: int,
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Disable a user"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.status = "disabled"
    db.commit()
    
    return {"message": f"User {user.full_name} disabled"}


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Delete a user"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db.delete(user)
    db.commit()
    
    return {"message": f"User deleted"}


# ===============================
# Teams Management
# ===============================

@router.get("/teams")
def list_teams(
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """List all teams"""
    teams = db.query(Team).all()
    
    result = []
    for team in teams:
        member_count = db.query(User).filter(User.team_id == team.id).count()
        result.append({
            "id": team.id,
            "name": team.name,
            "member_count": member_count,
            "created_at": team.created_at.strftime("%Y-%m-%d") if team.created_at else None
        })
    
    return {"teams": result, "total": len(result)}


@router.post("/teams")
def create_team(
    name: str = Query(...),
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Create a new team"""
    existing = db.query(Team).filter(Team.name == name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Team name already exists")
    
    new_team = Team(name=name)
    db.add(new_team)
    db.commit()
    db.refresh(new_team)
    
    return {"id": new_team.id, "name": new_team.name, "message": "Team created"}


@router.get("/teams/{team_id}")
def get_team(
    team_id: int,
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Get team details with members"""
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    members = db.query(User).filter(User.team_id == team_id).all()
    
    return {
        "id": team.id,
        "name": team.name,
        "members": [
            {"id": m.id, "name": m.full_name, "email": m.email, "role": m.role}
            for m in members
        ],
        "member_count": len(members)
    }


@router.put("/teams/{team_id}")
def update_team(
    team_id: int,
    name: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Update team"""
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    if name:
        team.name = name
    
    db.commit()
    
    return {"message": f"Team {team_id} updated"}


@router.delete("/teams/{team_id}")
def delete_team(
    team_id: int,
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Delete team"""
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    # Remove team from users
    db.query(User).filter(User.team_id == team_id).update({"team_id": None})
    
    db.delete(team)
    db.commit()
    
    return {"message": f"Team deleted"}


@router.post("/teams/{team_id}/members")
def add_team_member(
    team_id: int,
    user_id: int = Query(...),
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Add member to team"""
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.team_id = team_id
    db.commit()
    
    return {"message": f"{user.full_name} added to {team.name}"}


@router.delete("/teams/{team_id}/members/{user_id}")
def remove_team_member(
    team_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Remove member from team"""
    user = db.query(User).filter(User.id == user_id, User.team_id == team_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found in this team")
    
    user.team_id = None
    db.commit()
    
    return {"message": f"User removed from team"}


# ===============================
# Approvals (Pending Users)
# ===============================

@router.get("/approvals")
def get_pending_approvals(
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Get users pending approval"""
    pending = db.query(User).filter(User.status == "pending").all()
    
    return {
        "approvals": [
            {
                "id": u.id,
                "name": u.full_name,
                "email": u.email,
                "role": u.role,
                "requested_at": u.created_at.strftime("%Y-%m-%d") if u.created_at else None
            }
            for u in pending
        ],
        "total": len(pending)
    }


@router.post("/approvals/{user_id}/approve")
def approve_user(
    user_id: int,
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Approve a pending user"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.status = "active"
    db.commit()
    
    return {"message": f"User {user.full_name} approved"}


@router.post("/approvals/{user_id}/reject")
def reject_user(
    user_id: int,
    reason: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Reject a pending user"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db.delete(user)
    db.commit()
    
    return {"message": f"User rejected"}


# ===============================
# Hierarchy
# ===============================

@router.get("/hierarchy")
def get_hierarchy(
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Get organization hierarchy"""
    teams = db.query(Team).all()
    
    hierarchy = []
    for team in teams:
        members = db.query(User).filter(User.team_id == team.id).all()
        manager = next((m for m in members if m.role == "manager"), None)
        
        hierarchy.append({
            "id": team.id,
            "name": team.name,
            "manager": {
                "id": manager.id,
                "name": manager.full_name
            } if manager else None,
            "members": [
                {"id": m.id, "name": m.full_name, "role": m.role}
                for m in members if m.role != "manager"
            ],
            "member_count": len(members)
        })
    
    return {"teams": hierarchy}


# ===============================
# Audit Log
# ===============================

@router.get("/audit-log")
def get_audit_log(
    days: int = Query(7),
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Get audit log entries"""
    since = datetime.now() - timedelta(days=days)
    logs = db.query(AuditLog).filter(AuditLog.created_at >= since).order_by(AuditLog.created_at.desc()).all()
    
    return {
        "logs": [
            {
                "id": log.id,
                "action": log.action,
                "entity_type": log.entity_type,
                "entity_id": log.entity_id,
                "user_id": log.user_id,
                "details": log.details,
                "timestamp": log.created_at.isoformat() if log.created_at else None
            }
            for log in logs
        ],
        "total": len(logs)
    }


# ===============================
# Settings
# ===============================

@router.get("/settings")
def get_settings(
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Get company settings"""
    settings = db.query(CompanySettings).first()
    
    if not settings:
        return {
            "company_name": "Company Name",
            "invoice_prefix": "INV",
            "tax_rate": 18.0,
            "payment_terms": "Net 30 days"
        }
    
    return {
        "company_name": settings.company_name,
        "address": settings.address,
        "gst_number": settings.gst_number,
        "invoice_prefix": settings.invoice_prefix,
        "tax_rate": settings.tax_rate,
        "payment_terms": settings.payment_terms
    }


@router.put("/settings")
def update_settings(
    company_name: Optional[str] = Query(None),
    address: Optional[str] = Query(None),
    invoice_prefix: Optional[str] = Query(None),
    tax_rate: Optional[float] = Query(None),
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Update company settings"""
    settings = db.query(CompanySettings).first()
    
    if not settings:
        settings = CompanySettings()
        db.add(settings)
    
    if company_name:
        settings.company_name = company_name
    if address:
        settings.address = address
    if invoice_prefix:
        settings.invoice_prefix = invoice_prefix
    if tax_rate is not None:
        settings.tax_rate = tax_rate
    
    db.commit()
    
    return {"message": "Settings updated"}
