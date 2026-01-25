from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime

from app.database import get_db
from app.utils.dependencies import get_current_user
from app.models.user import User

router = APIRouter()


# ===============================
# Manager Dashboard
# ===============================

@router.get("/dashboard")
def get_manager_dashboard(
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Get manager dashboard with team metrics"""
    return {
        "metrics": {
            "total_team_leads": 387,
            "closed_deals": 98,
            "team_conversion_rate": 25
        },
        "team_members": [
            {"id": 1, "name": "Alex Johnson", "leads_active": 24, "leads_converted": 8},
            {"id": 2, "name": "Sarah Smith", "leads_active": 31, "leads_converted": 12},
            {"id": 3, "name": "Mike Williams", "leads_active": 18, "leads_converted": 5},
        ],
        "priority_tasks": [
            {"id": 201, "title": "Approve Contract Review (Team A)", "dueDate": datetime.now().isoformat(), "statusReason": "DUE_TODAY"},
            {"id": 202, "title": "Client Escalation: Delta Corp", "dueDate": "2024-01-17", "statusReason": "OVERDUE"},
            {"id": 203, "title": "Quarterly Team Performance Review", "dueDate": datetime.now().isoformat(), "statusReason": "DUE_TODAY"},
        ]
    }


# ===============================
# Team Monitoring
# ===============================

@router.get("/monitoring")
def get_team_monitoring(
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Get team activity monitoring data"""
    return {
        "team_members": [
            {
                "id": 1, "name": "Alex Johnson", "role": "Sales Executive",
                "status": "online", "last_active": "2 min ago",
                "today_stats": {"calls": 8, "emails": 12, "meetings": 2},
                "pending_tasks": 5, "overdue_tasks": 1
            },
            {
                "id": 2, "name": "Sarah Smith", "role": "Sales Executive",
                "status": "online", "last_active": "5 min ago",
                "today_stats": {"calls": 12, "emails": 8, "meetings": 3},
                "pending_tasks": 3, "overdue_tasks": 0
            },
            {
                "id": 3, "name": "Mike Williams", "role": "Sales Executive",
                "status": "away", "last_active": "1 hour ago",
                "today_stats": {"calls": 4, "emails": 6, "meetings": 1},
                "pending_tasks": 7, "overdue_tasks": 2
            },
            {
                "id": 4, "name": "Emily Brown", "role": "Sales Executive",
                "status": "offline", "last_active": "3 hours ago",
                "today_stats": {"calls": 0, "emails": 2, "meetings": 0},
                "pending_tasks": 4, "overdue_tasks": 0
            }
        ],
        "team_summary": {
            "total_members": 4,
            "online": 2,
            "away": 1,
            "offline": 1
        }
    }


@router.get("/monitoring/{user_id}")
def get_team_member_detail(
    user_id: int,
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Get detailed activity for a team member"""
    return {
        "user": {
            "id": user_id,
            "name": "Alex Johnson",
            "email": "alex.j@company.com",
            "role": "Sales Executive",
            "status": "online"
        },
        "current_week": {
            "calls": 42,
            "emails": 78,
            "meetings": 12,
            "leads_contacted": 18,
            "leads_converted": 3
        },
        "recent_activity": [
            {"action": "Called lead", "entity": "John Smith - Acme Corp", "time": "10 min ago"},
            {"action": "Sent email", "entity": "Sarah - TechStart", "time": "25 min ago"},
            {"action": "Completed task", "entity": "Follow up reminder", "time": "1 hour ago"},
        ],
        "active_leads": [
            {"id": 1, "name": "John Smith", "company": "Acme Corp", "status": "Contacted"},
            {"id": 2, "name": "Emily Davis", "company": "Startup IO", "status": "New"},
        ]
    }


# ===============================
# Team Leads (Manager sees all team leads)
# ===============================

@router.get("/leads")
def get_team_leads(
    status: Optional[str] = Query(None),
    member_id: Optional[int] = Query(None, description="Filter by team member"),
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Get all leads for the manager's team"""
    leads = [
        {"id": 1, "name": "John Smith", "company": "Acme Corp", "status": "New", 
         "assigned_to": "Alex Johnson", "assigned_to_id": 1, "created_at": "2024-01-15"},
        {"id": 2, "name": "Sarah Johnson", "company": "TechStart Inc", "status": "Contacted",
         "assigned_to": "Sarah Smith", "assigned_to_id": 2, "created_at": "2024-01-14"},
        {"id": 3, "name": "Mike Williams", "company": "Design Co", "status": "Qualified",
         "assigned_to": "Alex Johnson", "assigned_to_id": 1, "created_at": "2024-01-10"},
        {"id": 4, "name": "Emily Brown", "company": "Startup IO", "status": "Contacted",
         "assigned_to": "Mike Williams", "assigned_to_id": 3, "created_at": "2024-01-18"},
    ]
    
    if status:
        leads = [l for l in leads if l["status"] == status]
    if member_id:
        leads = [l for l in leads if l["assigned_to_id"] == member_id]
    
    return {"leads": leads, "total": len(leads)}


@router.post("/leads/{lead_id}/reassign")
def reassign_lead(
    lead_id: int,
    new_assignee_id: int = Query(...),
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Reassign a lead to a different team member"""
    return {
        "message": f"Lead {lead_id} reassigned to user {new_assignee_id}",
        "lead_id": lead_id,
        "new_assignee_id": new_assignee_id
    }


# ===============================
# Team Tasks
# ===============================

@router.get("/tasks")
def get_team_tasks(
    status: Optional[str] = Query(None),
    member_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Get all tasks for the team"""
    tasks = [
        {"id": 1, "title": "Call Acme Corp", "dueDate": "Today", "status": "Pending",
         "assigned_to": "Alex Johnson", "assigned_to_id": 1, "priority": "high"},
        {"id": 2, "title": "Send proposal", "dueDate": "Tomorrow", "status": "Pending",
         "assigned_to": "Sarah Smith", "assigned_to_id": 2, "priority": "medium"},
        {"id": 3, "title": "Follow up meeting", "dueDate": "Yesterday", "status": "Overdue",
         "assigned_to": "Mike Williams", "assigned_to_id": 3, "priority": "high"},
    ]
    
    if member_id:
        tasks = [t for t in tasks if t["assigned_to_id"] == member_id]
    
    return {"tasks": tasks, "total": len(tasks)}


@router.post("/tasks")
def create_team_task(
    title: str = Query(...),
    assignee_id: int = Query(...),
    due_date: str = Query(...),
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Create and assign a task to a team member"""
    return {
        "message": "Task created and assigned",
        "task": {
            "id": 100,
            "title": title,
            "assigned_to_id": assignee_id,
            "due_date": due_date,
            "assigned_by": "manager"
        }
    }


# ===============================
# Performance Reports
# ===============================

@router.get("/reports/performance")
def get_team_performance(
    period: str = Query("month", description="week, month, quarter"),
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Get team performance report"""
    return {
        "period": period,
        "team_totals": {
            "leads_created": 156,
            "leads_converted": 42,
            "conversion_rate": 26.9,
            "revenue": 185000.0
        },
        "member_breakdown": [
            {"id": 1, "name": "Alex Johnson", "leads": 45, "converted": 12, "revenue": 52000},
            {"id": 2, "name": "Sarah Smith", "leads": 52, "converted": 18, "revenue": 78000},
            {"id": 3, "name": "Mike Williams", "leads": 35, "converted": 8, "revenue": 35000},
            {"id": 4, "name": "Emily Brown", "leads": 24, "converted": 4, "revenue": 20000},
        ],
        "trends": {
            "leads_trend": "+12%",
            "conversion_trend": "+5%",
            "revenue_trend": "+18%"
        }
    }


@router.get("/reports/activity")
def get_team_activity_report(
    period: str = Query("week"),
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Get team activity summary report"""
    return {
        "period": period,
        "summary": {
            "total_calls": 245,
            "total_emails": 412,
            "total_meetings": 38,
            "avg_response_time": "2.4 hours"
        },
        "daily_breakdown": [
            {"date": "2024-01-18", "calls": 42, "emails": 68, "meetings": 8},
            {"date": "2024-01-17", "calls": 38, "emails": 72, "meetings": 6},
            {"date": "2024-01-16", "calls": 45, "emails": 65, "meetings": 7},
        ]
    }


# ===============================
# Invoices (Manager can view team invoices)
# ===============================

@router.get("/invoices")
def get_team_invoices(
    status: Optional[str] = Query(None, description="Draft, Pending, Paid, Overdue"),
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Get all invoices created by team members"""
    invoices = [
        {"id": 1, "number": "INV-001", "client": "Acme Corp", "amount": 15000.0, 
         "status": "Paid", "created_by": "Alex Johnson", "date": "2024-01-10"},
        {"id": 2, "number": "INV-002", "client": "TechStart Inc", "amount": 8500.0,
         "status": "Pending", "created_by": "Sarah Smith", "date": "2024-01-15"},
        {"id": 3, "number": "INV-003", "client": "Design Co", "amount": 12000.0,
         "status": "Overdue", "created_by": "Mike Williams", "date": "2024-01-05"},
        {"id": 4, "number": "INV-004", "client": "Startup IO", "amount": 5000.0,
         "status": "Draft", "created_by": "Emily Brown", "date": "2024-01-18"},
    ]
    
    if status:
        invoices = [i for i in invoices if i["status"] == status]
    
    return {"invoices": invoices, "total": len(invoices)}


@router.post("/invoices/{invoice_id}/approve")
def approve_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Approve an invoice (send to client)"""
    return {
        "message": f"Invoice {invoice_id} approved and sent to client",
        "invoice_id": invoice_id,
        "new_status": "Pending"
    }
