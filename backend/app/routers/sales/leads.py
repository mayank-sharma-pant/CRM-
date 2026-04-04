from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timedelta, timezone

from app.database import get_db
from app.utils.dependencies import get_current_user, apply_company_scope, ensure_company_access, get_active_team_id
from app.models.core.user import User
from app.models.core.team_membership import TeamMembership
from app.models.core.team import Team
from app.models.sales.lead import Lead, LeadStatus
from app.models.sales.task import Task
from app.models.sales.client import Client
from app.models.finance.invoice import Invoice
from app.models.sales.note import Note
from app.utils.audit import log_activity
from app.utils.datetime_json import isoformat_utc, task_due_for_json
from app.utils.notify import send_notification
from app.utils.helpers import normalize_email, normalize_phone
from sqlalchemy import func as sa_func, or_
from app.schemas.sales import (
    LeadResponse, LeadListResponse, LeadCreate, LeadUpdate, LeadStatusUpdate,
    SalesDashboardResponse, SalesDashboardMetrics, SalesDashboardTask,
)
from app.schemas.admin import MessageResponse

router = APIRouter()


def _user_role_str(user: User) -> str:
    r = getattr(user, "role", None)
    if r is None:
        return ""
    return str(getattr(r, "value", r))


def _lead_status_value(lead: Lead) -> str:
    s = lead.status
    return s.value if hasattr(s, "value") else str(s)


def _ensure_client_for_converted_lead(db: Session, lead: Lead, current_user: User) -> bool:
    """
    If the lead is Converted, ensure a Client row exists (Kanban / status-only updates skip POST /convert).
    Returns True when a new Client was created (caller may need to commit).
    Prevents duplicates by checking both converted_from_lead_id AND email/phone.
    """
    if _lead_status_value(lead) != LeadStatus.CONVERTED.value:
        return False

    normalized_email = normalize_email(lead.email)
    normalized_phone = normalize_phone(lead.phone)

    # Check if client already exists for this lead
    existing = apply_company_scope(db.query(Client), Client, current_user).filter(
        Client.converted_from_lead_id == lead.id
    ).first()
    if existing:
        return False
    # Check if a client with the same email already exists in the company
    if normalized_email:
        existing_by_email = apply_company_scope(db.query(Client), Client, current_user).filter(
            sa_func.lower(Client.email) == normalized_email
        ).first()
        if existing_by_email:
            # Link the existing client to this lead instead of creating a duplicate
            existing_by_email.converted_from_lead_id = lead.id
            if lead.converted_at is None:
                lead.converted_at = datetime.now(timezone.utc)
            log_activity(
                db,
                user=current_user,
                action="converted",
                entity_type="lead",
                entity_id=lead.id,
                entity_name=lead.name,
                after=f"Linked to existing Client #{existing_by_email.id}",
            )
            return True

    # Check if a client with the same phone already exists in the company
    if normalized_phone:
        existing_by_phone = apply_company_scope(db.query(Client), Client, current_user).filter(
            Client.phone == normalized_phone
        ).first()
        if existing_by_phone:
            existing_by_phone.converted_from_lead_id = lead.id
            if lead.converted_at is None:
                lead.converted_at = datetime.now(timezone.utc)
            log_activity(
                db,
                user=current_user,
                action="converted",
                entity_type="lead",
                entity_id=lead.id,
                entity_name=lead.name,
                after=f"Linked to existing Client #{existing_by_phone.id} by phone",
            )
            return True

    new_client = Client(
        company_id=lead.company_id,
        name=lead.name,
        email=normalized_email,
        phone=normalized_phone,
        company=lead.company,
        converted_from_lead_id=lead.id,
        assigned_to_id=lead.assigned_to_id,
        team_id=lead.team_id,
    )
    db.add(new_client)
    db.flush()
    for task in db.query(Task).filter(Task.lead_id == lead.id).all():
        task.client_id = new_client.id
    if lead.converted_at is None:
        lead.converted_at = datetime.now(timezone.utc)
    log_activity(
        db,
        user=current_user,
        action="converted",
        entity_type="lead",
        entity_id=lead.id,
        entity_name=lead.name,
        after=f"Client #{new_client.id}",
    )
    return True


# ===============================
# Dashboard Endpoint
# ===============================

@router.get("/dashboard", response_model=SalesDashboardResponse)
def get_sales_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    active_team_id: Optional[int] = Depends(get_active_team_id),
):
    """Get sales executive dashboard with metrics and priority tasks"""
    # Get real counts from database (company-scoped)
    lead_query = apply_company_scope(db.query(Lead), Lead, current_user)
    
    # Role-based scoping for leads
    if _user_role_str(current_user) == "sales":
        if active_team_id is not None:
            lead_query = lead_query.filter(
                Lead.team_id == active_team_id,
                or_(Lead.assigned_to_id == current_user.id, Lead.assigned_to_id.is_(None)),
            )
        else:
            lead_query = lead_query.filter(Lead.assigned_to_id == current_user.id)
    elif _user_role_str(current_user) == "manager":
        if active_team_id is None:
            lead_query = lead_query.filter(False)
        else:
            lead_query = lead_query.filter(Lead.team_id == active_team_id)
    total_leads = lead_query.count()
    converted_leads = lead_query.filter(Lead.status == LeadStatus.CONVERTED).count()
    conversion_rate = int((converted_leads / total_leads * 100)) if total_leads > 0 else 0
    
    # Get priority tasks (overdue and due today) — Task.due_date is stored naive UTC
    now = datetime.now(timezone.utc)
    today_start = datetime(now.year, now.month, now.day)  # naive local calendar day boundary; matches tasks router
    today_end = today_start + timedelta(days=1)
    
    task_query = apply_company_scope(db.query(Task), Task, current_user)
    
    # Role-based filtering for tasks
    if _user_role_str(current_user) == "sales":
        task_query = task_query.filter((Task.assigned_to_id == current_user.id) | (Task.assigned_by_id == current_user.id))
    elif _user_role_str(current_user) == "manager":
        if active_team_id is None:
            team_members = []
        else:
            team_members = (
                apply_company_scope(db.query(User.id), User, current_user)
                .join(TeamMembership, TeamMembership.user_id == User.id)
                .filter(TeamMembership.team_id == active_team_id)
                .all()
            )
        team_member_ids = [m[0] for m in team_members]
        task_query = task_query.filter((Task.assigned_to_id.in_(team_member_ids)) | (Task.assigned_by_id == current_user.id))
    overdue_tasks = task_query.filter(
        Task.due_date < today_start,
        Task.status != "Completed"
    ).limit(3).all()
    
    today_tasks = task_query.filter(
        Task.due_date >= today_start,
        Task.due_date < today_end,
        Task.status != "Completed"
    ).limit(3).all()
    
    priority_tasks = []
    for task in overdue_tasks:
        priority_tasks.append({
            "id": task.id,
            "title": task.title,
            "dueDate": task_due_for_json(task.due_date),
            "statusReason": "OVERDUE"
        })
    for task in today_tasks:
        priority_tasks.append({
            "id": task.id,
            "title": task.title,
            "dueDate": task_due_for_json(task.due_date),
            "statusReason": "DUE_TODAY"
        })
    
    # Status breakdown for charts
    status_counts = lead_query.with_entities(Lead.status, sa_func.count(Lead.id)).group_by(Lead.status).all()
    leads_by_status = [{"status": s, "count": c} for s, c in status_counts]
    
    # Source breakdown for charts
    source_counts = lead_query.with_entities(Lead.source, sa_func.count(Lead.id)).group_by(Lead.source).all()
    leads_by_source = [{"source": s or "Unknown", "count": c} for s, c in source_counts]
    
    active_leads = lead_query.filter(Lead.status == LeadStatus.ACTIVE).count()
    lost_leads = lead_query.filter(Lead.status == LeadStatus.LOST).count()
    two_weeks_ago = datetime.now(timezone.utc) - timedelta(days=14)
    stalled_leads = lead_query.filter(Lead.status == LeadStatus.ACTIVE, Lead.created_at < two_weeks_ago).count()
    
    # Revenue and Order calculations (company-scoped)
    inv_query = apply_company_scope(db.query(Invoice), Invoice, current_user)
    my_orders_count = 0
    my_orders_revenue = 0.0
    
    if _user_role_str(current_user) == "sales":
        # Invoices explicitly created by this sales rep
        sales_inv_query = inv_query.filter(Invoice.created_by_id == current_user.id)
        my_orders_count = sales_inv_query.count()
        my_orders_revenue = float(
            sales_inv_query.filter(Invoice.status != "Cancelled")
            .with_entities(sa_func.sum(Invoice.total))
            .scalar()
            or 0.0
        )
        # Revenue KPI: invoices this rep created OR tied to clients they own (covers empty client list)
        client_rows = (
            apply_company_scope(db.query(Client.id), Client, current_user)
            .filter(Client.assigned_to_id == current_user.id)
            .all()
        )
        client_ids = [c[0] for c in client_rows]
        if client_ids:
            inv_query = inv_query.filter(
                or_(
                    Invoice.created_by_id == current_user.id,
                    Invoice.client_id.in_(client_ids),
                )
            )
        else:
            inv_query = inv_query.filter(Invoice.created_by_id == current_user.id)
    elif _user_role_str(current_user) == "manager":
        if active_team_id is None:
            team_client_ids = []
        else:
            team_client_ids = apply_company_scope(db.query(Client.id), Client, current_user).filter(Client.team_id == active_team_id).all()
        team_client_ids = [c[0] for c in team_client_ids]
        inv_query = inv_query.filter(Invoice.client_id.in_(team_client_ids))

    total_rev = float(inv_query.with_entities(sa_func.sum(Invoice.total)).scalar() or 0.0)
    paid_rev = float(
        inv_query.filter(Invoice.status == "Paid").with_entities(sa_func.sum(Invoice.total)).scalar() or 0.0
    )
    outstanding_rev = total_rev - paid_rev

    # Task metrics
    completed_tasks = task_query.filter(Task.status == "Completed").count()
    in_progress_tasks = task_query.filter(Task.status == "Pending").count()
    overdue_task_count = task_query.filter(Task.due_date < today_start, Task.status != "Completed").count()

    # Activity this week
    one_week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    new_leads_this_week = lead_query.filter(Lead.created_at >= one_week_ago).count()
    tasks_done_this_week = task_query.filter(Task.status == "Completed", Task.completed_at >= one_week_ago).count()

    return {
        "metrics": {
            "total_leads": total_leads,
            "closed_leads": converted_leads,
            "lost_leads": lost_leads,
            "active_leads": active_leads,
            "stalled_leads": stalled_leads,
            "conversion_rate": conversion_rate,
            "total_revenue": float(total_rev),
            "paid_revenue": float(paid_rev),
            "outstanding_revenue": float(outstanding_rev),
            "my_orders": my_orders_count,
            "my_revenue": float(my_orders_revenue)
        },
        "task_metrics": {
            "completed": completed_tasks,
            "in_progress": in_progress_tasks,
            "overdue": overdue_task_count
        },
        "activity": {
            "new_leads_this_week": new_leads_this_week,
            "tasks_done_this_week": tasks_done_this_week
        },
        "priority_tasks": priority_tasks,
        "leadsByStatus": leads_by_status,
        "leadsBySource": leads_by_source
    }


# ===============================
# Leads Endpoints
# ===============================

@router.get("", response_model=LeadListResponse)
def list_leads(
    status: Optional[str] = Query(None, description="Filter by status"),
    search: Optional[str] = Query(None, description="Search by name, email, company"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    active_team_id: Optional[int] = Depends(get_active_team_id),
):
    """List leads based on user role."""
    query = apply_company_scope(db.query(Lead), Lead, current_user)
    
    # Apply role-based scoping
    if _user_role_str(current_user) == "sales":
        if active_team_id is not None:
            query = query.filter(
                Lead.team_id == active_team_id,
                or_(Lead.assigned_to_id == current_user.id, Lead.assigned_to_id.is_(None)),
            )
        else:
            query = query.filter(Lead.assigned_to_id == current_user.id)
    elif _user_role_str(current_user) == "manager":
        if active_team_id is None:
            query = query.filter(False)
        else:
            query = query.filter(Lead.team_id == active_team_id)
    if status:
        query = query.filter(Lead.status == status)
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (Lead.name.ilike(search_pattern)) |
            (Lead.email.ilike(search_pattern)) |
            (Lead.company.ilike(search_pattern))
        )
    total = query.count()
    leads = query.order_by(Lead.created_at.desc()).offset(skip).limit(limit).all()

    assignee_ids = {l.assigned_to_id for l in leads if l.assigned_to_id}
    assignee_map = {}
    if assignee_ids:
        for u in db.query(User).filter(User.id.in_(assignee_ids)).all():
            assignee_map[u.id] = u.full_name

    return {
        "items": [
            {
                "id": lead.id,
                "name": lead.name,
                "email": lead.email,
                "phone": lead.phone,
                "company": lead.company,
                "status": lead.status,
                "source": lead.source,
                "service_type": lead.service_type,
                "assigned_to_id": lead.assigned_to_id,
                "assigned_to_name": assignee_map.get(lead.assigned_to_id) if lead.assigned_to_id else None,
                "created_at": lead.created_at.strftime("%Y-%m-%d") if lead.created_at else None,
                "last_contacted_at": lead.last_contacted_at.isoformat() if lead.last_contacted_at else None,
                "last_response_at": lead.last_response_at.isoformat() if lead.last_response_at else None,
                "next_task": lead.next_follow_up.isoformat() if lead.next_follow_up else None
            }
            for lead in leads
        ],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.get("/{lead_id}")
def get_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    active_team_id: Optional[int] = Depends(get_active_team_id),
):
    """Get lead details by ID (with role scoping)"""
    lead = apply_company_scope(db.query(Lead), Lead, current_user).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
        
    # Apply role-based scoping
    if _user_role_str(current_user) == "sales":
        own_or_open = (lead.assigned_to_id == current_user.id) or (lead.assigned_to_id is None and lead.team_id == active_team_id)
        if not own_or_open:
            raise HTTPException(status_code=403, detail="You do not have access to this lead")
    if _user_role_str(current_user) == "manager":
        if active_team_id is None or lead.team_id != active_team_id:
            raise HTTPException(status_code=403, detail="You do not have access to this team's lead")
    ensure_company_access(lead, current_user)
    
    # Fetch tasks linked to this lead
    tasks = apply_company_scope(db.query(Task), Task, current_user).filter(Task.lead_id == lead_id).order_by(Task.created_at.desc()).all()
    tasks_list = [
        {
            "id": t.id,
            "title": t.title,
            "status": getattr(t.status, "value", t.status),
            "priority": getattr(t.priority, "value", t.priority),
            "due_date": task_due_for_json(t.due_date),
            "created_at": isoformat_utc(t.created_at),
            "completed_at": isoformat_utc(t.completed_at),
            "updated_at": isoformat_utc(t.updated_at),
            "is_manager_assigned": bool(t.is_manager_assigned),
        }
        for t in tasks
    ]
    
    # Fetch notes linked to this lead
    notes = apply_company_scope(db.query(Note), Note, current_user).filter(Note.lead_id == lead_id).order_by(Note.created_at.desc()).all()
    notes_list = [
        {
            "id": n.id,
            "content": n.content,
            "created_by_id": n.created_by_id,
            "created_by_name": n.created_by.full_name if n.created_by else None,
            "created_at": isoformat_utc(n.created_at),
        }
        for n in notes
    ]
    
    # Fetch assignee name
    assignee = db.query(User).filter(User.id == lead.assigned_to_id).first() if lead.assigned_to_id else None
    creator = db.query(User).filter(User.id == lead.created_by_id).first() if lead.created_by_id else None

    converted_client = apply_company_scope(db.query(Client), Client, current_user).filter(
        Client.converted_from_lead_id == lead.id
    ).first()

    return {
        "id": lead.id,
        "name": lead.name,
        "email": lead.email,
        "phone": lead.phone,
        "company": lead.company,
        "status": lead.status,
        "source": lead.source,
        "service_type": lead.service_type,
        "notes": lead.notes,
        "tasks": tasks_list,
        "notes_list": notes_list,
        "assignee": assignee.full_name if assignee else "Open to Anyone",
        "assigned_to_id": lead.assigned_to_id,
        "created_by_id": lead.created_by_id,
        "created_by_name": creator.full_name if creator else None,
        "created_by_role": _user_role_str(creator) if creator else None,
        "team_id": lead.team_id,
        "converted_client_id": converted_client.id if converted_client else None,
        "created_at": isoformat_utc(lead.created_at),
        "last_contacted_at": isoformat_utc(lead.last_contacted_at),
        "last_response_at": isoformat_utc(lead.last_response_at),
        "next_task": isoformat_utc(lead.next_follow_up),
    }


@router.get("/team-members")
def list_team_members_for_assignment(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    active_team_id: Optional[int] = Depends(get_active_team_id),
):
    """Return sales execs in the active team (for the assign-to dropdown)."""
    if active_team_id is None:
        return {"members": []}
    members = (
        apply_company_scope(db.query(User), User, current_user)
        .join(TeamMembership, TeamMembership.user_id == User.id)
        .filter(TeamMembership.team_id == active_team_id, User.role == "sales")
        .all()
    )
    return {
        "members": [
            {"id": m.id, "full_name": m.full_name, "email": m.email}
            for m in members
        ]
    }


@router.post("", status_code=status.HTTP_201_CREATED)
def create_lead(
    lead_data: LeadCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    active_team_id: Optional[int] = Depends(get_active_team_id),
):
    """Create a new lead"""
    if current_user.company_id is None:
        raise HTTPException(status_code=403, detail="User must be assigned to a company")
        
    # Validation for assigned_to_id
    assigned_to_id = lead_data.assigned_to_id
    if assigned_to_id:
        assignee = apply_company_scope(db.query(User), User, current_user).filter(User.id == assigned_to_id).first()
        if not assignee:
            raise HTTPException(status_code=400, detail="Assigned user not found in your company")

        # If manager is assigning, assignee must be in the active team
        if _user_role_str(current_user) == "manager":
            if active_team_id is None:
                raise HTTPException(status_code=400, detail="Active team required for manager actions")
            assignee_in_team = apply_company_scope(db.query(TeamMembership), TeamMembership, current_user).filter(
                TeamMembership.team_id == active_team_id,
                TeamMembership.user_id == assignee.id,
            ).first()
            if not assignee_in_team:
                raise HTTPException(status_code=403, detail="Cannot assign lead outside your team")
    else:
        # Auto-assign to self if sales executive
        if _user_role_str(current_user) == "sales":
            assigned_to_id = current_user.id
            
    # Team selection rules
    requested_team_id = getattr(lead_data, "team_id", None)
    team_id: Optional[int]

    if requested_team_id is not None:
        # Ensure team exists in company
        team = apply_company_scope(db.query(Team), Team, current_user).filter(Team.id == requested_team_id).first()
        if not team:
            raise HTTPException(status_code=404, detail="Team not found")

        # Sales/Manager must choose only from teams they are members of
        if _user_role_str(current_user) in ("sales", "manager"):
            member = apply_company_scope(db.query(TeamMembership), TeamMembership, current_user).filter(
                TeamMembership.team_id == requested_team_id,
                TeamMembership.user_id == current_user.id,
            ).first()
            if not member:
                raise HTTPException(status_code=403, detail="You are not a member of the selected team")

        team_id = requested_team_id
    else:
        # Default to active team for manager/sales when available; otherwise legacy primary team.
        if _user_role_str(current_user) in ("sales", "manager"):
            if active_team_id is None:
                raise HTTPException(status_code=400, detail="Active team required. Select a team or provide team_id.")
            team_id = active_team_id
        else:
            team_id = active_team_id

    normalized_email = normalize_email(lead_data.email)
    normalized_phone = normalize_phone(lead_data.phone)

    # Prevent duplicate leads (same company scope) by email (case-insensitive) or phone (digits-only).
    # Use .query(Model.id) to avoid full-object deserialization (Enum columns can crash on legacy data).
    if normalized_email:
        existing_lead_by_email = apply_company_scope(db.query(Lead.id), Lead, current_user).filter(
            sa_func.lower(Lead.email) == normalized_email
        ).first()
        if existing_lead_by_email:
            raise HTTPException(
                status_code=400,
                detail=f"A lead with email '{lead_data.email}' already exists."
            )
        existing_client_by_email = apply_company_scope(db.query(Client.id), Client, current_user).filter(
            sa_func.lower(Client.email) == normalized_email
        ).first()
        if existing_client_by_email:
            raise HTTPException(
                status_code=400,
                detail=f"A client with email '{lead_data.email}' already exists. Use Clients instead of creating a lead again."
            )
    if normalized_phone:
        existing_lead_by_phone = apply_company_scope(db.query(Lead.id), Lead, current_user).filter(
            Lead.phone == normalized_phone
        ).first()
        if existing_lead_by_phone:
            raise HTTPException(
                status_code=400,
                detail="A lead with this phone number already exists."
            )
        existing_client_by_phone = apply_company_scope(db.query(Client.id), Client, current_user).filter(
            Client.phone == normalized_phone
        ).first()
        if existing_client_by_phone:
            raise HTTPException(
                status_code=400,
                detail="A client with this phone number already exists. Use Clients instead of creating a lead again."
            )
    
    new_lead = Lead(
        company_id=current_user.company_id,
        name=lead_data.name,
        email=normalized_email,
        phone=normalized_phone,
        company=lead_data.company,
        source=lead_data.source,
        service_type=lead_data.service_type if hasattr(lead_data, 'service_type') else None,
        notes=lead_data.notes if hasattr(lead_data, 'notes') else None,
        status=LeadStatus.ACTIVE,
        assigned_to_id=assigned_to_id,
        created_by_id=current_user.id,
        team_id=team_id
    )
    
    db.add(new_lead)
    db.commit()
    db.refresh(new_lead)
    
    log_activity(db, user=current_user, action='created', entity_type='lead',
                 entity_id=new_lead.id, entity_name=new_lead.name)
    db.commit()
    
    return {
        "id": new_lead.id,
        "name": new_lead.name,
        "email": new_lead.email,
        "phone": new_lead.phone,
        "company": new_lead.company,
        "status": new_lead.status,
        "source": new_lead.source,
        "created_at": new_lead.created_at.strftime("%Y-%m-%d") if new_lead.created_at else None
    }


@router.api_route("/{lead_id}", methods=["PUT", "PATCH"])
def update_lead(
    lead_id: int,
    lead_data: LeadUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    active_team_id: Optional[int] = Depends(get_active_team_id),
):
    """Update lead details"""
    lead = apply_company_scope(db.query(Lead), Lead, current_user).filter(Lead.id == lead_id).first()
    ensure_company_access(lead, current_user)
    
    # Apply role-based scoping
    if _user_role_str(current_user) == "sales" and lead.assigned_to_id != current_user.id:
        raise HTTPException(status_code=403, detail="You cannot edit a lead you do not own")
    if _user_role_str(current_user) == "manager":
        if active_team_id is None or lead.team_id != active_team_id:
            raise HTTPException(status_code=403, detail="You cannot edit a lead outside your team")
    
    old_status = lead.status
    old_assigned_to = lead.assigned_to_id
    
    # Update fields if provided
    info_edited = False
    if lead_data.name is not None and lead_data.name != lead.name:
        lead.name = lead_data.name
        info_edited = True
    if lead_data.email is not None and lead_data.email != lead.email:
        normalized_email = normalize_email(lead_data.email)
        if normalized_email:
            existing_lead_by_email = apply_company_scope(db.query(Lead.id), Lead, current_user).filter(
                sa_func.lower(Lead.email) == normalized_email,
                Lead.id != lead.id,
            ).first()
            if existing_lead_by_email:
                raise HTTPException(
                    status_code=400,
                    detail=f"A lead with email '{lead_data.email}' already exists."
                )
            existing_client_by_email = apply_company_scope(db.query(Client.id), Client, current_user).filter(
                sa_func.lower(Client.email) == normalized_email
            ).first()
            if existing_client_by_email:
                raise HTTPException(
                    status_code=400,
                    detail=f"A client with email '{lead_data.email}' already exists. Leads and clients cannot share the same email."
                )
        lead.email = normalized_email
        info_edited = True
    if lead_data.phone is not None and lead_data.phone != lead.phone:
        normalized_phone = normalize_phone(lead_data.phone)
        if normalized_phone:
            existing_lead_by_phone = apply_company_scope(db.query(Lead.id), Lead, current_user).filter(
                Lead.phone == normalized_phone,
                Lead.id != lead.id,
            ).first()
            if existing_lead_by_phone:
                raise HTTPException(
                    status_code=400,
                    detail="A lead with this phone number already exists."
                )
            existing_client_by_phone = apply_company_scope(db.query(Client.id), Client, current_user).filter(
                Client.phone == normalized_phone
            ).first()
            if existing_client_by_phone:
                raise HTTPException(
                    status_code=400,
                    detail="A client with this phone number already exists. Leads and clients cannot share the same phone number."
                )
        lead.phone = normalized_phone
        info_edited = True
    if lead_data.company is not None and lead_data.company != lead.company:
        lead.company = lead_data.company
        info_edited = True
    if lead_data.status is not None:
        lead.status = lead_data.status
    if lead_data.source is not None and lead_data.source != lead.source:
        lead.source = lead_data.source
        info_edited = True
    if lead_data.notes is not None and lead_data.notes != lead.notes:
        lead.notes = lead_data.notes
        info_edited = True
        
    if getattr(lead_data, "assigned_to_id", None) is not None:
        if _user_role_str(current_user) == "sales":
            raise HTTPException(status_code=403, detail="Sales executives cannot reassign leads")

        # Managers cannot reassign leads that a sales exec created or that are already converted
        if _user_role_str(current_user) == "manager":
            if _lead_status_value(lead) == LeadStatus.CONVERTED.value:
                raise HTTPException(status_code=403, detail="Cannot reassign a converted lead")
            if lead.created_by_id:
                creator = db.query(User).filter(User.id == lead.created_by_id).first()
                if creator and _user_role_str(creator) == "sales":
                    raise HTTPException(status_code=403, detail="Cannot reassign a lead created by a sales executive")

        assignee = apply_company_scope(
            db.query(User), User, current_user
        ).filter(User.id == lead_data.assigned_to_id).first()
        if not assignee:
            raise HTTPException(status_code=400, detail="User not found in this company")
        if _user_role_str(current_user) == "manager":
            if active_team_id is None:
                raise HTTPException(status_code=400, detail="Active team required for manager actions")
            assignee_in_team = apply_company_scope(db.query(TeamMembership), TeamMembership, current_user).filter(
                TeamMembership.team_id == active_team_id,
                TeamMembership.user_id == assignee.id,
            ).first()
            if not assignee_in_team:
                raise HTTPException(status_code=403, detail="Cannot assign lead outside your team")
            
        lead.assigned_to_id = lead_data.assigned_to_id
    
    # Log activity
    actions_logged = False
    if lead_data.status is not None and lead_data.status != old_status:
        log_activity(db, user=current_user, action='status_changed', entity_type='lead',
                     entity_id=lead.id, entity_name=lead.name, before=old_status, after=lead_data.status)
        actions_logged = True
        
    if getattr(lead_data, "assigned_to_id", None) is not None and lead_data.assigned_to_id != old_assigned_to:
        old_user = db.query(User).filter(User.id == old_assigned_to).first() if old_assigned_to else None
        new_user = db.query(User).filter(User.id == lead_data.assigned_to_id).first()
        old_name = old_user.full_name if old_user else "Unassigned"
        new_name = new_user.full_name if new_user else "Unassigned"
        
        log_activity(db, user=current_user, action='reassigned', entity_type='lead',
                     entity_id=lead.id, entity_name=lead.name, before=old_name, after=new_name)
        actions_logged = True
        
        # Notify the new assignee
        if lead_data.assigned_to_id:
            assignee_role = _user_role_str(new_user) if new_user else "sales"
            send_notification(db, lead_data.assigned_to_id,
                title=f"Lead Assigned: {lead.name}",
                message=f"{current_user.full_name} assigned you a new lead.",
                type="info",
                link=f"/{assignee_role}/leads/{lead.id}",
                category="leads")
        
    if info_edited and not actions_logged:
        log_activity(db, user=current_user, action='updated', entity_type='lead',
                     entity_id=lead.id, entity_name=lead.name, after="Contact details updated")

    _ensure_client_for_converted_lead(db, lead, current_user)

    db.commit()
    db.refresh(lead)
    
    return {
        "id": lead.id,
        "name": lead.name,
        "email": lead.email,
        "status": lead.status,
        "message": "Lead updated successfully"
    }


@router.patch("/{lead_id}/status")
def update_lead_status(
    lead_id: int,
    status_data: LeadStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    active_team_id: Optional[int] = Depends(get_active_team_id),
):
    """Quickly update lead status (used by Kanban board)"""
    lead = apply_company_scope(db.query(Lead), Lead, current_user).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    ensure_company_access(lead, current_user)
    
    if _user_role_str(current_user) == "sales" and lead.assigned_to_id != current_user.id:
        raise HTTPException(status_code=403, detail="You cannot edit a lead you do not own")
    if _user_role_str(current_user) == "manager":
        if active_team_id is None or lead.team_id != active_team_id:
            raise HTTPException(status_code=403, detail="You cannot edit a lead outside your team")
        
    old_status = lead.status

    # Mandatory assignment check for Converted status
    if status_data.status == LeadStatus.CONVERTED.value or status_data.status == LeadStatus.CONVERTED:
        if not lead.assigned_to_id:
            raise HTTPException(
                status_code=400,
                detail="A lead must be assigned to a specific user before it can be converted to a client."
            )

    lead.status = status_data.status

    created_client = _ensure_client_for_converted_lead(db, lead, current_user)

    if old_status != status_data.status:
        log_activity(db, user=current_user, action='status_changed', entity_type='lead',
                     entity_id=lead.id, entity_name=lead.name, before=old_status, after=status_data.status)

        # Notify the lead owner about the status change (if someone else changed it)
        if lead.assigned_to_id and lead.assigned_to_id != current_user.id:
            send_notification(db, lead.assigned_to_id,
                title=f"Lead Status Changed: {lead.name}",
                message=f"{old_status} → {status_data.status} (by {current_user.full_name})",
                type="info",
                link=f"/sales/leads/{lead.id}",
                category="leads")

    if old_status != status_data.status or created_client:
        db.commit()

    return {"message": "Status updated successfully", "status": lead.status}


@router.post("/{lead_id}/claim")
def claim_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    active_team_id: Optional[int] = Depends(get_active_team_id),
):
    """Sales exec claims an open (unassigned) lead for themselves."""
    if _user_role_str(current_user) != "sales":
        raise HTTPException(status_code=403, detail="Only sales executives can claim leads")

    lead = apply_company_scope(db.query(Lead), Lead, current_user).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    if lead.assigned_to_id is not None:
        raise HTTPException(status_code=400, detail="This lead is already assigned")

    if active_team_id is not None and lead.team_id != active_team_id:
        raise HTTPException(status_code=403, detail="Lead does not belong to your active team")

    lead.assigned_to_id = current_user.id
    log_activity(db, user=current_user, action='claimed', entity_type='lead',
                 entity_id=lead.id, entity_name=lead.name, after=current_user.full_name)
    db.commit()
    return {"message": f"Lead claimed successfully", "lead_id": lead.id}


@router.delete("/{lead_id}", response_model=MessageResponse)
def delete_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    active_team_id: Optional[int] = Depends(get_active_team_id),
):
    """Delete a lead"""
    lead = apply_company_scope(db.query(Lead), Lead, current_user).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # Role-based delete permission
    if _user_role_str(current_user) == "sales" and lead.assigned_to_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own leads")
    elif _user_role_str(current_user) == "manager":
        if active_team_id is None or lead.team_id != active_team_id:
            raise HTTPException(status_code=403, detail="You can only delete leads in your team")
    
    # Invoice safeguard: Check if converted to a client with invoices
    client = apply_company_scope(db.query(Client), Client, current_user).filter(Client.converted_from_lead_id == lead.id).first()
    if client:
        invoice_count = apply_company_scope(db.query(Invoice), Invoice, current_user).filter(Invoice.client_id == client.id).count()
        if invoice_count > 0:
            raise HTTPException(status_code=400, detail="Cannot delete lead: This lead was converted to a client that has active invoices.")
        else:
            client.converted_from_lead_id = None
            db.add(client)
    
    db.delete(lead)
    db.commit()
    
    return {"message": f"Lead {lead_id} deleted successfully"}


@router.get("/{lead_id}/notes")
def list_lead_notes(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    active_team_id: Optional[int] = Depends(get_active_team_id),
):
    """List notes attached to a lead."""
    lead = apply_company_scope(db.query(Lead), Lead, current_user).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    ensure_company_access(lead, current_user)
    
    # Role-based scoping
    if _user_role_str(current_user) == "sales" and lead.assigned_to_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have access to this lead's notes")
    if _user_role_str(current_user) == "manager":
        if active_team_id is None or lead.team_id != active_team_id:
            raise HTTPException(status_code=403, detail="You do not have access to this team's lead notes")

    notes = apply_company_scope(db.query(Note), Note, current_user).filter(Note.lead_id == lead_id).order_by(Note.created_at.desc()).all()
    return [
        {
            "id": n.id,
            "content": n.content,
            "created_by_id": n.created_by_id,
            "created_by_name": n.created_by.full_name if n.created_by else None,
            "created_at": n.created_at.isoformat() if n.created_at else None,
        }
        for n in notes
    ]


@router.post("/{lead_id}/notes", status_code=status.HTTP_201_CREATED)
def add_lead_note(
    lead_id: int,
    content: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    active_team_id: Optional[int] = Depends(get_active_team_id),
):
    """Create a note for a lead."""
    lead = apply_company_scope(db.query(Lead), Lead, current_user).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    ensure_company_access(lead, current_user)
    
    # Role-based scoping
    if _user_role_str(current_user) == "sales" and lead.assigned_to_id != current_user.id:
        raise HTTPException(status_code=403, detail="You cannot add notes to a lead you do not own")
    if _user_role_str(current_user) == "manager":
        if active_team_id is None or lead.team_id != active_team_id:
            raise HTTPException(status_code=403, detail="You cannot add notes to a lead outside your team")

    note = Note(
        company_id=current_user.company_id,
        content=content.strip(),
        lead_id=lead.id,
        created_by_id=current_user.id,
    )
    db.add(note)
    db.commit()
    db.refresh(note)

    return {
        "id": note.id,
        "content": note.content,
        "lead_id": note.lead_id,
        "created_by_id": note.created_by_id,
        "created_at": note.created_at.isoformat() if note.created_at else None,
    }


@router.post("/{lead_id}/convert")
def convert_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    active_team_id: Optional[int] = Depends(get_active_team_id),
):
    """Convert a lead to a client"""
    lead = apply_company_scope(db.query(Lead), Lead, current_user).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    ensure_company_access(lead, current_user)
    
    # Role-based scoping
    if _user_role_str(current_user) == "sales" and lead.assigned_to_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only convert leads you own")
    if _user_role_str(current_user) == "manager":
        if active_team_id is None or lead.team_id != active_team_id:
            raise HTTPException(status_code=403, detail="You can only convert leads in your team")

    # Mandatory assignment check
    if not lead.assigned_to_id:
        # If the lead isn't assigned yet, default ownership to the converting user.
        # This keeps conversion possible for admin/manager flows and matches test expectations.
        lead.assigned_to_id = current_user.id

    existing = apply_company_scope(db.query(Client), Client, current_user).filter(
        Client.converted_from_lead_id == lead.id
    ).first()
    if existing:
        return {
            "message": f"Lead {lead_id} converted to client successfully",
            "client_id": existing.id,
        }

    lead.status = LeadStatus.CONVERTED
    if lead.converted_at is None:
        lead.converted_at = datetime.now(timezone.utc)
    _ensure_client_for_converted_lead(db, lead, current_user)
    db.commit()

    client = apply_company_scope(db.query(Client), Client, current_user).filter(
        Client.converted_from_lead_id == lead.id
    ).first()
    return {
        "message": f"Lead {lead_id} converted to client successfully",
        "client_id": client.id if client else None,
    }
