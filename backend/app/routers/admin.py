from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timedelta
import secrets
import json

from app.database import get_db
from app.utils.dependencies import require_admin
from app.models.user import User
from app.schemas.admin import (
    DashboardResponse, DashboardStat, ActionItem, ActivityItem,
    UserListItem, UserListResponse, UserUpdateRequest, InviteRequest, InviteResponse,
    TeamResponse, TeamListResponse, TeamCreate, TeamUpdate, TeamMemberAdd, TeamMember,
    ApprovalItem, ApprovalListResponse, ApproveRequest, RejectRequest,
    HierarchyResponse, HierarchyTeam, HierarchyManager, HierarchyMember, ReassignRequest,
    AuditLogItem, AuditLogResponse,
    CompanySettingsResponse, CompanySettingsUpdate
)

router = APIRouter()


# ===============================
# Dashboard Endpoints
# ===============================

@router.get("/dashboard/stats", response_model=DashboardResponse)
def get_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get admin dashboard with stats, action items, and recent activity"""
    # Mock data matching frontend expectations
    stats = [
        DashboardStat(id=1, label="Active Users", value="156", route="/admin/users"),
        DashboardStat(id=2, label="Pending Invites", value="8", route="/admin/users"),
        DashboardStat(id=3, label="Teams", value="8", route="/admin/teams-hierarchy"),
        DashboardStat(id=4, label="Disabled Users", value="12", route="/admin/users")
    ]
    
    action_required = [
        ActionItem(id=1, type="invite", title="3 invites expiring in 48h", link="/admin/users"),
        ActionItem(id=2, type="reassign", title="2 users need reassignment before deactivation", link="/admin/users"),
        ActionItem(id=3, type="hierarchy", title="1 team missing manager assignment", link="/admin/teams-hierarchy")
    ]
    
    recent_activity = [
        ActivityItem(id=1, action="User approved", entity="John Miller", time="30 min ago"),
        ActivityItem(id=2, action="Role changed", entity="Lisa Brown → Manager", time="2 hours ago"),
        ActivityItem(id=3, action="Team created", entity="Sales Delta", time="4 hours ago"),
        ActivityItem(id=4, action="User deactivated", entity="Mark Stevens", time="1 day ago"),
        ActivityItem(id=5, action="Team shift", entity="Alex Johnson → Sales Alpha", time="1 day ago"),
        ActivityItem(id=6, action="Invite sent", entity="Sarah Chen", time="2 days ago"),
        ActivityItem(id=7, action="Manager changed", entity="Sales Bravo → James Wilson", time="2 days ago"),
        ActivityItem(id=8, action="User approved", entity="Emily Davis", time="3 days ago"),
        ActivityItem(id=9, action="Role changed", entity="Mike Johnson → Sales Executive", time="3 days ago"),
        ActivityItem(id=10, action="Settings updated", entity="Pipeline stages", time="4 days ago")
    ]
    
    return DashboardResponse(
        stats=stats,
        action_required=action_required,
        recent_activity=recent_activity
    )


# ===============================
# Users Management Endpoints
# ===============================

@router.get("/users", response_model=UserListResponse)
def list_users(
    status: Optional[str] = Query(None, description="Filter by status: Active, Disabled, Invite Pending, Invite Expired"),
    role: Optional[str] = Query(None, description="Filter by role"),
    team: Optional[str] = Query(None, description="Filter by team"),
    search: Optional[str] = Query(None, description="Search by name, email, or ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """List all users with optional filters"""
    # Mock data matching frontend expectations
    users = [
        UserListItem(id="EMP001", name="Alex Johnson", email="alex.j@company.com", phone="+1 555-0101",
                     role="Sales Executive", team="Sales Alpha", status="Active", joined_at="2023-06-15", last_active="2024-01-18 09:30"),
        UserListItem(id="EMP002", name="Sarah Smith", email="sarah.s@company.com", phone="+1 555-0102",
                     role="Sales Executive", team="Sales Alpha", status="Active", joined_at="2023-07-20", last_active="2024-01-18 08:45"),
        UserListItem(id="INV001", name="John Miller", email="john.miller@example.com", phone="+1 555-0201",
                     role="Sales Executive", team="Sales Alpha", status="Invite Pending", joined_at="2024-01-17", last_active=None),
        UserListItem(id="INV002", name="Sarah Chen", email="sarah.chen@example.com", phone="+1 555-0202",
                     role="Manager", team=None, status="Invite Pending", joined_at="2024-01-17", last_active=None),
        UserListItem(id="EMP003", name="Mike Brown", email="mike.b@company.com", phone="+1 555-0103",
                     role="Manager", team="Sales Alpha", status="Active", joined_at="2023-05-10", last_active="2024-01-18 07:20"),
        UserListItem(id="INV003", name="Robert Wilson", email="r.wilson@example.com", phone="+1 555-0203",
                     role="Purchase", team=None, status="Invite Expired", joined_at="2024-01-10", last_active=None),
        UserListItem(id="EMP004", name="Emily Davis", email="emily.d@company.com", phone="+1 555-0104",
                     role="Sales Executive", team="Sales Bravo", status="Disabled", joined_at="2023-08-25", last_active="2023-12-20 16:00")
    ]
    
    # Apply filters
    filtered = users
    if status and status != "All":
        filtered = [u for u in filtered if u.status == status]
    if role and role != "All":
        filtered = [u for u in filtered if u.role == role]
    if team and team != "All":
        filtered = [u for u in filtered if u.team == team]
    if search:
        search_lower = search.lower()
        filtered = [u for u in filtered if 
                   search_lower in u.name.lower() or 
                   search_lower in u.email.lower() or 
                   search_lower in u.id.lower()]
    
    return UserListResponse(users=filtered, total=len(filtered))


@router.get("/users/{user_id}", response_model=UserListItem)
def get_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get user details by ID"""
    # Mock data
    users = {
        "EMP001": UserListItem(id="EMP001", name="Alex Johnson", email="alex.j@company.com", phone="+1 555-0101",
                               role="Sales Executive", team="Sales Alpha", status="Active", joined_at="2023-06-15", last_active="2024-01-18 09:30"),
        "EMP002": UserListItem(id="EMP002", name="Sarah Smith", email="sarah.s@company.com", phone="+1 555-0102",
                               role="Sales Executive", team="Sales Alpha", status="Active", joined_at="2023-07-20", last_active="2024-01-18 08:45"),
        "EMP003": UserListItem(id="EMP003", name="Mike Brown", email="mike.b@company.com", phone="+1 555-0103",
                               role="Manager", team="Sales Alpha", status="Active", joined_at="2023-05-10", last_active="2024-01-18 07:20"),
    }
    
    if user_id not in users:
        raise HTTPException(status_code=404, detail="User not found")
    
    return users[user_id]


@router.put("/users/{user_id}")
def update_user(
    user_id: str,
    update_data: UserUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Update user role, team, or status"""
    # Would update in database
    return {"message": f"User {user_id} updated successfully", "updates": update_data.dict(exclude_unset=True)}


@router.post("/users/invite", response_model=InviteResponse)
def invite_user(
    invite_data: InviteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Send invite to new user"""
    # Would create invite in database and send email
    return InviteResponse(
        id=1,
        email=invite_data.email,
        full_name=invite_data.full_name,
        status="pending",
        expires_at=datetime.now() + timedelta(days=7)
    )


@router.post("/users/{user_id}/resend-invite")
def resend_invite(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Resend expired invite"""
    return {"message": f"Invite resent for user {user_id}", "new_expires_at": (datetime.now() + timedelta(days=7)).isoformat()}


@router.delete("/users/{user_id}")
def disable_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Disable a user (soft delete)"""
    return {"message": f"User {user_id} has been disabled"}


# ===============================
# Teams Management Endpoints
# ===============================

@router.get("/teams", response_model=TeamListResponse)
def list_teams(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """List all teams with member counts"""
    teams = [
        TeamResponse(id=1, name="Sales Alpha", manager="Mike Brown", manager_id="EMP003", members=[
            TeamMember(id="EMP001", name="Alex Johnson", role="Sales Executive"),
            TeamMember(id="EMP002", name="Sarah Smith", role="Sales Executive")
        ]),
        TeamResponse(id=2, name="Sales Bravo", manager="James Wilson", manager_id="EMP004", members=[
            TeamMember(id="EMP005", name="Emily Davis", role="Sales Executive"),
            TeamMember(id="EMP010", name="Chris Anderson", role="Sales Executive")
        ]),
        TeamResponse(id=3, name="Sales Charlie", manager="Sarah Thompson", manager_id="EMP011", members=[
            TeamMember(id="EMP008", name="David Martinez", role="Sales Executive"),
            TeamMember(id="EMP012", name="Rachel Green", role="Sales Executive"),
            TeamMember(id="EMP013", name="Tom Wilson", role="Sales Executive")
        ]),
        TeamResponse(id=4, name="Enterprise", manager="Lisa Chen", manager_id="EMP014", members=[
            TeamMember(id="EMP015", name="Mark Stevens", role="Sales Executive")
        ])
    ]
    return TeamListResponse(teams=teams)


@router.post("/teams", response_model=TeamResponse)
def create_team(
    team_data: TeamCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Create a new team"""
    return TeamResponse(
        id=5,
        name=team_data.name,
        manager=None,
        manager_id=str(team_data.manager_id) if team_data.manager_id else None,
        members=[]
    )


@router.get("/teams/{team_id}", response_model=TeamResponse)
def get_team(
    team_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get team details with members"""
    teams = {
        1: TeamResponse(id=1, name="Sales Alpha", manager="Mike Brown", manager_id="EMP003", members=[
            TeamMember(id="EMP001", name="Alex Johnson", role="Sales Executive"),
            TeamMember(id="EMP002", name="Sarah Smith", role="Sales Executive")
        ]),
        2: TeamResponse(id=2, name="Sales Bravo", manager="James Wilson", manager_id="EMP004", members=[
            TeamMember(id="EMP005", name="Emily Davis", role="Sales Executive"),
            TeamMember(id="EMP010", name="Chris Anderson", role="Sales Executive")
        ])
    }
    
    if team_id not in teams:
        raise HTTPException(status_code=404, detail="Team not found")
    
    return teams[team_id]


@router.put("/teams/{team_id}", response_model=TeamResponse)
def update_team(
    team_id: int,
    team_data: TeamUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Update team name or manager"""
    return TeamResponse(
        id=team_id,
        name=team_data.name or "Updated Team",
        manager="New Manager" if team_data.manager_id else None,
        manager_id=str(team_data.manager_id) if team_data.manager_id else None,
        members=[]
    )


@router.delete("/teams/{team_id}")
def delete_team(
    team_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Delete a team (requires empty)"""
    return {"message": f"Team {team_id} deleted successfully"}


@router.post("/teams/{team_id}/members")
def add_team_member(
    team_id: int,
    member_data: TeamMemberAdd,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Add user to team"""
    return {"message": f"User {member_data.user_id} added to team {team_id}"}


@router.delete("/teams/{team_id}/members/{user_id}")
def remove_team_member(
    team_id: int,
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Remove user from team"""
    return {"message": f"User {user_id} removed from team {team_id}"}


# ===============================
# Approvals Endpoints
# ===============================

@router.get("/approvals", response_model=ApprovalListResponse)
def list_approvals(
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """List pending user registrations awaiting approval"""
    approvals = [
        ApprovalItem(id=1, name="John Miller", email="john.miller@example.com", phone="+1 555-0101",
                     requested_role="Sales Executive", requested_team="Sales Alpha", submitted_at="2024-01-15 09:30", status="Pending"),
        ApprovalItem(id=2, name="Sarah Chen", email="sarah.chen@example.com", phone="+1 555-0102",
                     requested_role="Manager", requested_team=None, submitted_at="2024-01-15 04:15", status="Pending"),
        ApprovalItem(id=3, name="Mike Johnson", email="mike.j@example.com", phone="+1 555-0103",
                     requested_role="Sales Executive", requested_team="Sales Bravo", submitted_at="2024-01-14 14:00", status="Pending"),
        ApprovalItem(id=4, name="Emily Davis", email="emily.d@example.com", phone="+1 555-0104",
                     requested_role="Sales Executive", requested_team=None, submitted_at="2024-01-14 11:30", status="Pending"),
        ApprovalItem(id=5, name="Robert Wilson", email="r.wilson@example.com", phone="+1 555-0105",
                     requested_role="Purchase", requested_team=None, submitted_at="2024-01-13 16:45", status="Pending"),
        ApprovalItem(id=6, name="Lisa Anderson", email="l.anderson@example.com", phone="+1 555-0106",
                     requested_role="Sales Executive", requested_team="Sales Alpha", submitted_at="2024-01-13 10:00", status="Pending")
    ]
    
    if search:
        search_lower = search.lower()
        approvals = [a for a in approvals if search_lower in a.name.lower() or search_lower in a.email.lower()]
    
    return ApprovalListResponse(approvals=approvals, total=len(approvals))


@router.post("/approvals/{approval_id}/approve")
def approve_user(
    approval_id: int,
    approval_data: ApproveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Approve pending user registration"""
    return {
        "message": f"User approved successfully",
        "approval_id": approval_id,
        "assigned_role": approval_data.role,
        "assigned_team_id": approval_data.team_id,
        "assigned_manager_id": approval_data.manager_id
    }


@router.post("/approvals/{approval_id}/reject")
def reject_user(
    approval_id: int,
    rejection_data: RejectRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Reject pending user registration"""
    return {
        "message": f"User rejected",
        "approval_id": approval_id,
        "reason": rejection_data.reason
    }


# ===============================
# Hierarchy Endpoints
# ===============================

@router.get("/hierarchy", response_model=HierarchyResponse)
def get_hierarchy(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get organization hierarchy tree"""
    teams = [
        HierarchyTeam(
            id=1,
            name="Sales Alpha",
            manager=HierarchyManager(id="EMP003", name="Mike Brown"),
            members=[
                HierarchyMember(id="EMP001", name="Alex Johnson"),
                HierarchyMember(id="EMP002", name="Sarah Smith")
            ]
        ),
        HierarchyTeam(
            id=2,
            name="Sales Bravo",
            manager=HierarchyManager(id="EMP004", name="James Wilson"),
            members=[
                HierarchyMember(id="EMP005", name="Emily Davis"),
                HierarchyMember(id="EMP010", name="Chris Anderson")
            ]
        ),
        HierarchyTeam(
            id=3,
            name="Sales Charlie",
            manager=HierarchyManager(id="EMP011", name="Sarah Thompson"),
            members=[
                HierarchyMember(id="EMP008", name="David Martinez"),
                HierarchyMember(id="EMP012", name="Rachel Green"),
                HierarchyMember(id="EMP013", name="Tom Wilson")
            ]
        ),
        HierarchyTeam(
            id=4,
            name="Enterprise",
            manager=HierarchyManager(id="EMP014", name="Lisa Chen"),
            members=[
                HierarchyMember(id="EMP015", name="Mark Stevens")
            ]
        )
    ]
    
    total_members = sum(len(t.members) for t in teams)
    
    return HierarchyResponse(
        teams=teams,
        total_teams=len(teams),
        total_managers=len(teams),
        total_members=total_members
    )


@router.post("/hierarchy/reassign")
def reassign_user(
    reassign_data: ReassignRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Reassign user to different team/manager"""
    return {
        "message": "User reassigned successfully",
        "user_id": reassign_data.user_id,
        "new_team_id": reassign_data.target_team_id,
        "new_manager_id": reassign_data.target_manager_id
    }


# ===============================
# Audit Endpoints
# ===============================

@router.get("/audit", response_model=AuditLogResponse)
def list_audit_logs(
    action: Optional[str] = Query(None, description="Filter by action type"),
    search: Optional[str] = Query(None, description="Search by entity or admin"),
    date_from: Optional[str] = Query(None, description="Start date filter"),
    date_to: Optional[str] = Query(None, description="End date filter"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get audit logs with filters"""
    logs = [
        AuditLogItem(id=1, timestamp="2024-01-18 10:30", admin="Admin", action="User approved", entity="John Miller", before="Pending", after="Active"),
        AuditLogItem(id=2, timestamp="2024-01-18 09:15", admin="Admin", action="Role changed", entity="Lisa Brown", before="Sales Executive", after="Manager"),
        AuditLogItem(id=3, timestamp="2024-01-18 08:45", admin="Admin", action="Team created", entity="Sales Delta", before=None, after="Created"),
        AuditLogItem(id=4, timestamp="2024-01-17 17:20", admin="Admin", action="User deactivated", entity="Mark Stevens", before="Active", after="Inactive"),
        AuditLogItem(id=5, timestamp="2024-01-17 15:10", admin="Admin", action="Team shift", entity="Alex Johnson", before="Sales Bravo", after="Sales Alpha"),
        AuditLogItem(id=6, timestamp="2024-01-17 14:00", admin="Admin", action="Manager changed", entity="Sales Alpha", before="James Wilson", after="Mike Brown"),
        AuditLogItem(id=7, timestamp="2024-01-17 11:30", admin="Admin", action="Invite sent", entity="Sarah Chen", before=None, after="Pending"),
        AuditLogItem(id=8, timestamp="2024-01-16 16:45", admin="Admin", action="User rejected", entity="Bob Wilson", before="Pending", after="Rejected"),
        AuditLogItem(id=9, timestamp="2024-01-16 14:20", admin="Admin", action="Settings updated", entity="Invoice prefix", before="INVOICE", after="INV"),
        AuditLogItem(id=10, timestamp="2024-01-16 10:00", admin="System", action="User created", entity="New Employee", before=None, after="Pending")
    ]
    
    if action and action != "All":
        logs = [l for l in logs if l.action == action]
    if search:
        search_lower = search.lower()
        logs = [l for l in logs if search_lower in l.entity.lower() or search_lower in l.admin.lower()]
    
    return AuditLogResponse(logs=logs, total=len(logs))


# ===============================
# Settings Endpoints
# ===============================

@router.get("/settings", response_model=CompanySettingsResponse)
def get_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get company-wide settings"""
    return CompanySettingsResponse(
        company_name="Enterprise Corp",
        address="123 Business St, City, State 12345",
        gst_number="GST123456789",
        logo_url=None,
        invoice_prefix="INV",
        tax_rate=18.0,
        payment_terms="Net 30 days",
        lead_stages=["New", "Contacted", "Qualified", "Proposal", "Won", "Lost"],
        lost_reasons=["No budget", "Timing not right", "Competitor", "No response"],
        task_reminders_enabled=True,
        followup_alerts_enabled=True
    )


@router.put("/settings", response_model=CompanySettingsResponse)
def update_settings(
    settings_data: CompanySettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Update company-wide settings"""
    # Would update in database
    # Return updated settings (using mock data + updates)
    return CompanySettingsResponse(
        company_name=settings_data.company_name or "Enterprise Corp",
        address=settings_data.address or "123 Business St, City, State 12345",
        gst_number=settings_data.gst_number or "GST123456789",
        logo_url=None,
        invoice_prefix=settings_data.invoice_prefix or "INV",
        tax_rate=settings_data.tax_rate if settings_data.tax_rate is not None else 18.0,
        payment_terms=settings_data.payment_terms or "Net 30 days",
        lead_stages=settings_data.lead_stages or ["New", "Contacted", "Qualified", "Proposal", "Won", "Lost"],
        lost_reasons=settings_data.lost_reasons or ["No budget", "Timing not right", "Competitor", "No response"],
        task_reminders_enabled=settings_data.task_reminders_enabled if settings_data.task_reminders_enabled is not None else True,
        followup_alerts_enabled=settings_data.followup_alerts_enabled if settings_data.followup_alerts_enabled is not None else True
    )


# ===============================
# Available Options Endpoints (for dropdowns)
# ===============================

@router.get("/options/roles")
def get_role_options(current_user: User = Depends(require_admin)):
    """Get available role options for dropdowns"""
    return {
        "roles": [
            {"value": "sales", "label": "Sales Executive"},
            {"value": "manager", "label": "Manager"},
            {"value": "md", "label": "Managing Director"},
            {"value": "purchase", "label": "Purchase"},
            {"value": "admin", "label": "Admin"}
        ]
    }


@router.get("/options/teams")
def get_team_options(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get available teams for dropdowns"""
    return {
        "teams": [
            {"id": 1, "name": "Sales Alpha"},
            {"id": 2, "name": "Sales Bravo"},
            {"id": 3, "name": "Sales Charlie"},
            {"id": 4, "name": "Enterprise"}
        ]
    }


@router.get("/options/managers")
def get_manager_options(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get available managers for dropdowns"""
    return {
        "managers": [
            {"id": "EMP003", "name": "Mike Brown"},
            {"id": "EMP004", "name": "James Wilson"},
            {"id": "EMP011", "name": "Sarah Thompson"},
            {"id": "EMP014", "name": "Lisa Chen"}
        ]
    }
