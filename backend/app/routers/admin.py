from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from datetime import datetime, timedelta
import json
import secrets
import logging

from app.database import get_db
from app.utils.dependencies import require_admin, apply_company_scope, ensure_company_access
from app.models.user import User
from app.models.team import Team
from app.models.lead import Lead
from app.models.task import Task
from app.models.audit import AuditLog
from app.models.invite import Invite, InviteStatus
from app.models.company_settings import CompanySettings
from app.models.company import Company
from app.utils.security import get_password_hash
from app.utils.email_service import send_invite_email
from app.schemas.admin import (
    DashboardResponse,
    UserListResponse, UserUpdateRequest,
    TeamListResponse, TeamCreate, TeamUpdate, TeamMemberAdd,
    ApprovalListResponse, RejectRequest,
    AuditLogResponse,
    CompanySettingsResponse, CompanySettingsUpdate,
    InviteRequest,
)
from app.schemas.user import MessageResponse

router = APIRouter()
logger = logging.getLogger("uvicorn.error")


# ===============================
# Helper: Create Audit Log Entry
# ===============================
def create_audit_log(
    db: Session,
    admin: User,
    action: str,
    entity_type: str,
    entity_id: str = None,
    entity_name: str = None,
    before_value: dict = None,
    after_value: dict = None
):
    """Helper to create audit log entries"""
    log = AuditLog(
        company_id=admin.company_id,
        admin_id=admin.id,
        admin_name=admin.full_name,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        entity_name=entity_name,
        before_value=json.dumps(before_value) if before_value else None,
        after_value=json.dumps(after_value) if after_value else None
    )
    db.add(log)
    return log


# ===============================
# Dashboard
# ===============================

@router.get("/dashboard/stats", response_model=DashboardResponse)
def get_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get admin dashboard with stats (company-scoped for company admin)"""
    user_q = apply_company_scope(db.query(User), User, current_user)
    active_users = user_q.filter(User.status == "active").count()
    pending_users = user_q.filter(User.status == "pending").count()
    disabled_users = user_q.filter(User.status == "disabled").count()
    teams_count = apply_company_scope(db.query(Team), Team, current_user).count()
    
    # Get recent activity (company-scoped if admin has company_id)
    log_q = db.query(AuditLog)
    if current_user.company_id is not None:
        log_q = log_q.filter(AuditLog.company_id == current_user.company_id)
    recent_logs = log_q.order_by(AuditLog.timestamp.desc()).limit(10).all()
    
    recent_activity = []
    for log in recent_logs:
        recent_activity.append({
            "id": log.id,
            "action": log.action,
            "entity": log.entity_type,
            "time": log.timestamp.strftime("%Y-%m-%d %H:%M") if log.timestamp else None
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

@router.get("/users", response_model=UserListResponse)
def list_users(
    status: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """List all users with filters (company-scoped for company admin, paginated)."""
    query = apply_company_scope(db.query(User), User, current_user)
    
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
    
    total = query.count()
    users = query.order_by(User.created_at.desc()).offset(skip).limit(limit).all()
    
    result = []
    team_q = apply_company_scope(db.query(Team), Team, current_user)
    for user in users:
        team = team_q.filter(Team.id == user.team_id).first() if user.team_id else None
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
    
    return {"users": result, "total": total, "skip": skip, "limit": limit}


@router.get("/users/{user_id}")
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get user details by ID"""
    user = apply_company_scope(db.query(User), User, current_user).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    team = apply_company_scope(db.query(Team), Team, current_user).filter(Team.id == user.team_id).first() if user.team_id else None
    
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


@router.put("/users/{user_id}", response_model=MessageResponse)
def update_user(
    user_id: int,
    body: UserUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Update user role, team, or status"""
    user = apply_company_scope(db.query(User), User, current_user).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    before_state = {"role": user.role, "team_id": user.team_id, "status": user.status}
    
    if body.role is not None:
        user.role = body.role
    if body.team_id is not None:
        user.team_id = body.team_id if body.team_id > 0 else None
    if body.status is not None:
        user.status = body.status
    
    after_state = {"role": user.role, "team_id": user.team_id, "status": user.status}
    
    create_audit_log(
        db, current_user, "user_updated", "user",
        entity_id=str(user.id), entity_name=user.full_name,
        before_value=before_state, after_value=after_state
    )
    
    db.commit()
    
    return {"message": f"User {user_id} updated successfully"}


@router.post("/users/{user_id}/activate")
def activate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Activate a user"""
    user = apply_company_scope(db.query(User), User, current_user).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    old_status = user.status
    user.status = "active"
    user.is_active = True
    
    create_audit_log(
        db, current_user, "user_activated", "user",
        entity_id=str(user.id), entity_name=user.full_name,
        before_value={"status": old_status}, after_value={"status": "active"}
    )
    
    db.commit()
    
    return {"message": f"User {user.full_name} activated"}


@router.post("/users/{user_id}/disable")
def disable_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Disable a user"""
    user = apply_company_scope(db.query(User), User, current_user).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check for open tasks that need reassignment (company-scoped)
    task_q = apply_company_scope(db.query(Task), Task, current_user)
    open_tasks = task_q.filter(
        Task.assigned_to_id == user_id,
        Task.status != "Completed"
    ).count()
    
    # Check for assigned leads (company-scoped)
    lead_q = apply_company_scope(db.query(Lead), Lead, current_user)
    assigned_leads = lead_q.filter(
        Lead.assigned_to_id == user_id
    ).count()
    
    old_status = user.status
    user.status = "disabled"
    user.is_active = False
    
    create_audit_log(
        db, current_user, "user_disabled", "user",
        entity_id=str(user.id), entity_name=user.full_name,
        before_value={"status": old_status},
        after_value={"status": "disabled", "open_tasks": open_tasks, "assigned_leads": assigned_leads}
    )
    
    db.commit()
    
    warning = ""
    if open_tasks > 0 or assigned_leads > 0:
        warning = f" Warning: {open_tasks} open tasks and {assigned_leads} leads need reassignment."
    
    return {"message": f"User {user.full_name} disabled.{warning}"}


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    force: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Delete a user (requires reassignment of tasks/leads first)"""
    user = apply_company_scope(db.query(User), User, current_user).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Safety check: prevent deleting users with open tasks or leads (company-scoped)
    task_q = apply_company_scope(db.query(Task), Task, current_user)
    open_tasks = task_q.filter(
        Task.assigned_to_id == user_id,
        Task.status != "Completed"
    ).count()
    
    lead_q = apply_company_scope(db.query(Lead), Lead, current_user)
    assigned_leads = lead_q.filter(
        Lead.assigned_to_id == user_id
    ).count()
    
    if (open_tasks > 0 or assigned_leads > 0) and not force:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete: {open_tasks} open tasks and {assigned_leads} leads must be reassigned first. Use force=true to override."
        )
    
    user_name = user.full_name
    
    create_audit_log(
        db, current_user, "user_deleted", "user",
        entity_id=str(user.id), entity_name=user_name,
        before_value={"email": user.email, "role": user.role},
        after_value=None
    )
    
    db.delete(user)
    db.commit()
    
    return {"message": f"User {user_name} deleted"}


# ===============================
# Teams Management
# ===============================

@router.get("/teams", response_model=TeamListResponse)
def list_teams(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """List all teams (company-scoped, paginated)."""
    query = apply_company_scope(db.query(Team), Team, current_user)
    total = query.count()
    teams = query.offset(skip).limit(limit).all()
    
    result = []
    user_q = apply_company_scope(db.query(User), User, current_user)
    for team in teams:
        member_count = user_q.filter(User.team_id == team.id).count()
        manager = user_q.filter(User.team_id == team.id, User.role == "manager").first()
        result.append({
            "id": team.id,
            "name": team.name,
            "member_count": member_count,
            "manager": {"id": manager.id, "name": manager.full_name} if manager else None,
            "created_at": team.created_at.strftime("%Y-%m-%d") if team.created_at else None
        })
    
    return {"teams": result, "total": total, "skip": skip, "limit": limit}


@router.post("/teams")
def create_team(
    body: TeamCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Create a new team"""
    if current_user.company_id is None:
        raise HTTPException(status_code=403, detail="Platform Admin cannot create teams; use company admin")
    existing = apply_company_scope(db.query(Team), Team, current_user).filter(Team.name == body.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Team name already exists")
    
    new_team = Team(company_id=current_user.company_id, name=body.name)
    db.add(new_team)
    db.flush()
    
    create_audit_log(
        db, current_user, "team_created", "team",
        entity_id=str(new_team.id), entity_name=body.name,
        after_value={"name": body.name}
    )
    
    db.commit()
    db.refresh(new_team)
    
    return {"id": new_team.id, "name": new_team.name, "message": "Team created"}


@router.get("/teams/{team_id}")
def get_team(
    team_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get team details with members"""
    team = apply_company_scope(db.query(Team), Team, current_user).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    members = apply_company_scope(db.query(User), User, current_user).filter(User.team_id == team_id).all()
    manager = next((m for m in members if m.role == "manager"), None)
    
    return {
        "id": team.id,
        "name": team.name,
        "manager": {"id": manager.id, "name": manager.full_name} if manager else None,
        "members": [
            {"id": m.id, "name": m.full_name, "email": m.email, "role": m.role}
            for m in members
        ],
        "member_count": len(members)
    }


@router.put("/teams/{team_id}", response_model=MessageResponse)
def update_team(
    team_id: int,
    body: TeamUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Update team"""
    team = apply_company_scope(db.query(Team), Team, current_user).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    old_name = team.name
    if body.name:
        team.name = body.name
        create_audit_log(
            db, current_user, "team_updated", "team",
            entity_id=str(team.id), entity_name=body.name,
            before_value={"name": old_name}, after_value={"name": body.name}
        )
    
    db.commit()
    
    return {"message": f"Team {team_id} updated"}


@router.delete("/teams/{team_id}")
def delete_team(
    team_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Delete team"""
    team = apply_company_scope(db.query(Team), Team, current_user).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    team_name = team.name
    member_count = apply_company_scope(db.query(User), User, current_user).filter(User.team_id == team_id).count()
    
    # Remove team from users (company-scoped to prevent cross-tenant corruption)
    apply_company_scope(db.query(User), User, current_user).filter(
        User.team_id == team_id
    ).update({"team_id": None}, synchronize_session="fetch")
    
    create_audit_log(
        db, current_user, "team_deleted", "team",
        entity_id=str(team_id), entity_name=team_name,
        before_value={"name": team_name, "member_count": member_count},
        after_value=None
    )
    
    db.delete(team)
    db.commit()
    
    return {"message": f"Team {team_name} deleted"}


@router.post("/teams/{team_id}/members", response_model=MessageResponse)
def add_team_member(
    team_id: int,
    body: TeamMemberAdd,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Add member to team"""
    team = apply_company_scope(db.query(Team), Team, current_user).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    user = apply_company_scope(db.query(User), User, current_user).filter(User.id == body.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    old_team_id = user.team_id
    user.team_id = team_id
    
    create_audit_log(
        db, current_user, "team_member_added", "team",
        entity_id=str(team_id), entity_name=team.name,
        before_value={"user_id": body.user_id, "old_team_id": old_team_id},
        after_value={"user_id": body.user_id, "user_name": user.full_name, "team_id": team_id}
    )
    
    db.commit()
    
    return {"message": f"{user.full_name} added to {team.name}"}


@router.delete("/teams/{team_id}/members/{user_id}")
def remove_team_member(
    team_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Remove member from team"""
    team = apply_company_scope(db.query(Team), Team, current_user).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    user = apply_company_scope(db.query(User), User, current_user).filter(User.id == user_id, User.team_id == team_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found in this team")
    
    create_audit_log(
        db, current_user, "team_member_removed", "team",
        entity_id=str(team_id), entity_name=team.name,
        before_value={"user_id": user_id, "user_name": user.full_name, "team_id": team_id},
        after_value={"user_id": user_id, "team_id": None}
    )
    
    user.team_id = None
    db.commit()
    
    return {"message": f"{user.full_name} removed from {team.name}"}


# ===============================
# Approvals (Pending Users)
# ===============================

@router.get("/approvals", response_model=ApprovalListResponse)
def get_pending_approvals(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get users pending approval (company-scoped, paginated)."""
    query = apply_company_scope(db.query(User), User, current_user).filter(User.status == "pending")
    total = query.count()
    pending = query.order_by(User.created_at.desc()).offset(skip).limit(limit).all()
    
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
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.post("/approvals/{user_id}/approve")
def approve_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Approve a pending user"""
    user = apply_company_scope(db.query(User), User, current_user).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.status != "pending":
        raise HTTPException(status_code=400, detail="User is not pending approval")
    
    user.status = "active"
    user.is_active = True
    
    create_audit_log(
        db, current_user, "user_approved", "user",
        entity_id=str(user.id), entity_name=user.full_name,
        before_value={"status": "pending"}, after_value={"status": "active"}
    )
    
    db.commit()
    
    return {"message": f"User {user.full_name} approved"}


@router.post("/approvals/{user_id}/reject", response_model=MessageResponse)
def reject_user(
    user_id: int,
    body: RejectRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Reject a pending user"""
    user = apply_company_scope(db.query(User), User, current_user).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.status != "pending":
        raise HTTPException(status_code=400, detail="User is not pending approval")
    
    user_name = user.full_name
    user_email = user.email
    
    create_audit_log(
        db, current_user, "user_rejected", "user",
        entity_id=str(user.id), entity_name=user_name,
        before_value={"email": user_email, "status": "pending"},
        after_value={"status": "rejected", "reason": body.reason}
    )
    
    db.delete(user)
    db.commit()
    
    return {"message": f"User {user_name} rejected"}


# ===============================
# Hierarchy
# ===============================

@router.get("/hierarchy")
def get_hierarchy(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get organization hierarchy (company-scoped)"""
    teams = apply_company_scope(db.query(Team), Team, current_user).all()
    
    hierarchy = []
    user_q = apply_company_scope(db.query(User), User, current_user)
    for team in teams:
        members = user_q.filter(User.team_id == team.id).all()
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

@router.get("/audit-log", response_model=AuditLogResponse)
def get_audit_log(
    days: int = Query(7),
    action: Optional[str] = Query(None),
    entity_type: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get audit log entries (company-scoped if admin has company_id, paginated)."""
    since = datetime.now() - timedelta(days=days)
    query = db.query(AuditLog).filter(AuditLog.timestamp >= since)
    if current_user.company_id is not None:
        query = query.filter(AuditLog.company_id == current_user.company_id)
    
    if action:
        query = query.filter(AuditLog.action == action)
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)
    
    total = query.count()
    logs = query.order_by(AuditLog.timestamp.desc()).offset(skip).limit(limit).all()
    
    return {
        "logs": [
            {
                "id": log.id,
                "action": log.action,
                "entity_type": log.entity_type,
                "entity_id": log.entity_id,
                "entity_name": log.entity_name,
                "admin_id": log.admin_id,
                "admin_name": log.admin_name,
                "before_value": log.before_value,
                "after_value": log.after_value,
                "timestamp": log.timestamp.isoformat() if log.timestamp else None
            }
            for log in logs
        ],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


# ===============================
# Settings
# ===============================

@router.get("/settings", response_model=CompanySettingsResponse)
def get_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get company settings (company-scoped)"""
    if current_user.company_id is None:
        return {
            "company_name": "Company Name",
            "invoice_prefix": "INV",
            "tax_rate": 18.0,
            "payment_terms": "Net 30 days",
            "lead_stages": ["New", "Contacted", "Qualified", "Proposal", "Won", "Lost"],
            "lost_reasons": ["No budget", "Timing not right", "Competitor", "No response"],
            "task_reminders_enabled": True,
            "followup_alerts_enabled": True,
        }
    settings = db.query(CompanySettings).filter(CompanySettings.company_id == current_user.company_id).first()
    
    if not settings:
        return {
            "company_name": "Company Name",
            "invoice_prefix": "INV",
            "tax_rate": 18.0,
            "payment_terms": "Net 30 days",
            "lead_stages": ["New", "Contacted", "Qualified", "Proposal", "Won", "Lost"],
            "lost_reasons": ["No budget", "Timing not right", "Competitor", "No response"],
            "task_reminders_enabled": True,
            "followup_alerts_enabled": True,
        }

    # Parse pipeline settings stored as JSON text
    try:
        lead_stages = json.loads(settings.lead_stages) if settings.lead_stages else []
    except Exception:
        lead_stages = ["New", "Contacted", "Qualified", "Proposal", "Won", "Lost"]
    try:
        lost_reasons = json.loads(settings.lost_reasons) if settings.lost_reasons else []
    except Exception:
        lost_reasons = ["No budget", "Timing not right", "Competitor", "No response"]
    
    return {
        "company_name": settings.company_name,
        "address": settings.address,
        "gst_number": settings.gst_number,
        "invoice_prefix": settings.invoice_prefix,
        "tax_rate": settings.tax_rate,
        "payment_terms": settings.payment_terms,
        "lead_stages": lead_stages,
        "lost_reasons": lost_reasons,
        "task_reminders_enabled": bool(settings.task_reminders_enabled),
        "followup_alerts_enabled": bool(settings.followup_alerts_enabled),
    }


@router.put("/settings", response_model=MessageResponse)
def update_settings(
    body: CompanySettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Update company settings"""
    if current_user.company_id is None:
        raise HTTPException(status_code=403, detail="Platform Admin cannot update company settings")
    settings = db.query(CompanySettings).filter(CompanySettings.company_id == current_user.company_id).first()
    
    before_state = {}
    if settings:
        before_state = {
            "company_name": settings.company_name,
            "address": settings.address,
            "invoice_prefix": settings.invoice_prefix,
            "tax_rate": settings.tax_rate,
            "task_reminders_enabled": bool(settings.task_reminders_enabled),
            "followup_alerts_enabled": bool(settings.followup_alerts_enabled),
        }
    
    if not settings:
        settings = CompanySettings(company_id=current_user.company_id)
        db.add(settings)
    
    if body.company_name is not None:
        settings.company_name = body.company_name
    if body.address is not None:
        settings.address = body.address
    if body.gst_number is not None:
        settings.gst_number = body.gst_number
    if body.invoice_prefix is not None:
        settings.invoice_prefix = body.invoice_prefix
    if body.tax_rate is not None:
        settings.tax_rate = body.tax_rate
    if body.lead_stages is not None:
        settings.lead_stages = json.dumps(body.lead_stages)
    if body.lost_reasons is not None:
        settings.lost_reasons = json.dumps(body.lost_reasons)
    if body.task_reminders_enabled is not None:
        settings.task_reminders_enabled = 1 if body.task_reminders_enabled else 0
    if body.followup_alerts_enabled is not None:
        settings.followup_alerts_enabled = 1 if body.followup_alerts_enabled else 0
    
    after_state = {
        "company_name": settings.company_name,
        "address": settings.address,
        "invoice_prefix": settings.invoice_prefix,
        "tax_rate": settings.tax_rate,
        "task_reminders_enabled": bool(settings.task_reminders_enabled),
        "followup_alerts_enabled": bool(settings.followup_alerts_enabled),
    }
    
    create_audit_log(
        db, current_user, "settings_updated", "settings",
        before_value=before_state if before_state else None,
        after_value=after_state
    )
    
    db.commit()
    
    return {"message": "Settings updated"}


# ===============================
# Invites Management
# ===============================

INVITE_EXPIRY_DAYS = 7


def generate_invite_token():
    """Generate a secure random token for invite links"""
    return secrets.token_urlsafe(32)


@router.get("/invites")
def list_invites(
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """List all invites with optional status filter (company-scoped, paginated)."""
    query = apply_company_scope(db.query(Invite), Invite, current_user)
    
    if status and status.lower() != "all":
        query = query.filter(Invite.status == status.lower())
    
    total = query.count()
    invites = query.order_by(Invite.created_at.desc()).offset(skip).limit(limit).all()
    
    result = []
    for inv in invites:
        # Check if expired
        is_expired = inv.expires_at and datetime.now() > inv.expires_at
        display_status = "expired" if is_expired and inv.status == "pending" else inv.status
        
        result.append({
            "id": inv.id,
            "email": inv.email,
            "full_name": inv.full_name,
            "phone": inv.phone,
            "role": inv.role,
            "team_id": inv.team_id,
            "team_name": inv.team.name if inv.team else None,
            "manager_id": inv.manager_id,
            "manager_name": inv.manager.full_name if inv.manager else None,
            "status": display_status,
            "expires_at": inv.expires_at.isoformat() if inv.expires_at else None,
            "created_at": inv.created_at.isoformat() if inv.created_at else None,
            "created_by": inv.created_by.full_name if inv.created_by else None
        })
    
    return {"invites": result, "total": total, "skip": skip, "limit": limit}


@router.post("/invites")
def create_invite(
    body: InviteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Create a new invite for a user"""
    if current_user.company_id is None:
        raise HTTPException(status_code=403, detail="Platform Admin cannot create invites; use company admin")
    existing_user = db.query(User).filter(User.email == body.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="User with this email already exists")
    
    existing_invite = db.query(Invite).filter(
        Invite.email == body.email,
        Invite.status == InviteStatus.PENDING
    ).first()
    if existing_invite:
        raise HTTPException(status_code=400, detail="Pending invite already exists for this email")
    
    if body.team_id:
        team = apply_company_scope(db.query(Team), Team, current_user).filter(Team.id == body.team_id).first()
        if not team:
            raise HTTPException(status_code=400, detail="Team not found")
    
    if body.manager_id:
        manager = apply_company_scope(db.query(User), User, current_user).filter(User.id == body.manager_id).first()
        if not manager:
            raise HTTPException(status_code=400, detail="Manager not found")
    
    token = generate_invite_token()
    expires_at = datetime.now() + timedelta(days=INVITE_EXPIRY_DAYS)
    
    invite = Invite(
        company_id=current_user.company_id,
        email=body.email,
        full_name=body.full_name,
        phone=body.phone,
        role=body.role,
        team_id=body.team_id,
        manager_id=body.manager_id,
        token=token,
        expires_at=expires_at,
        status=InviteStatus.PENDING,
        created_by_id=current_user.id
    )
    
    db.add(invite)
    db.flush()
    
    create_audit_log(
        db, current_user, "invite_created", "invite",
        entity_id=str(invite.id), entity_name=body.email,
        after_value={"email": body.email, "role": body.role, "team_id": body.team_id}
    )
    
    db.commit()
    db.refresh(invite)

    # Send invite email (non-blocking — failure does not roll back)
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    company_name = company.name if company else "your team"
    email_sent = send_invite_email(
        to_email=body.email,
        full_name=body.full_name,
        company_name=company_name,
        role=body.role,
        token=token,
    )
    if not email_sent:
        logger.warning("[INVITE] Email not sent for %s — SMTP not configured or failed", body.email)

    return {
        "id": invite.id,
        "email": invite.email,
        "email_sent": email_sent,
        "expires_at": expires_at.isoformat(),
        "message": f"Invite created for {body.email}"
    }


@router.post("/invites/{invite_id}/resend")
def resend_invite(
    invite_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Resend an invite (generates new token and extends expiry)"""
    invite = apply_company_scope(db.query(Invite), Invite, current_user).filter(Invite.id == invite_id).first()
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")
    
    if invite.status == InviteStatus.ACCEPTED:
        raise HTTPException(status_code=400, detail="Invite already accepted")
    
    # Generate new token and extend expiry
    old_token = invite.token
    invite.token = generate_invite_token()
    invite.expires_at = datetime.now() + timedelta(days=INVITE_EXPIRY_DAYS)
    invite.status = InviteStatus.PENDING
    
    create_audit_log(
        db, current_user, "invite_resent", "invite",
        entity_id=str(invite.id), entity_name=invite.email,
        before_value={"token": old_token[:8] + "...", "status": invite.status},
        after_value={"expires_at": invite.expires_at.isoformat()}
    )
    
    db.commit()

    # Resend invite email
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    company_name = company.name if company else "your team"
    email_sent = send_invite_email(
        to_email=invite.email,
        full_name=invite.full_name,
        company_name=company_name,
        role=invite.role,
        token=invite.token,
    )
    if not email_sent:
        logger.warning("[INVITE] Resend email not sent for %s", invite.email)

    return {
        "id": invite.id,
        "email": invite.email,
        "email_sent": email_sent,
        "expires_at": invite.expires_at.isoformat(),
        "message": f"Invite resent to {invite.email}"
    }


@router.delete("/invites/{invite_id}")
def cancel_invite(
    invite_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Cancel a pending invite"""
    invite = apply_company_scope(db.query(Invite), Invite, current_user).filter(Invite.id == invite_id).first()
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")
    
    if invite.status == InviteStatus.ACCEPTED:
        raise HTTPException(status_code=400, detail="Cannot cancel accepted invite")
    
    invite_email = invite.email
    invite.status = InviteStatus.CANCELLED
    
    create_audit_log(
        db, current_user, "invite_cancelled", "invite",
        entity_id=str(invite.id), entity_name=invite_email,
        before_value={"status": "pending"},
        after_value={"status": "cancelled"}
    )
    
    db.commit()
    
    return {"message": f"Invite for {invite_email} cancelled"}


@router.get("/invites/{invite_id}")
def get_invite(
    invite_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get invite details"""
    invite = apply_company_scope(db.query(Invite), Invite, current_user).filter(Invite.id == invite_id).first()
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")
    
    is_expired = invite.expires_at and datetime.now() > invite.expires_at
    display_status = "expired" if is_expired and invite.status == "pending" else invite.status
    
    return {
        "id": invite.id,
        "email": invite.email,
        "full_name": invite.full_name,
        "phone": invite.phone,
        "role": invite.role,
        "team_id": invite.team_id,
        "team_name": invite.team.name if invite.team else None,
        "manager_id": invite.manager_id,
        "manager_name": invite.manager.full_name if invite.manager else None,
        "status": display_status,
        "token": invite.token if invite.status == "pending" else None,
        "expires_at": invite.expires_at.isoformat() if invite.expires_at else None,
        "created_at": invite.created_at.isoformat() if invite.created_at else None,
        "created_by": invite.created_by.full_name if invite.created_by else None
    }

