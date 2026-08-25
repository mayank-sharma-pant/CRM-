from datetime import datetime, timedelta

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.finance.invoice import Invoice
from app.models.sales.client import Client
from app.models.sales.lead import Lead
from app.utils.dependencies import apply_company_scope

ALLOWED_GROUP_BY = {"date", "source", "service_type"}
ALLOWED_REPORT_TYPES = {"leads_invoices"}


def _parse_date(value, field):
    if value is None or value == "" or value == "All":
        return None
    if not isinstance(value, str):
        raise HTTPException(status_code=400, detail=f"Invalid {field}")
    try:
        return datetime.strptime(value, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid {field}; use YYYY-MM-DD")


def normalize_filters(raw) -> dict:
    if raw is None:
        raw = {}
    if not isinstance(raw, dict):
        raise HTTPException(status_code=400, detail="filters must be an object")
    group_by = raw.get("group_by") or "date"
    if group_by not in ALLOWED_GROUP_BY:
        raise HTTPException(
            status_code=400,
            detail="Invalid group_by. Allowed: date, source, service_type.",
        )
    start = raw.get("start_date")
    end = raw.get("end_date")
    _parse_date(start, "start_date")
    _parse_date(end, "end_date")
    source = raw.get("source")
    if source in ("", "All"):
        source = None
    service_type = raw.get("service_type")
    if service_type in ("", "All"):
        service_type = None
    return {
        "start_date": start or None,
        "end_date": end or None,
        "source": source,
        "service_type": service_type,
        "group_by": group_by,
    }


def normalize_report_type(raw: str) -> str:
    value = (raw or "").strip()
    if value not in ALLOWED_REPORT_TYPES:
        raise HTTPException(status_code=400, detail="Invalid report_type. Allowed: leads_invoices.")
    return value


def _day_key(column, db: Session):
    bind = db.get_bind()
    dialect = bind.dialect.name if bind is not None else "sqlite"
    if dialect == "postgresql":
        return func.to_char(column, "YYYY-MM-DD")
    return func.strftime("%Y-%m-%d", column)


def run_leads_invoices_report(db: Session, current_user, filters: dict) -> dict:
    filters = normalize_filters(filters)
    start_date = filters.get("start_date")
    end_date = filters.get("end_date")
    source = filters.get("source")
    service_type = filters.get("service_type")
    group_by = filters.get("group_by") or "date"

    lead_q = apply_company_scope(db.query(Lead), Lead, current_user)
    inv_q = apply_company_scope(db.query(Invoice, Lead.source, Lead.service_type), Invoice, current_user)
    inv_q = inv_q.outerjoin(Client, Invoice.client_id == Client.id).outerjoin(
        Lead, Client.converted_from_lead_id == Lead.id
    )

    inv_sum_q = apply_company_scope(db.query(func.sum(Invoice.total)), Invoice, current_user)
    inv_sum_q = inv_sum_q.outerjoin(Client, Invoice.client_id == Client.id).outerjoin(
        Lead, Client.converted_from_lead_id == Lead.id
    )

    inv_count_q = apply_company_scope(db.query(func.count(Invoice.id)), Invoice, current_user)
    inv_count_q = inv_count_q.outerjoin(Client, Invoice.client_id == Client.id).outerjoin(
        Lead, Client.converted_from_lead_id == Lead.id
    )

    dt_start = _parse_date(start_date, "start_date")
    if dt_start:
        lead_q = lead_q.filter(Lead.created_at >= dt_start)
        inv_q = inv_q.filter(Invoice.created_at >= dt_start)
        inv_sum_q = inv_sum_q.filter(Invoice.created_at >= dt_start)
        inv_count_q = inv_count_q.filter(Invoice.created_at >= dt_start)

    dt_end = _parse_date(end_date, "end_date")
    if dt_end:
        dt_end_excl = dt_end + timedelta(days=1)
        lead_q = lead_q.filter(Lead.created_at < dt_end_excl)
        inv_q = inv_q.filter(Invoice.created_at < dt_end_excl)
        inv_sum_q = inv_sum_q.filter(Invoice.created_at < dt_end_excl)
        inv_count_q = inv_count_q.filter(Invoice.created_at < dt_end_excl)

    if source:
        lead_q = lead_q.filter(Lead.source == source)
        inv_q = inv_q.filter(Lead.source == source)
        inv_sum_q = inv_sum_q.filter(Lead.source == source)
        inv_count_q = inv_count_q.filter(Lead.source == source)

    if service_type:
        lead_q = lead_q.filter(Lead.service_type == service_type)
        inv_q = inv_q.filter(Lead.service_type == service_type)
        inv_sum_q = inv_sum_q.filter(Lead.service_type == service_type)
        inv_count_q = inv_count_q.filter(Lead.service_type == service_type)

    total_leads = lead_q.count()
    converted_leads = lead_q.filter(Lead.status == "Converted").count()
    total_revenue = inv_sum_q.filter(Invoice.status == "Paid").scalar() or 0
    total_invoices = inv_count_q.scalar() or 0

    chart_data = {}
    if group_by == "source":
        lead_groups = lead_q.with_entities(Lead.source, func.count(Lead.id)).group_by(Lead.source).all()
        for src, cnt in lead_groups:
            name = src or "Unknown"
            chart_data[name] = {"name": name, "leads": cnt, "revenue": 0}
        inv_groups = (
            inv_sum_q.with_entities(Lead.source, func.sum(Invoice.total))
            .filter(Invoice.status == "Paid")
            .group_by(Lead.source)
            .all()
        )
        for src, rev in inv_groups:
            name = src or "Unknown"
            if name not in chart_data:
                chart_data[name] = {"name": name, "leads": 0, "revenue": 0}
            chart_data[name]["revenue"] = float(rev or 0)
    elif group_by == "service_type":
        lead_groups = lead_q.with_entities(Lead.service_type, func.count(Lead.id)).group_by(Lead.service_type).all()
        for srv, cnt in lead_groups:
            name = srv or "Unknown"
            chart_data[name] = {"name": name, "leads": cnt, "revenue": 0}
        inv_groups = (
            inv_sum_q.with_entities(Lead.service_type, func.sum(Invoice.total))
            .filter(Invoice.status == "Paid")
            .group_by(Lead.service_type)
            .all()
        )
        for srv, rev in inv_groups:
            name = srv or "Unknown"
            if name not in chart_data:
                chart_data[name] = {"name": name, "leads": 0, "revenue": 0}
            chart_data[name]["revenue"] = float(rev or 0)
    else:
        day_key = _day_key(Lead.created_at, db)
        lead_groups = (
            lead_q.with_entities(day_key, func.count(Lead.id))
            .group_by(day_key)
            .all()
        )
        for dt, cnt in lead_groups:
            name = dt if dt else "Unknown"
            chart_data[name] = {"name": name, "leads": cnt, "revenue": 0}
        inv_day = _day_key(Invoice.created_at, db)
        inv_groups = (
            inv_sum_q.with_entities(inv_day, func.sum(Invoice.total))
            .filter(Invoice.status == "Paid")
            .group_by(inv_day)
            .all()
        )
        for dt, rev in inv_groups:
            name = dt if dt else "Unknown"
            if name not in chart_data:
                chart_data[name] = {"name": name, "leads": 0, "revenue": 0}
            chart_data[name]["revenue"] = float(rev or 0)

    grid_results = inv_q.order_by(Invoice.created_at.desc()).limit(50).all()
    client_ids = [inv.client_id for inv, _, _ in grid_results]
    clients = db.query(Client).filter(Client.id.in_(client_ids)).all() if client_ids else []
    client_map = {c.id: c.name for c in clients}
    grid_data = []
    for inv, l_src, l_stype in grid_results:
        status_val = inv.status
        if hasattr(status_val, "value"):
            status_val = status_val.value
        grid_data.append({
            "id": inv.invoice_number,
            "client": client_map.get(inv.client_id, "Unknown"),
            "amount": float(inv.total or 0),
            "status": status_val,
            "source": l_src or "Unknown",
            "service_type": l_stype or "Unknown",
            "date": inv.created_at.strftime("%Y-%m-%d") if inv.created_at else "",
        })

    chart_list = list(chart_data.values())
    if group_by == "date":
        chart_list.sort(key=lambda x: x["name"])
    else:
        chart_list.sort(key=lambda x: x["revenue"], reverse=True)

    return {
        "kpis": {
            "totalRevenue": float(total_revenue),
            "totalInvoices": total_invoices,
            "totalLeads": total_leads,
            "convertedLeads": converted_leads,
        },
        "chartData": chart_list,
        "gridData": grid_data,
    }
