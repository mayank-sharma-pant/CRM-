from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


# ===============================
# Dashboard Schemas
# ===============================

class DashboardStat(BaseModel):
    id: int
    label: str
    value: str
    route: str


class ActionItem(BaseModel):
    id: int
    type: str  # invite, reassign, hierarchy
    title: str
    link: str


class ActivityItem(BaseModel):
    id: int
    action: str
    entity: str
    time: str


class DashboardResponse(BaseModel):
    stats: List[DashboardStat]
    action_required: List[ActionItem]
    recent_activity: List[ActivityItem]


# ===============================
# User Management Schemas
# ===============================

class UserListItem(BaseModel):
    id: str
    name: str
    email: str
    phone: Optional[str] = None
    role: str
    team: Optional[str] = None
    status: str
    joined_at: str
    last_active: Optional[str] = None

    class Config:
        from_attributes = True


class UserListResponse(BaseModel):
    users: List[UserListItem]
    total: int
    skip: int = 0
    limit: int = 100


class UserUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    team_id: Optional[int] = None
    manager_id: Optional[int] = None
    status: Optional[str] = None


class InviteRequest(BaseModel):
    email: EmailStr
    full_name: str
    phone: Optional[str] = None
    role: str
    team_id: Optional[int] = None
    manager_id: Optional[int] = None


class InviteResponse(BaseModel):
    id: int
    email: str
    full_name: str
    status: str
    expires_at: datetime
    
    class Config:
        from_attributes = True


# ===============================
# Team Management Schemas
# ===============================

class TeamMember(BaseModel):
    id: str
    name: str
    role: str


class TeamResponse(BaseModel):
    id: int
    name: str
    manager: Optional[str] = None
    manager_id: Optional[str] = None
    members: List[TeamMember] = []
    
    class Config:
        from_attributes = True


class TeamListResponse(BaseModel):
    teams: List[TeamResponse]
    total: int = 0
    skip: int = 0
    limit: int = 100


class TeamCreate(BaseModel):
    name: str
    manager_id: Optional[int] = None


class TeamUpdate(BaseModel):
    name: Optional[str] = None
    manager_id: Optional[int] = None


class TeamMemberAdd(BaseModel):
    user_id: int


# ===============================
# Approval Schemas
# ===============================

class ApprovalItem(BaseModel):
    id: int
    name: str
    email: str
    phone: Optional[str] = None
    requested_role: str
    requested_team: Optional[str] = None
    submitted_at: str
    status: str


class ApprovalListResponse(BaseModel):
    approvals: List[ApprovalItem]
    total: int
    skip: int = 0
    limit: int = 100


class ApproveRequest(BaseModel):
    role: str
    team_id: Optional[int] = None
    manager_id: Optional[int] = None


class RejectRequest(BaseModel):
    reason: Optional[str] = None


# ===============================
# Hierarchy Schemas
# ===============================

class HierarchyMember(BaseModel):
    id: str
    name: str


class HierarchyManager(BaseModel):
    id: str
    name: str


class HierarchyTeam(BaseModel):
    id: int
    name: str
    manager: Optional[HierarchyManager] = None
    members: List[HierarchyMember] = []


class HierarchyResponse(BaseModel):
    teams: List[HierarchyTeam]
    total_teams: int
    total_managers: int
    total_members: int


class ReassignRequest(BaseModel):
    user_id: int
    target_team_id: int
    target_manager_id: Optional[int] = None


# ===============================
# Audit Schemas
# ===============================

class AuditLogItem(BaseModel):
    id: int
    timestamp: str
    admin: str
    action: str
    entity: str
    before: Optional[str] = None
    after: Optional[str] = None


class AuditLogResponse(BaseModel):
    logs: List[AuditLogItem]
    total: int
    skip: int = 0
    limit: int = 100


# ===============================
# Settings Schemas
# ===============================

class CompanySettingsResponse(BaseModel):
    company_name: str
    address: Optional[str] = None
    gst_number: Optional[str] = None
    logo_url: Optional[str] = None
    invoice_prefix: str
    tax_rate: float
    payment_terms: str
    lead_stages: List[str]
    lost_reasons: List[str]
    task_reminders_enabled: bool
    followup_alerts_enabled: bool


class CompanySettingsUpdate(BaseModel):
    company_name: Optional[str] = None
    address: Optional[str] = None
    gst_number: Optional[str] = None
    invoice_prefix: Optional[str] = None
    tax_rate: Optional[float] = None
    payment_terms: Optional[str] = None
    lead_stages: Optional[List[str]] = None
    lost_reasons: Optional[List[str]] = None
    task_reminders_enabled: Optional[bool] = None
    followup_alerts_enabled: Optional[bool] = None
