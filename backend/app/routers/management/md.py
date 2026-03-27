from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from datetime import datetime, timedelta, timezone
import calendar

from app.database import get_db
from app.utils.dependencies import get_current_user, apply_company_scope, ensure_company_access, is_platform_admin
from app.models.core.user import User
from app.models.sales.lead import Lead
from app.models.sales.client import Client
from app.models.finance.invoice import Invoice, InvoiceItem
from app.models.sales.task import Task
from app.models.core.team import Team
from app.models.core.team_membership import TeamMembership
from app.models.core.company import Company
from app.schemas.management import TransferRequestCreate, TransferRequestResponse
from app.models.hr.transfer_request import TeamTransferRequest
from app.utils.notify import notify_role_users

router = APIRouter()

MD_ROLES = {"md", "admin"}
POINT_ELIGIBLE_ROLES = {"sales", "manager"}


def require_md(current_user: User = Depends(get_current_user)) -> User:
    if is_platform_admin(current_user):
        return current_user
    if current_user.role not in MD_ROLES:
        raise HTTPException(status_code=403, detail="MD access required")
    return current_user


def _month_range_utc(year: int, month: int) -> tuple[datetime, datetime]:
    """
    Inclusive start, exclusive end for the given month in UTC.
    """
    start = datetime(year, month, 1, tzinfo=timezone.utc)
    last_day = calendar.monthrange(year, month)[1]
    end = datetime(year, month, last_day, 23, 59, 59, tzinfo=timezone.utc) + timedelta(seconds=1)
    return start, end


# ===============================
# MD Dashboard
# ===============================

@router.get("/dashboard")
def get_md_dashboard(
    period: str = Query("30d"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_md)
):
    """Get MD executive dashboard with company-wide KPIs"""
    # Real counts (company-scoped)
    lead_q = apply_company_scope(db.query(Lead), Lead, current_user)
    total_leads = lead_q.count()
    converted = lead_q.filter(Lead.status == "Converted").count()
    lost = lead_q.filter(Lead.status == "Lost").count()
    active = total_leads - converted - lost
    win_rate = int((converted / (converted + lost) * 100)) if (converted + lost) > 0 else 0
    
    client_q = apply_company_scope(db.query(Client), Client, current_user)
    total_clients = client_q.count()
    inv_q = apply_company_scope(db.query(Invoice), Invoice, current_user)
    total_revenue = inv_q.filter(Invoice.status != "Cancelled").with_entities(func.sum(Invoice.total)).scalar() or 0
    
    # Invoice stats
    paid = inv_q.filter(Invoice.status == "Paid").count()
    pending = inv_q.filter(Invoice.status == "Pending").count()
    overdue = inv_q.filter(Invoice.status == "Overdue").count()
    
    # Daily sales momentum (last 7 days)
    now = datetime.now(timezone.utc)
    sales_trend = []
    day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    for i in range(7):
        day = now - timedelta(days=6 - i)
        day_end = day + timedelta(days=1)
        day_rev = inv_q.filter(Invoice.status == "Paid", Invoice.created_at >= day, Invoice.created_at < day_end).with_entities(func.sum(Invoice.total)).scalar() or 0
        day_leads = lead_q.filter(Lead.created_at >= day, Lead.created_at < day_end).count()
        sales_trend.append({"date": day.strftime("%a"), "revenue": float(day_rev), "sales": day_leads})
    
    # Sales outcomes
    qualified = lead_q.filter(Lead.status == "Qualified").count()
    
    # Client growth (last 6 months)
    client_growth = []
    for m in range(6):
        month_start = (now.replace(day=1) - timedelta(days=30 * (5 - m))).replace(day=1)
        cumulative = client_q.filter(Client.created_at <= month_start + timedelta(days=31)).count()
        client_growth.append({"date": month_start.strftime("%b"), "count": cumulative})
    
    # Trend watchlist
    d7_ago = now - timedelta(days=7)
    d14_ago = now - timedelta(days=14)
    recent_leads = lead_q.filter(Lead.created_at >= d7_ago).count()
    prev_leads = lead_q.filter(Lead.created_at >= d14_ago, Lead.created_at < d7_ago).count()
    lead_velocity = int(((recent_leads - prev_leads) / max(prev_leads, 1)) * 100)
    
    task_q = apply_company_scope(db.query(Task), Task, current_user)
    overdue_tasks = task_q.filter(Task.due_date < now, Task.status != "Completed").count()
    total_tasks = task_q.filter(Task.due_date >= d7_ago).count()
    sla_adherence = int(((total_tasks - overdue_tasks) / max(total_tasks, 1)) * 100)
    
    # AI Brief
    overdue_inv = inv_q.filter(Invoice.status == "Overdue").count()
    stalled_leads = lead_q.filter(Lead.status.in_(["New", "Contacted"]), Lead.created_at < d14_ago).count()
    ai_brief = []
    if overdue_inv > 0:
        ai_brief.append({"id": 1, "title": "Revenue Risk", "summary": f"{overdue_inv} invoice(s) are overdue. Review immediately.", "link": "/md/invoices"})
    if stalled_leads > 0:
        ai_brief.append({"id": 2, "title": "Pipeline Stagnation", "summary": f"{stalled_leads} lead(s) have been stalled for 14+ days.", "link": "/md/leads"})
    if not ai_brief:
        ai_brief.append({"id": 1, "title": "All Clear", "summary": "No critical alerts. Pipeline and finances are healthy.", "link": "/md/dashboard"})
    
    return {
        "kpis": [
            {"id": 1, "label": "Total Revenue", "value": f"${total_revenue:,.0f}", "route": "/md/revenue"},
            {"id": 2, "label": "Pipeline Leads", "value": str(active), "route": "/md/leads"},
            {"id": 3, "label": "Win Rate", "value": f"{win_rate}%", "route": "/md/sales"},
            {"id": 4, "label": "Active Clients", "value": str(total_clients), "route": "/md/clients"},
            {"id": 5, "label": "Invoices Paid", "value": str(paid), "route": "/md/revenue"},
            {"id": 6, "label": "Invoices Pending", "value": str(pending), "route": "/md/revenue"}
        ],
        "pipelineSummary": {
            "stageDistribution": [
                {"stage": "New", "count": lead_q.filter(Lead.status == "New").count()},
                {"stage": "Contacted", "count": lead_q.filter(Lead.status == "Contacted").count()},
                {"stage": "Qualified", "count": lead_q.filter(Lead.status == "Qualified").count()},
                {"stage": "Proposal", "count": lead_q.filter(Lead.status == "Proposal").count()},
                {"stage": "Converted", "count": converted}
            ]
        },
        "financeSnapshot": {
            "invoiceHealth": [
                {"name": "Paid", "value": paid, "color": "#10b981"},
                {"name": "Pending", "value": pending, "color": "#f59e0b"},
                {"name": "Overdue", "value": overdue, "color": "#ef4444"}
            ],
            "counts": {"paid": paid, "outstanding": pending, "overdue": overdue}
        },
        "salesMomentum": {
            "trend": sales_trend,
            "outcomes": [
                {"stage": "Converted", "count": converted, "color": "#10b981"},
                {"stage": "Qualified", "count": qualified, "color": "#6366f1"}
            ]
        },
        "clientSnapshot": {
            "growth": client_growth,
            "status": {"active": total_clients, "risk": stalled_leads}
        },
        "trendWatchlist": [
            {"name": "Lead Velocity", "delta": f"{lead_velocity:+d}%", "trend": "up" if lead_velocity > 0 else "down"},
            {"name": "SLA Adherence", "delta": f"{sla_adherence:+d}%", "trend": "up" if sla_adherence >= 0 else "down"}
        ],
        "aiBrief": ai_brief
    }


# ===============================
# Revenue Analytics
# ===============================

@router.get("/revenue")
def get_revenue_analytics(
    period: str = Query("30d"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_md)
):
    """Get detailed revenue analytics"""
    inv_q = apply_company_scope(db.query(Invoice), Invoice, current_user)
    total_revenue = inv_q.filter(Invoice.status != "Cancelled").with_entities(func.sum(Invoice.total)).scalar() or 0
    collected_revenue = inv_q.filter(Invoice.status == "Paid").with_entities(func.sum(Invoice.total)).scalar() or 0
    outstanding = inv_q.filter(Invoice.status.in_(["Pending", "Sent", "Draft"])).with_entities(func.sum(Invoice.total)).scalar() or 0
    
    # Growth: compare paid invoices in last 30d vs previous 30d
    now = datetime.now(timezone.utc)
    d30_ago = now - timedelta(days=30)
    d60_ago = now - timedelta(days=60)
    
    recent_rev = inv_q.filter(Invoice.status != "Cancelled", Invoice.created_at >= d30_ago).with_entities(func.sum(Invoice.total)).scalar() or 0
    prev_rev = inv_q.filter(Invoice.status != "Cancelled", Invoice.created_at >= d60_ago, Invoice.created_at < d30_ago).with_entities(func.sum(Invoice.total)).scalar() or 0
    growth_pct = int(((recent_rev - prev_rev) / prev_rev * 100)) if prev_rev > 0 else 0
    growth_trend = "up" if growth_pct > 0 else ("down" if growth_pct < 0 else "flat")
    
    # Daily revenue trend (last 30 days)
    revenue_trend = []
    for i in range(30):
        day = d30_ago + timedelta(days=i)
        day_end = day + timedelta(days=1)
        day_total = inv_q.filter(
            Invoice.status != "Cancelled",
            Invoice.created_at >= day,
            Invoice.created_at < day_end
        ).with_entities(func.sum(Invoice.total)).scalar() or 0
        revenue_trend.append({
            "date": day.strftime("%b %d"),
            "value": float(day_total)
        })
    
    # Weekly breakdown (last 4 weeks)
    breakdown_by_period = []
    colors = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"]
    for w in range(4):
        week_start = now - timedelta(weeks=4 - w)
        week_end = week_start + timedelta(weeks=1)
        week_rev = inv_q.filter(
            Invoice.status != "Cancelled",
            Invoice.created_at >= week_start,
            Invoice.created_at < week_end
        ).with_entities(func.sum(Invoice.total)).scalar() or 0
        breakdown_by_period.append({
            "name": f"Week {w + 1}",
            "value": float(week_rev),
            "fill": colors[w % len(colors)]
        })
    
    # Summary table (weekly variance)
    summary_table = []
    for w in range(min(8, 4)):
        week_start = now - timedelta(weeks=4 - w)
        week_end = week_start + timedelta(weeks=1)
        week_rev = inv_q.filter(
            Invoice.status != "Cancelled",
            Invoice.created_at >= week_start,
            Invoice.created_at < week_end
        ).with_entities(func.sum(Invoice.total)).scalar() or 0
        # Compare to previous week
        prev_week_start = week_start - timedelta(weeks=1)
        prev_week_rev = inv_q.filter(
            Invoice.status != "Cancelled",
            Invoice.created_at >= prev_week_start,
            Invoice.created_at < week_start
        ).with_entities(func.sum(Invoice.total)).scalar() or 0
        delta_pct = int(((week_rev - prev_week_rev) / prev_week_rev * 100)) if prev_week_rev > 0 else 0
        delta_str = f"+{delta_pct}%" if delta_pct > 0 else f"{delta_pct}%"
        summary_table.append({
            "id": w + 1,
            "period": f"{week_start.strftime('%b %d')} - {week_end.strftime('%b %d')}",
            "revenue": f"${week_rev:,.0f}",
            "delta": delta_str
        })
    
    # Overdue invoices as risk signals
    overdue_invoices = inv_q.filter(Invoice.status == "Overdue").all()
    risks = []
    for idx, inv in enumerate(overdue_invoices[:5]):
        client_q = apply_company_scope(db.query(Client), Client, current_user)
        client = client_q.filter(Client.id == inv.client_id).first() if inv.client_id else None
        days_overdue = (datetime.now(timezone.utc).date() - inv.due_date).days if inv.due_date else 0
        risks.append({
            "id": idx + 1,
            "signal": f"Overdue: {client.name if client else 'Unknown'} INV-{inv.id:04d}",
            "severity": "High" if days_overdue > 14 else ("Medium" if days_overdue > 7 else "Low"),
            "metric": f"${inv.total:,.0f}" if inv.total else "$0",
            "delta": f"-{days_overdue}d",
            "detected": inv.due_date.strftime("%b %d") if inv.due_date else "N/A"
        })
    
    # Dynamic Revenue Trend Insight
    if recent_rev > prev_rev:
        trend_insight = f"Revenue grew by {growth_pct}% over the last 30 days. Steady cash flow."
    elif recent_rev < prev_rev:
        trend_insight = f"Revenue contracted by {growth_pct}% compared to the previous 30 days. Monitor retention."
    else:
        trend_insight = "Revenue is perfectly flat compared to the previous 30 days."

    # Dynamic AI Growth Insights (Mock logic based on current rev/outstanding)
    ai_insights = []
    if outstanding > total_revenue * 0.3 and total_revenue > 0:
        ai_insights.append({"tag": "Liquidity", "title": "High AR vs Collected", "evidence": [f"{int((outstanding/total_revenue)*100)}% of revenue is pending."]})
    elif growth_pct < 0:
        ai_insights.append({"tag": "Contraction", "title": "Negative Growth", "evidence": [f"Down {abs(growth_pct)}% from last 30d."]})
    else:
        ai_insights.append({"tag": "Healthy", "title": "Stable Cashflow", "evidence": ["Collections nominal."]})

    return {
        "kpis": [
            {"id": 1, "code": "total", "label": "Total Revenue", "value": f"${total_revenue:,.0f}", "change": f"{growth_pct:+d}%", "trend": growth_trend},
            {"id": 2, "code": "growth", "label": "30D Growth", "value": f"${recent_rev:,.0f}", "change": f"{growth_pct:+d}%", "trend": growth_trend},
            {"id": 3, "code": "outstanding", "label": "Outstanding", "value": f"${outstanding:,.0f}", "change": None, "trend": "flat"}
        ],
        "revenueTrend": revenue_trend,
        "trendInsight": trend_insight,
        "risks": risks,
        "breakdown": {
            "byPeriod": breakdown_by_period
        },
        "summaryTable": summary_table,
        "total_revenue": total_revenue,
        "outstanding": outstanding,
        "aiInsights": ai_insights
    }


# ===============================
# Company-wide Sales Analytics
# ===============================

@router.get("/sales")
def get_company_sales(
    period: str = Query("30d"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_md)
):
    """Get company-wide sales analytics"""
    lead_q = apply_company_scope(db.query(Lead), Lead, current_user)
    total = lead_q.count()
    won_leads = lead_q.filter(Lead.status == "Converted").count()
    lost_leads = lead_q.filter(Lead.status == "Lost").count()
    active_leads = total - won_leads - lost_leads
    win_rate = int((won_leads / (won_leads + lost_leads) * 100)) if (won_leads + lost_leads) > 0 else 0
    
    # Team performance (company-scoped)
    teams = apply_company_scope(db.query(Team), Team, current_user).all()
    team_performance = []
    for team in teams:
        team_leads = lead_q.filter(Lead.team_id == team.id, Lead.company_id == current_user.company_id).count()
        team_won = lead_q.filter(Lead.team_id == team.id, Lead.status == "Converted", Lead.company_id == current_user.company_id).count()
        team_performance.append({
            "team": team.name,
            "leads": team_leads,
            "won": team_won,
            "win_rate": int((team_won / team_leads * 100)) if team_leads > 0 else 0
        })
    
    # Daily sales trend (last 7 days)
    now = datetime.now(timezone.utc)
    inv_q = apply_company_scope(db.query(Invoice), Invoice, current_user)
    sales_trend = []
    for i in range(7):
        day = now - timedelta(days=6 - i)
        day_end = day + timedelta(days=1)
        day_rev = inv_q.filter(Invoice.status == "Paid", Invoice.created_at >= day, Invoice.created_at < day_end).with_entities(func.sum(Invoice.total)).scalar() or 0
        day_deals = lead_q.filter(Lead.created_at >= day, Lead.created_at < day_end).count()
        sales_trend.append({"date": day.strftime("%a"), "revenue": float(day_rev), "count": day_deals})
    
    # Trend Observation
    if len(sales_trend) >= 2 and sales_trend[-1]["count"] > sales_trend[-2]["count"]:
        obs = f"Lead volume is accelerating. Today saw {sales_trend[-1]['count']} vs {sales_trend[-2]['count']} yesterday."
    else:
        obs = "Transactional flow is stable. Pipeline requires top-funnel injection."

    # Funnel and Signals
    funnel = {
        "stages": [
            {"name": "Total Deals", "value": total, "color": "var(--accent)"},
            {"name": "Active", "value": active_leads, "color": "var(--secondary)"},
            {"name": "Won", "value": won_leads, "color": "var(--primary)"}
        ],
        "signals": [
            {"label": "Conversion", "value": f"{win_rate}%", "metric": "Target 25%", "status": "positive" if win_rate >= 25 else "warning"}
        ]
    }

    # AI Insights
    ai_insights = []
    avg_velocity = 14  # placeholder for lead age tracking
    if win_rate < 20:
        ai_insights.append({"tag": "Critical", "title": "Conversion Drop", "evidence": [f"Win rate at {win_rate}%"], "link": "/md/monitoring"})
    elif active_leads > (won_leads + lost_leads) * 2:
        ai_insights.append({"tag": "Bottleneck", "title": "Pipeline Congestion", "evidence": [f"{active_leads} active deals aging"], "link": "/md/monitoring"})
    else:
        ai_insights.append({"tag": "Performance", "title": "Pipeline Velocity", "evidence": [f"Avg {avg_velocity} days"], "link": "/md/monitoring"})

    return {
        "summary": {
            "total_deals": total,
            "won": won_leads,
            "lost": lost_leads,
            "active": active_leads,
            "win_rate": win_rate
        },
        "team_performance": team_performance,
        "salesTrend": sales_trend,
        "trendObservation": obs,
        "funnel": funnel,
        "aiInsights": ai_insights
    }


# ===============================
# Company-wide Leads
# ===============================

@router.get("/leads")
def get_company_leads(
    status: Optional[str] = Query(None),
    team: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_md)
):
    """Get all company leads with filters (paginated)."""
    query = apply_company_scope(db.query(Lead), Lead, current_user)
    
    if status:
        query = query.filter(Lead.status == status)
    
    total = query.count()
    leads = query.order_by(Lead.created_at.desc()).offset(skip).limit(limit).all()
    
    result = []
    team_q = apply_company_scope(db.query(Team), Team, current_user)
    user_q = apply_company_scope(db.query(User), User, current_user)
    for lead in leads:
        team_obj = team_q.filter(Team.id == lead.team_id).first() if lead.team_id else None
        owner = user_q.filter(User.id == lead.assigned_to_id).first() if lead.assigned_to_id else None
        result.append({
            "id": lead.id,
            "name": lead.name,
            "company": lead.company,
            "status": lead.status,
            "team": team_obj.name if team_obj else "Unassigned",
            "owner": owner.full_name if owner else "Unassigned"
        })
    
    return {
        "leads": result,
        "total": total,
        "skip": skip,
        "limit": limit,
        "funnel": [
            {"name": "New", "value": apply_company_scope(db.query(Lead), Lead, current_user).filter(Lead.status == "New").count()},
            {"name": "Contacted", "value": apply_company_scope(db.query(Lead), Lead, current_user).filter(Lead.status == "Contacted").count()},
            {"name": "Qualified", "value": apply_company_scope(db.query(Lead), Lead, current_user).filter(Lead.status == "Qualified").count()},
            {"name": "Proposal", "value": apply_company_scope(db.query(Lead), Lead, current_user).filter(Lead.status == "Proposal").count()},
            {"name": "Converted", "value": apply_company_scope(db.query(Lead), Lead, current_user).filter(Lead.status == "Converted").count()},
        ],
        "sourceBreakdown": [
            {"name": src or "Unknown", "value": cnt, "color": color}
            for (src, cnt), color in zip(
                db.query(Lead.source, func.count(Lead.id)).filter(Lead.company_id == current_user.company_id).group_by(Lead.source).all() if current_user.company_id
                else db.query(Lead.source, func.count(Lead.id)).group_by(Lead.source).all(),
                ["var(--accent)", "var(--success)", "var(--warning)", "var(--error)", "var(--secondary)"]
            )
        ],
        "conversionRate": int((apply_company_scope(db.query(Lead), Lead, current_user).filter(Lead.status == "Converted").count() / max(total, 1)) * 100)
    }


# ===============================
# Company-wide Clients
# ===============================

@router.get("/clients")
def get_company_clients(
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_md)
):
    """Get all company clients (paginated list + summary)."""
    client_q = apply_company_scope(db.query(Client), Client, current_user)
    total = client_q.count()
    
    clients = client_q.order_by(Client.created_at.desc()).offset(skip).limit(limit).all()
    
    # Growth trend (last 6 months)
    now = datetime.now(timezone.utc)
    growth_trend = []
    for m in range(6):
        month_start = (now.replace(day=1) - timedelta(days=30 * (5 - m))).replace(day=1)
        cumulative = client_q.filter(Client.created_at <= month_start + timedelta(days=31)).count()
        growth_trend.append({"date": month_start.strftime("%b"), "value": cumulative})
    
    return {
        "summary": {
            "total": total,
            "active": total
        },
        "clients": [
            {"id": c.id, "name": c.name, "company": c.company}
            for c in clients
        ],
        "skip": skip,
        "limit": limit,
        "growthTrend": growth_trend,
        "healthDistribution": [
            {"name": "Healthy", "value": total, "color": "var(--success)"},
            {"name": "At Risk", "value": 0, "color": "var(--warning)"},
            {"name": "Churned", "value": 0, "color": "var(--error)"}
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
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_md)
):
    """Search and lookup employees"""
    query = apply_company_scope(db.query(User), User, current_user)
    
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (User.full_name.ilike(search_pattern)) |
            (User.email.ilike(search_pattern))
        )
    if role:
        query = query.filter(User.role == role.lower())
    
    total = query.count()
    users = query.order_by(User.created_at.desc()).offset(skip).limit(limit).all()
    
    result = []
    team_q = apply_company_scope(db.query(Team), Team, current_user)
    company_ids = {u.company_id for u in users if u.company_id}
    companies = db.query(Company).filter(Company.id.in_(company_ids)).all() if company_ids else []
    company_map = {c.id: c.company_code for c in companies}
    
    for user in users:
        company_rank = db.query(User).filter(
            User.company_id == user.company_id,
            User.id <= user.id
        ).count()
        prefix = company_map.get(user.company_id) or "EMP"
        
        # Get teams via membership
        user_teams = (
            db.query(Team)
            .join(TeamMembership, TeamMembership.team_id == Team.id)
            .filter(TeamMembership.user_id == user.id, TeamMembership.company_id == current_user.company_id)
            .all()
        )
        result.append({
            "id": f"{prefix}{company_rank:03d}",
            "user_id": user.id,
            "name": user.full_name,
            "email": user.email,
            "role": user.role.title(),
            "team": ", ".join(t.name for t in user_teams) if user_teams else None,
            "status": user.status
        })
    
    return {"employees": result, "total": total, "skip": skip, "limit": limit}


@router.get("/employee-lookup/{user_id}")
def get_employee_detail(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_md)
):
    """Get detailed employee information"""
    user = apply_company_scope(db.query(User), User, current_user).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Get teams via membership
    user_teams = (
        db.query(Team)
        .join(TeamMembership, TeamMembership.team_id == Team.id)
        .filter(TeamMembership.user_id == user.id, TeamMembership.company_id == current_user.company_id)
        .all()
    )
    team = user_teams[0] if user_teams else None
    
    # Calculate company rank and prefix
    company_rank = db.query(User).filter(
        User.company_id == user.company_id,
        User.id <= user.id
    ).count()
    company = db.query(Company).filter(Company.id == user.company_id).first()
    prefix = company.company_code if company and company.company_code else "EMP"
    formatted_id = f"{prefix}{company_rank:03d}"
    
    # Performance metrics (company-scoped)
    lead_q = apply_company_scope(db.query(Lead), Lead, current_user)
    leads = lead_q.filter(Lead.assigned_to_id == user_id).count()
    converted = lead_q.filter(Lead.assigned_to_id == user_id, Lead.status == "Converted").count()
    
    # Calculate 7-day trends
    now = datetime.now(timezone.utc)
    sales_trend = []
    conversion_trend = []
    for i in range(7):
        day = now - timedelta(days=6 - i)
        day_end = day + timedelta(days=1)
        day_leads = lead_q.filter(Lead.assigned_to_id == user_id, Lead.created_at >= day, Lead.created_at < day_end).count()
        day_conv = lead_q.filter(Lead.assigned_to_id == user_id, Lead.status == "Converted", Lead.updated_at >= day, Lead.updated_at < day_end).count()
        sales_trend.append(day_leads)
        conversion_trend.append(day_conv)

    # Team performance context
    team_metrics = {"leads": 0, "converted": 0, "avg_leads_per_member": 0}
    if team:
        team_members_count = (
            db.query(TeamMembership)
            .filter(TeamMembership.team_id == team.id, TeamMembership.company_id == current_user.company_id)
            .count()
        )
        team_leads = lead_q.filter(Lead.team_id == team.id, Lead.company_id == current_user.company_id).count()
        team_converted = lead_q.filter(Lead.team_id == team.id, Lead.status == "Converted", Lead.company_id == current_user.company_id).count()
        team_metrics = {
            "leads": team_leads,
            "converted": team_converted,
            "avg_leads_per_member": round(team_leads / max(team_members_count, 1), 1)
        }

    return {
        "employee": {
            "id": user.id,
            "formatted_id": formatted_id,
            "name": user.full_name,
            "email": user.email,
            "phone": user.phone,
            "role": user.role,
            "team": team.name if team else None,
            "status": user.status
        },
        "performance": {
            "leads": leads,
            "converted": converted
        },
        "trends": {
            "sales": sales_trend,
            "conversion": conversion_trend,
            "activity": sales_trend  # Fallback for activity
        },
        "team_performance": team_metrics
    }

# ===============================
# Company Monitoring
# ===============================

@router.get("/monitoring")
def get_company_monitoring(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_md)
):
    """Get company-wide monitoring and alerts"""
    # Get team status (company-scoped)
    teams = apply_company_scope(db.query(Team), Team, current_user).all()
    team_status = []
    lead_q = apply_company_scope(db.query(Lead), Lead, current_user)
    for team in teams:
        team_leads = lead_q.filter(Lead.team_id == team.id, Lead.company_id == current_user.company_id).count()
        team_status.append({
            "team": team.name,
            "status": "healthy",
            "leads": team_leads
        })
    
    alerts = []
    ai_interpretation = []
    
    # 1. Overdue tasks
    overdue_tasks = apply_company_scope(db.query(Task), Task, current_user).filter(
        Task.due_date < datetime.now(timezone.utc),
        Task.status != "Completed"
    ).count()
    if overdue_tasks > 0:
        alerts.append({
            "id": 1, "type": "Operations", "title": "Task SLA Breach", 
            "message": f"{overdue_tasks} overdue tasks", "severity": "High"
        })
        ai_interpretation.append({"type": "RISK", "title": "SLA Degradation", "evidence": [f"{overdue_tasks} missed deadlines"]})

    # 2. Overdue Invoices
    overdue_invoices = apply_company_scope(db.query(Invoice), Invoice, current_user).filter(
        Invoice.status == "Overdue"
    ).count()
    if overdue_invoices > 0:
        alerts.append({
            "id": 2, "type": "Finance", "title": "Liquidity Gap Projected", 
            "message": f"{overdue_invoices} overdue invoices detected", "severity": "High"
        })
        ai_interpretation.append({"type": "FINANCE", "title": "Cashflow Risk", "evidence": [f"{overdue_invoices} unsettled"]})

    # 3. Stalled Leads
    two_weeks_ago = datetime.now(timezone.utc) - timedelta(days=14)
    stalled_leads = lead_q.filter(Lead.status.in_(["New", "Contacted"]), Lead.created_at < two_weeks_ago).count()
    if stalled_leads > 0:
        alerts.append({
            "id": 3, "type": "Sales", "title": "Stalled Deals in Negotiation", 
            "message": f"{stalled_leads} leads stalled for 14+ days", "severity": "Medium"
        })
        ai_interpretation.append({"type": "RISK", "title": "Pipeline Stagnation", "evidence": [f"{stalled_leads} aging leads"]})

    if not ai_interpretation:
        ai_interpretation.append({"type": "INFO", "title": "System Nominal", "evidence": ["All clear"]})

    # Mock trend history (until we have an alert history table)
    risk_trend = [
        {"date": (datetime.now(timezone.utc) - timedelta(days=i)).strftime("%a"), "value": max(1, len(alerts) - (i % 3))}
        for i in range(6, -1, -1)
    ]

    return {
        "alerts": alerts,
        "team_status": team_status,
        "risk_trend": risk_trend,
        "ai_interpretation": ai_interpretation
    }


# ===============================
# Company-wide Invoices
# ===============================

@router.get("/invoices")
def get_company_invoices(
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_md)
):
    """Get all company invoices for MD view"""
    inv_q = apply_company_scope(db.query(Invoice), Invoice, current_user)
    if status and status != "All":
        inv_q = inv_q.filter(Invoice.status == status)

    total = inv_q.count()
    invoices = inv_q.order_by(Invoice.created_at.desc()).offset(skip).limit(limit).all()

    client_q = apply_company_scope(db.query(Client), Client, current_user)
    user_q = apply_company_scope(db.query(User), User, current_user)
    result = []
    for inv in invoices:
        client = client_q.filter(Client.id == inv.client_id).first() if inv.client_id else None
        creator = user_q.filter(User.id == inv.created_by_id).first() if getattr(inv, "created_by_id", None) else None
        
        result.append({
            "id": f"INV-{inv.id:04d}",
            "db_id": inv.id,
            "client": client.name if client else "Unknown",
            "sales_rep_name": creator.full_name if creator else "System",
            "amount": f"${inv.total:,.2f}" if inv.total else "$0.00",
            "status": inv.status or "Draft",
            "dueDate": inv.due_date.strftime("%Y-%m-%d") if inv.due_date else None,
            "linkedSale": None,
            "paymentStatus": "Settled" if inv.status == "Paid" else "Awaiting"
        })

    return {"invoices": result, "total": total, "skip": skip, "limit": limit}


# ===============================
# Performance Points / Incentives
# ===============================

def _tier_for_points(points: int) -> str:
    if points >= 2000:
        return "Titanium"
    if points >= 1500:
        return "Platinum"
    if points >= 800:
        return "Gold"
    return "Silver"


def _base_points_for_user(lead_q, user_id: int) -> tuple[int, int, int]:
    total_leads = lead_q.filter(Lead.assigned_to_id == user_id).count()
    converted = lead_q.filter(Lead.assigned_to_id == user_id, Lead.status == "Converted").count()
    points = converted * 500 + (total_leads - converted) * 50
    return total_leads, converted, points


@router.get("/points")
def get_performance_points(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_md)
):
    """Get employee performance points based on lead performance."""
    lead_q = apply_company_scope(db.query(Lead), Lead, current_user)
    user_q = apply_company_scope(db.query(User), User, current_user)

    sales_users = user_q.filter(User.role.in_(list(POINT_ELIGIBLE_ROLES))).all()

    company_ids = {u.company_id for u in sales_users if u.company_id}
    companies = db.query(Company).filter(Company.id.in_(company_ids)).all() if company_ids else []
    company_map = {c.id: c.company_code for c in companies}

    performance = []
    for user in sales_users:
        company_rank = db.query(User).filter(
            User.company_id == user.company_id,
            User.id <= user.id
        ).count()
        prefix = company_map.get(user.company_id) or "EMP"

        total_leads, converted, base_points = _base_points_for_user(lead_q, user.id)
        points = base_points
        target = 2000

        tier = _tier_for_points(points)

        bonus_amount = points * 5
        trend = "up" if converted > 0 else ("flat" if total_leads > 0 else "down")

        performance.append({
            "id": f"{prefix}{company_rank:03d}",
            "user_id": user.id,
            "name": user.full_name,
            "role": user.role.title(),
            "points": points,
            "tier": tier,
            "target": target,
            "trend": trend,
            "bonus": f"${bonus_amount:,}"
        })

    performance.sort(key=lambda x: x["points"], reverse=True)
    total = len(performance)
    paginated = performance[skip: skip + limit]
    
    # Summary KPIs
    total_points = sum(p["points"] for p in performance)
    total_bonus = sum(p["points"] * 5 for p in performance)
    top_performer = performance[0] if performance else None
    tier_set = set(p["tier"] for p in performance)
    
    return {
        "performance": paginated,
        "total": total,
        "skip": skip,
        "limit": limit,
        "summary": {
            "totalPoints": total_points,
            "totalBonus": total_bonus,
            "topPerformer": top_performer["name"] if top_performer else "N/A",
            "topTier": top_performer["tier"] if top_performer else "N/A",
            "topPoints": top_performer["points"] if top_performer else 0,
            "tierCount": len(tier_set)
        }
    }

@router.get("/performance/monthly")
def get_monthly_performance(
    year: int = Query(..., ge=2000, le=2100),
    month: int = Query(..., ge=1, le=12),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_md),
):
    """
    Monthly performance leaderboard (1st to end of month).

    Finance is the source of truth for revenue: paid invoices in the month.
    Sales conversions come from leads marked Converted in the month (created_at window).
    """
    if is_platform_admin(current_user):
        raise HTTPException(status_code=403, detail="Company context required")

    start, end = _month_range_utc(year, month)

    # Sales users in the company
    sales_users = apply_company_scope(db.query(User), User, current_user).filter(User.role == "sales").all()
    sales_ids = [u.id for u in sales_users]
    if not sales_ids:
        return {"year": year, "month": month, "start": start.isoformat(), "end": end.isoformat(), "leaderboard": []}

    # Revenue: paid invoices with paid_date in the month (source of truth).
    # If paid_date is missing, it is excluded to avoid ambiguity.
    from sqlalchemy import and_

    inv_q = apply_company_scope(db.query(Invoice.created_by_id, func.sum(Invoice.total)), Invoice, current_user)
    inv_q = inv_q.filter(
        Invoice.created_by_id.in_(sales_ids),
        Invoice.status == "Paid",
        Invoice.paid_date.isnot(None),
        Invoice.paid_date >= start.date(),
        Invoice.paid_date < end.date(),
    ).group_by(Invoice.created_by_id)
    revenue_rows = inv_q.all()
    revenue_map = {uid: float(total or 0) for uid, total in revenue_rows}

    # Conversions: leads assigned to the user, converted, converted_at in month.
    lead_q = apply_company_scope(db.query(Lead.assigned_to_id, func.count(Lead.id)), Lead, current_user)
    lead_q = lead_q.filter(
        Lead.assigned_to_id.in_(sales_ids),
        Lead.status == "Converted",
        Lead.converted_at.isnot(None),
        Lead.converted_at >= start,
        Lead.converted_at < end,
    ).group_by(Lead.assigned_to_id)
    conv_rows = lead_q.all()
    conv_map = {uid: int(cnt or 0) for uid, cnt in conv_rows}

    # Total leads created in month (for conversion rate baseline)
    total_leads_q = apply_company_scope(db.query(Lead.assigned_to_id, func.count(Lead.id)), Lead, current_user)
    total_leads_q = total_leads_q.filter(
        Lead.assigned_to_id.in_(sales_ids),
        Lead.created_at >= start,
        Lead.created_at < end,
    ).group_by(Lead.assigned_to_id)
    total_rows = total_leads_q.all()
    total_map = {uid: int(cnt or 0) for uid, cnt in total_rows}

    leaderboard = []
    for u in sales_users:
        total = total_map.get(u.id, 0)
        converted = conv_map.get(u.id, 0)
        revenue = revenue_map.get(u.id, 0.0)
        leaderboard.append(
            {
                "user_id": u.id,
                "name": u.full_name,
                "email": u.email,
                "converted_leads": converted,
                "total_leads": total,
                "conversion_rate": round((converted / total * 100), 1) if total else 0.0,
                "revenue": revenue,
            }
        )

    # Sort by revenue first, then conversions
    leaderboard.sort(key=lambda x: (x["revenue"], x["converted_leads"]), reverse=True)

    return {
        "year": year,
        "month": month,
        "start": start.isoformat(),
        "end": end.isoformat(),
        "leaderboard": leaderboard,
        "top_sales_exec": leaderboard[0] if leaderboard else None,
    }


# ===============================
# MD Teams Overview
# ===============================

@router.get("/teams")
def get_md_teams(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_md)
):
    """Get all teams with member counts and performance KPIs for MD overview."""
    teams = apply_company_scope(db.query(Team), Team, current_user).all()

    result = []
    for team in teams:
        members = (
            db.query(User)
            .join(TeamMembership, TeamMembership.user_id == User.id)
            .filter(
                TeamMembership.team_id == team.id,
                TeamMembership.company_id == current_user.company_id,
            )
            .all()
        )
        member_ids = [m.id for m in members]

        lead_count = db.query(Lead).filter(Lead.assigned_to_id.in_(member_ids)).count() if member_ids else 0
        converted = db.query(Lead).filter(Lead.assigned_to_id.in_(member_ids), Lead.status == "Converted").count() if member_ids else 0
        revenue = db.query(func.sum(Invoice.total)).filter(Invoice.created_by_id.in_(member_ids), Invoice.status == "Paid").scalar() or 0 if member_ids else 0
        order_count = db.query(Invoice).filter(Invoice.created_by_id.in_(member_ids)).count() if member_ids else 0

        manager = next((m for m in members if m.role == "manager"), None)

        result.append({
            "id": team.id,
            "name": team.name,
            "manager": manager.full_name if manager else "Unassigned",
            "member_count": len([m for m in members if m.role == "sales"]),
            "total_leads": lead_count,
            "converted_leads": converted,
            "conversion_rate": round((converted / lead_count * 100), 1) if lead_count > 0 else 0,
            "revenue": float(revenue),
            "order_count": order_count,
            "members": [
                {
                    "id": m.id,
                    "full_name": m.full_name,
                    "email": m.email,
                    "role": m.role,
                    "status": m.status
                }
                for m in members
            ]
        })

    return {"teams": result, "total": len(result)}

@router.post("/transfer-request", response_model=TransferRequestResponse)
def create_md_transfer_request(
    request_data: TransferRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_md)
):
    """Request a team transfer for an employee (MD can request for any manager or sales)"""
    target_user = db.query(User).filter(User.id == request_data.user_id, User.company_id == current_user.company_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Target user not found")
    
    # MD can request for manager or sales
    if target_user.role not in ["manager", "sales"]:
        raise HTTPException(status_code=403, detail="Can only request transfers for Managers or Sales executives")
    
    # Check if target team exists
    target_team = db.query(Team).filter(Team.id == request_data.target_team_id, Team.company_id == current_user.company_id).first()
    if not target_team:
        raise HTTPException(status_code=404, detail="Target team not found")
    
    # Create the request
    new_request = TeamTransferRequest(
        company_id=current_user.company_id,
        user_id=target_user.id,
        requested_by_id=current_user.id,
        current_team_id=target_user.team_id,
        target_team_id=request_data.target_team_id,
        reason=request_data.reason,
        status="pending"
    )
    
    db.add(new_request)
    db.commit()
    db.refresh(new_request)
    
    # Notify Company Admins about the transfer request
    notify_role_users(db, current_user.company_id, role="admin",
        title="New Transfer Request (MD)",
        message=f"MD {current_user.full_name} requested to transfer {target_user.full_name} to {target_team.name}.",
        type="info",
        link="/admin/approvals",
        category="approvals")
    
    return new_request

# ===============================
# Custom Report Builder
# ===============================

@router.get("/reports/custom")
def get_custom_report(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    service_type: Optional[str] = Query(None),
    group_by: Optional[str] = Query("date"), # 'date', 'source', 'service_type'
    db: Session = Depends(get_db),
    current_user: User = Depends(require_md)
):
    """Generate dynamic custom reports combining Leads and Invoices"""
    from sqlalchemy import cast, Date as SqlDate
    
    # 1. Base Queries
    lead_q = apply_company_scope(db.query(Lead), Lead, current_user)
    
    inv_q = apply_company_scope(db.query(Invoice, Lead.source, Lead.service_type), Invoice, current_user)
    inv_q = inv_q.outerjoin(Client, Invoice.client_id == Client.id).outerjoin(Lead, Client.converted_from_lead_id == Lead.id)
    
    # Base Sum and Count Queries for Invoices
    inv_sum_q = apply_company_scope(db.query(func.sum(Invoice.total)), Invoice, current_user)
    inv_sum_q = inv_sum_q.outerjoin(Client, Invoice.client_id == Client.id).outerjoin(Lead, Client.converted_from_lead_id == Lead.id)
    
    inv_count_q = apply_company_scope(db.query(func.count(Invoice.id)), Invoice, current_user)
    inv_count_q = inv_count_q.outerjoin(Client, Invoice.client_id == Client.id).outerjoin(Lead, Client.converted_from_lead_id == Lead.id)
    
    # 2. Apply Filters
    if start_date:
        dt_start = datetime.strptime(start_date, "%Y-%m-%d")
        lead_q = lead_q.filter(Lead.created_at >= dt_start)
        inv_q = inv_q.filter(Invoice.created_at >= dt_start)
        inv_sum_q = inv_sum_q.filter(Invoice.created_at >= dt_start)
        inv_count_q = inv_count_q.filter(Invoice.created_at >= dt_start)
        
    if end_date:
        dt_end = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
        lead_q = lead_q.filter(Lead.created_at < dt_end)
        inv_q = inv_q.filter(Invoice.created_at < dt_end)
        inv_sum_q = inv_sum_q.filter(Invoice.created_at < dt_end)
        inv_count_q = inv_count_q.filter(Invoice.created_at < dt_end)
        
    if source and source != "All":
        lead_q = lead_q.filter(Lead.source == source)
        inv_q = inv_q.filter(Lead.source == source)
        inv_sum_q = inv_sum_q.filter(Lead.source == source)
        inv_count_q = inv_count_q.filter(Lead.source == source)
        
    if service_type and service_type != "All":
        lead_q = lead_q.filter(Lead.service_type == service_type)
        inv_q = inv_q.filter(Lead.service_type == service_type)
        inv_sum_q = inv_sum_q.filter(Lead.service_type == service_type)
        inv_count_q = inv_count_q.filter(Lead.service_type == service_type)
        
    # 3. Aggregations
    total_leads = lead_q.count()
    converted_leads = lead_q.filter(Lead.status == "Converted").count()
    total_revenue = inv_sum_q.filter(Invoice.status != "Cancelled").scalar() or 0
    total_invoices = inv_count_q.scalar() or 0
    
    # 4. Grouping Data (Chart Data)
    chart_data = {}
    
    if group_by == "source":
        # Group leads by source
        lead_groups = lead_q.with_entities(Lead.source, func.count(Lead.id)).group_by(Lead.source).all()
        for src, cnt in lead_groups:
            name = src or "Unknown"
            chart_data[name] = {"name": name, "leads": cnt, "revenue": 0}
            
        # Group revenue by source
        inv_groups = inv_sum_q.with_entities(Lead.source, func.sum(Invoice.total)).filter(Invoice.status != "Cancelled").group_by(Lead.source).all()
        for src, rev in inv_groups:
            name = src or "Unknown"
            if name not in chart_data:
                chart_data[name] = {"name": name, "leads": 0, "revenue": 0}
            chart_data[name]["revenue"] = float(rev or 0)
            
    elif group_by == "service_type":
        # Group leads by service type
        lead_groups = lead_q.with_entities(Lead.service_type, func.count(Lead.id)).group_by(Lead.service_type).all()
        for srv, cnt in lead_groups:
            name = srv or "Unknown"
            chart_data[name] = {"name": name, "leads": cnt, "revenue": 0}
            
        # Group inv by service type
        inv_groups = inv_sum_q.with_entities(Lead.service_type, func.sum(Invoice.total)).filter(Invoice.status != "Cancelled").group_by(Lead.service_type).all()
        for srv, rev in inv_groups:
            name = srv or "Unknown"
            if name not in chart_data:
                chart_data[name] = {"name": name, "leads": 0, "revenue": 0}
            chart_data[name]["revenue"] = float(rev or 0)
            
    else: # date
        lead_groups = lead_q.with_entities(cast(Lead.created_at, SqlDate), func.count(Lead.id)).group_by(cast(Lead.created_at, SqlDate)).all()
        for dt, cnt in lead_groups:
            name = dt.strftime("%Y-%m-%d") if dt else "Unknown"
            chart_data[name] = {"name": name, "leads": cnt, "revenue": 0}
            
        inv_groups = inv_sum_q.with_entities(cast(Invoice.created_at, SqlDate), func.sum(Invoice.total)).filter(Invoice.status != "Cancelled").group_by(cast(Invoice.created_at, SqlDate)).all()
        for dt, rev in inv_groups:
            name = dt.strftime("%Y-%m-%d") if dt else "Unknown"
            if name not in chart_data:
                chart_data[name] = {"name": name, "leads": 0, "revenue": 0}
            chart_data[name]["revenue"] = float(rev or 0)

    # 5. Data Grid (Top 50 matches)
    grid_results = inv_q.order_by(Invoice.created_at.desc()).limit(50).all()
    grid_data = []
    
    # client lookup
    client_ids = [inv.client_id for inv, _, _ in grid_results]
    clients = db.query(Client).filter(Client.id.in_(client_ids)).all() if client_ids else []
    client_map = {c.id: c.name for c in clients}
    
    for inv, l_src, l_stype in grid_results:
        grid_data.append({
            "id": f"INV-{inv.id:04d}",
            "client": client_map.get(inv.client_id, "Unknown"),
            "amount": float(inv.total or 0),
            "status": inv.status,
            "source": l_src or "Unknown",
            "service_type": l_stype or "Unknown",
            "date": inv.created_at.strftime("%Y-%m-%d") if inv.created_at else ""
        })
        
    chart_list = list(chart_data.values())
    if group_by == "date":
        chart_list.sort(key=lambda x: x["name"]) # Sort chronologically
    else:
        chart_list.sort(key=lambda x: x["revenue"], reverse=True) # Sort by revenue descending
        
    return {
        "kpis": {
            "totalRevenue": float(total_revenue),
            "totalInvoices": total_invoices,
            "totalLeads": total_leads,
            "convertedLeads": converted_leads
        },
        "chartData": chart_list,
        "gridData": grid_data
    }
