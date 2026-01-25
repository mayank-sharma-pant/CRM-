from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime

from app.database import get_db
from app.utils.dependencies import get_current_user
from app.models.user import User

router = APIRouter()


# ===============================
# MD Dashboard
# ===============================

@router.get("/dashboard")
def get_md_dashboard(
    period: str = Query("30d", description="Time period: 7d, 30d, 90d"),
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Get MD executive dashboard with company-wide KPIs"""
    return {
        "kpis": [
            {"id": 1, "label": "Monthly Revenue", "value": "$2.8M", "change": "+12%", "trend": "up", "subValue": "vs $2.5M", "route": "/md/revenue"},
            {"id": 2, "label": "Pipeline Value", "value": "$4.2M", "change": "+8%", "trend": "up", "subValue": "156 deals", "route": "/md/leads"},
            {"id": 3, "label": "Win Rate", "value": "34%", "change": "+3%", "trend": "up", "subValue": "vs 31%", "route": "/md/sales"},
            {"id": 4, "label": "Active Clients", "value": "412", "change": "+24", "trend": "up", "subValue": "this month", "route": "/md/clients"},
            {"id": 5, "label": "Avg Deal Size", "value": "$18.2K", "change": "+$1.5K", "trend": "up", "subValue": "vs $16.7K", "route": "/md/revenue"},
            {"id": 6, "label": "Sales Cycle", "value": "28 days", "change": "-4", "trend": "up", "subValue": "improving", "route": "/md/sales"},
            {"id": 7, "label": "Team Productivity", "value": "92%", "change": "+5%", "trend": "up", "subValue": "target met", "route": "/md/monitoring"},
            {"id": 8, "label": "Overdue Invoices", "value": "8", "change": "+2", "trend": "down", "subValue": "$45K value", "route": "/md/revenue"}
        ],
        "salesMomentum": {
            "trend": [
                {"date": "Jan 1", "revenue": 85000, "sales": 12},
                {"date": "Jan 5", "revenue": 92000, "sales": 15},
                {"date": "Jan 10", "revenue": 78000, "sales": 10},
                {"date": "Jan 15", "revenue": 105000, "sales": 18},
                {"date": "Jan 20", "revenue": 118000, "sales": 22},
                {"date": "Jan 25", "revenue": 135000, "sales": 28}
            ],
            "outcomes": [
                {"stage": "Won", "count": 42, "color": "#10b981"},
                {"stage": "Lost", "count": 18, "color": "#ef4444"},
                {"stage": "Pipeline", "count": 96, "color": "#6366f1"}
            ]
        },
        "pipelineSummary": {
            "stageDistribution": [
                {"stage": "New", "count": 45},
                {"stage": "Contacted", "count": 32},
                {"stage": "Qualified", "count": 28},
                {"stage": "Proposal", "count": 15},
                {"stage": "Negotiation", "count": 8}
            ],
            "topStage": "New (45)",
            "stalledStage": "Qualified (12 stalled)"
        },
        "clientSnapshot": {
            "growth": [
                {"date": "W1", "count": 385},
                {"date": "W2", "count": 392},
                {"date": "W3", "count": 401},
                {"date": "W4", "count": 412}
            ],
            "status": {"active": 412, "risk": 8}
        },
        "financeSnapshot": {
            "invoiceHealth": [
                {"name": "Paid", "value": 145, "color": "#10b981"},
                {"name": "Pending", "value": 24, "color": "#f59e0b"},
                {"name": "Overdue", "value": 8, "color": "#ef4444"}
            ],
            "counts": {"paid": 145, "outstanding": 24, "overdue": 8}
        },
        "trendWatchlist": [
            {"name": "Lead Conversion", "trend": "up", "delta": "+5%"},
            {"name": "Avg Response Time", "trend": "down", "delta": "+2h"},
            {"name": "Customer Retention", "trend": "up", "delta": "+3%"},
            {"name": "Deal Velocity", "trend": "up", "delta": "-4 days"}
        ],
        "aiBrief": [
            {"id": 1, "title": "Revenue at risk", "summary": "3 enterprise deals stalled > 14 days", "link": "/md/leads"},
            {"id": 2, "title": "Team performance", "summary": "Sales Alpha exceeding targets by 15%", "link": "/md/monitoring"}
        ]
    }


# ===============================
# Revenue Analytics
# ===============================

@router.get("/revenue")
def get_revenue_analytics(
    period: str = Query("30d"),
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Get detailed revenue analytics"""
    return {
        "kpis": [
            {"id": 1, "code": "total", "label": "Total Revenue", "value": "$2.8M", "change": "+12%", "trend": "up"},
            {"id": 2, "code": "growth", "label": "Growth Rate", "value": "12%", "change": "+3%", "trend": "up"},
            {"id": 3, "code": "outstanding", "label": "Outstanding", "value": "$186K", "change": "-8%", "trend": "up"}
        ],
        "revenueTrend": [
            {"date": "Jan 1", "value": 85000, "avg": 80000},
            {"date": "Jan 5", "value": 92000, "avg": 82000},
            {"date": "Jan 10", "value": 78000, "avg": 83000},
            {"date": "Jan 15", "value": 105000, "avg": 85000},
            {"date": "Jan 20", "value": 118000, "avg": 88000},
            {"date": "Jan 25", "value": 135000, "avg": 90000},
            {"date": "Jan 30", "value": 142000, "avg": 92000}
        ],
        "trendInsight": "Revenue trending 15% above monthly average with strong Q1 momentum.",
        "breakdown": {
            "byPeriod": [
                {"name": "Enterprise", "value": 1200000, "fill": "#6366f1"},
                {"name": "SMB", "value": 950000, "fill": "#8b5cf6"},
                {"name": "Startup", "value": 450000, "fill": "#a78bfa"},
                {"name": "Government", "value": 200000, "fill": "#c4b5fd"}
            ]
        },
        "summaryTable": [
            {"id": 1, "period": "Week 4", "revenue": "$142,000", "delta": "+18%"},
            {"id": 2, "period": "Week 3", "revenue": "$118,000", "delta": "+12%"},
            {"id": 3, "period": "Week 2", "revenue": "$105,000", "delta": "+8%"},
            {"id": 4, "period": "Week 1", "revenue": "$92,000", "delta": "+5%"}
        ],
        "risks": [
            {"id": 1, "signal": "Enterprise renewal at risk", "severity": "High", "metric": "$250K ARR", "delta": "-15%", "detected": "2 days ago"},
            {"id": 2, "signal": "Payment delays increasing", "severity": "Medium", "metric": "18 invoices", "delta": "+6", "detected": "5 days ago"},
            {"id": 3, "signal": "Pipeline conversion drop", "severity": "Medium", "metric": "28% rate", "delta": "-4%", "detected": "1 week ago"}
        ]
    }


# ===============================
# Company-wide Sales Analytics
# ===============================

@router.get("/sales")
def get_company_sales(
    period: str = Query("30d"),
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Get company-wide sales analytics"""
    return {
        "summary": {
            "total_deals": 156,
            "won": 42,
            "lost": 18,
            "active": 96,
            "win_rate": 34,
            "avg_deal_size": 18200,
            "total_value": 2840000
        },
        "team_performance": [
            {"team": "Sales Alpha", "leads": 52, "won": 18, "revenue": 856000, "win_rate": 35},
            {"team": "Sales Bravo", "leads": 48, "won": 14, "revenue": 724000, "win_rate": 32},
            {"team": "Sales Charlie", "leads": 35, "won": 8, "revenue": 412000, "win_rate": 28},
            {"team": "Enterprise", "leads": 21, "won": 2, "revenue": 848000, "win_rate": 40}
        ],
        "conversion_funnel": [
            {"stage": "New", "count": 156, "percentage": 100},
            {"stage": "Contacted", "count": 124, "percentage": 79},
            {"stage": "Qualified", "count": 86, "percentage": 55},
            {"stage": "Proposal", "count": 58, "percentage": 37},
            {"stage": "Won", "count": 42, "percentage": 27}
        ]
    }


# ===============================
# Company-wide Leads
# ===============================

@router.get("/leads")
def get_company_leads(
    status: Optional[str] = Query(None),
    team: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Get all company leads with filters"""
    leads = [
        {"id": 1, "name": "BigBank International", "company": "BigBank", "value": 450000, 
         "status": "Proposal", "team": "Enterprise", "owner": "James Wilson", "age": 28},
        {"id": 2, "name": "TechFlow Inc", "company": "TechFlow", "value": 125000,
         "status": "Qualified", "team": "Sales Alpha", "owner": "Alex Johnson", "age": 14},
        {"id": 3, "name": "GlobalRetail Corp", "company": "GlobalRetail", "value": 320000,
         "status": "Proposal", "team": "Enterprise", "owner": "Lisa Chen", "age": 35},
        {"id": 4, "name": "StartupXYZ", "company": "StartupXYZ", "value": 45000,
         "status": "New", "team": "Sales Bravo", "owner": "Sarah Smith", "age": 3}
    ]
    
    if status:
        leads = [l for l in leads if l["status"] == status]
    if team:
        leads = [l for l in leads if l["team"] == team]
    
    return {"leads": leads, "total": len(leads), "total_value": sum(l["value"] for l in leads)}


# ===============================
# Company-wide Clients
# ===============================

@router.get("/clients")
def get_company_clients(
    status: Optional[str] = Query(None, description="active, at_risk, churned"),
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Get all company clients"""
    return {
        "summary": {
            "total": 412,
            "active": 395,
            "at_risk": 12,
            "churned": 5
        },
        "top_clients": [
            {"id": 1, "name": "Enterprise Corp", "revenue": 580000, "status": "active", "since": "2022-03"},
            {"id": 2, "name": "Global Industries", "revenue": 420000, "status": "active", "since": "2021-08"},
            {"id": 3, "name": "Tech Solutions", "revenue": 350000, "status": "active", "since": "2023-01"},
            {"id": 4, "name": "Retail Giants", "revenue": 280000, "status": "at_risk", "since": "2022-06"}
        ],
        "recent_conversions": [
            {"id": 1, "name": "NewCorp Inc", "converted_at": "2024-01-18", "value": 45000},
            {"id": 2, "name": "Startup Pro", "converted_at": "2024-01-15", "value": 28000}
        ]
    }


# ===============================
# Employee Lookup
# ===============================

@router.get("/employee-lookup")
def employee_lookup(
    search: Optional[str] = Query(None),
    team: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Search and lookup employees"""
    employees = [
        {"id": "EMP001", "name": "Alex Johnson", "email": "alex.j@company.com", "role": "Sales Executive",
         "team": "Sales Alpha", "manager": "Mike Brown", "status": "active", "performance": "above_target"},
        {"id": "EMP002", "name": "Sarah Smith", "email": "sarah.s@company.com", "role": "Sales Executive",
         "team": "Sales Bravo", "manager": "James Wilson", "status": "active", "performance": "on_target"},
        {"id": "EMP003", "name": "Mike Brown", "email": "mike.b@company.com", "role": "Manager",
         "team": "Sales Alpha", "manager": "MD", "status": "active", "performance": "above_target"},
        {"id": "EMP004", "name": "James Wilson", "email": "james.w@company.com", "role": "Manager",
         "team": "Sales Bravo", "manager": "MD", "status": "active", "performance": "on_target"},
        {"id": "EMP005", "name": "Lisa Chen", "email": "lisa.c@company.com", "role": "Manager",
         "team": "Enterprise", "manager": "MD", "status": "active", "performance": "above_target"}
    ]
    
    if search:
        search_lower = search.lower()
        employees = [e for e in employees if 
                    search_lower in e["name"].lower() or 
                    search_lower in e["email"].lower() or
                    search_lower in e["id"].lower()]
    if team:
        employees = [e for e in employees if e["team"] == team]
    if role:
        employees = [e for e in employees if e["role"] == role]
    
    return {"employees": employees, "total": len(employees)}


@router.get("/employee-lookup/{employee_id}")
def get_employee_detail(
    employee_id: str,
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Get detailed employee information"""
    return {
        "employee": {
            "id": employee_id,
            "name": "Alex Johnson",
            "email": "alex.j@company.com",
            "phone": "+1 555-0101",
            "role": "Sales Executive",
            "team": "Sales Alpha",
            "manager": "Mike Brown",
            "joined": "2023-06-15",
            "status": "active"
        },
        "performance": {
            "current_month": {
                "leads": 24,
                "converted": 8,
                "revenue": 156000,
                "target_achievement": 115
            },
            "ytd": {
                "leads": 142,
                "converted": 48,
                "revenue": 856000
            }
        },
        "recent_activity": [
            {"action": "Won deal", "entity": "TechStart Inc", "value": 45000, "date": "2024-01-18"},
            {"action": "Created lead", "entity": "NewCorp", "date": "2024-01-17"},
            {"action": "Completed task", "entity": "Quarterly review", "date": "2024-01-16"}
        ]
    }


# ===============================
# Company Monitoring
# ===============================

@router.get("/monitoring")
def get_company_monitoring(
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Get company-wide monitoring and alerts"""
    return {
        "alerts": [
            {"id": 1, "type": "revenue", "severity": "High", "message": "Enterprise renewal at risk - BigCorp", 
             "detected": "2 hours ago", "action": "Review required"},
            {"id": 2, "type": "performance", "severity": "Medium", "message": "Sales Charlie below target by 15%",
             "detected": "1 day ago", "action": "Manager notified"},
            {"id": 3, "type": "pipeline", "severity": "Low", "message": "12 leads stalled > 14 days",
             "detected": "3 days ago", "action": "Auto-reminder sent"}
        ],
        "team_status": [
            {"team": "Sales Alpha", "status": "healthy", "metric": "+15% above target"},
            {"team": "Sales Bravo", "status": "healthy", "metric": "On target"},
            {"team": "Sales Charlie", "status": "attention", "metric": "-15% below target"},
            {"team": "Enterprise", "status": "healthy", "metric": "+8% above target"}
        ],
        "key_metrics": {
            "avg_response_time": "4.2 hours",
            "lead_response_rate": "94%",
            "task_completion_rate": "87%",
            "meeting_show_rate": "92%"
        }
    }
