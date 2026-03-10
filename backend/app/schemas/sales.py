from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


# ===============================
# Lead Schemas
# ===============================

class LeadBase(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    source: Optional[str] = None
    service_type: Optional[str] = None
    notes: Optional[str] = None


class LeadCreate(LeadBase):
    assigned_to_id: Optional[int] = None


class LeadUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    status: Optional[str] = None
    source: Optional[str] = None
    service_type: Optional[str] = None
    notes: Optional[str] = None


class LeadResponse(LeadBase):
    id: int
    status: str = "New"
    created_at: Optional[str] = None
    last_contacted_at: Optional[str] = None
    last_response_at: Optional[str] = None
    next_task: Optional[str] = None
    assigned_to_id: Optional[int] = None
    assigned_to_name: Optional[str] = None

    class Config:
        from_attributes = True


class LeadListResponse(BaseModel):
    items: List[LeadResponse]
    total: int
    skip: int = 0
    limit: int = 100


# ===============================
# Task Schemas
# ===============================

class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: str
    entity_type: Optional[str] = None  # Lead, Client, General
    entity_id: Optional[int] = None
    entity_name: Optional[str] = None


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[str] = None
    status: Optional[str] = None


class TaskResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    dueDate: str
    status: str = "Pending"
    priority: Optional[str] = None
    entity: Optional[str] = None
    entityType: Optional[str] = None
    assignedBy: Optional[str] = None
    assigned_to_id: Optional[int] = None

    class Config:
        from_attributes = True


class TaskListResponse(BaseModel):
    items: List[TaskResponse]
    total: int
    skip: int = 0
    limit: int = 100


# ===============================
# Client Schemas
# ===============================

class ClientBase(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    address: Optional[str] = None


class ClientCreate(ClientBase):
    converted_from_lead_id: Optional[int] = None


class ClientUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    address: Optional[str] = None


class ClientResponse(ClientBase):
    id: int
    created_at: Optional[str] = None
    total_invoices: int = 0
    total_revenue: float = 0.0
    assigned_to_id: Optional[int] = None
    assigned_to_name: Optional[str] = None

    class Config:
        from_attributes = True


class ClientListResponse(BaseModel):
    items: List[ClientResponse]
    total: int
    skip: int = 0
    limit: int = 100


# ===============================
# Follow-up Schemas
# ===============================

class FollowUpCreate(BaseModel):
    lead_id: int
    scheduled_date: str
    scheduled_time: Optional[str] = None
    notes: Optional[str] = None


class FollowUpResponse(BaseModel):
    id: int
    lead_id: int
    lead_name: str
    scheduled_date: str
    scheduled_time: Optional[str] = None
    status: str = "Pending"
    notes: Optional[str] = None

    class Config:
        from_attributes = True


class FollowUpListResponse(BaseModel):
    items: List[FollowUpResponse]
    total: int
    skip: int = 0
    limit: int = 100


# ===============================
# Dashboard Metrics Schemas
# ===============================

class SalesDashboardMetrics(BaseModel):
    total_leads: int
    closed_leads: int
    lost_leads: int = 0
    conversion_rate: int


class SalesDashboardTask(BaseModel):
    id: int
    title: str
    dueDate: str
    statusReason: str  # 'OVERDUE', 'DUE_TODAY'


class SalesDashboardResponse(BaseModel):
    metrics: SalesDashboardMetrics
    priority_tasks: List[SalesDashboardTask]
    leadsByStatus: List[dict] = []
    leadsBySource: List[dict] = []


# ===============================
# Performance/Reports Schemas
# ===============================

class PerformanceMetric(BaseModel):
    period: str
    leads_created: int
    leads_converted: int
    conversion_rate: float
    revenue: float


class PerformanceResponse(BaseModel):
    current_period: PerformanceMetric
    previous_period: PerformanceMetric
    trend: str  # 'up', 'down', 'stable'
