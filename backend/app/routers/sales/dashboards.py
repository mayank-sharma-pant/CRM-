from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.core.enums import DashboardWidgetViz
from app.models.core.user import User
from app.models.sales.dashboard import Dashboard, DashboardWidget
from app.models.sales.saved_report import SavedReport
from app.utils.audit import log_activity
from app.utils.datetime_json import isoformat_utc
from app.utils.dependencies import (
    apply_company_scope,
    ensure_company_access,
    get_current_user,
    require_admin_or_md,
)

router = APIRouter()

_VALID_VIZ = {v.value for v in DashboardWidgetViz}


class WidgetCreate(BaseModel):
    saved_report_id: int
    visualization: str
    title: Optional[str] = None
    position: Optional[int] = None


class WidgetUpdate(BaseModel):
    saved_report_id: Optional[int] = None
    visualization: Optional[str] = None
    title: Optional[str] = None
    position: Optional[int] = None


def _enum_val(value):
    return value.value if hasattr(value, "value") else value


def _normalize_viz(raw: Optional[str], *, required: bool) -> Optional[str]:
    if raw is None or not str(raw).strip():
        if required:
            raise HTTPException(status_code=400, detail="visualization is required")
        return None
    value = str(raw).strip().lower()
    if value not in _VALID_VIZ:
        raise HTTPException(status_code=400, detail="Invalid visualization. Allowed: kpi, chart, table.")
    return value


def _get_or_create_dashboard(db: Session, current_user: User) -> Dashboard:
    dashboard = apply_company_scope(db.query(Dashboard), Dashboard, current_user).first()
    if dashboard is None:
        dashboard = Dashboard(
            company_id=current_user.company_id,
            name="Company dashboard",
        )
        db.add(dashboard)
        db.commit()
        db.refresh(dashboard)
    return dashboard


def _serialize_report_ref(report: Optional[SavedReport]) -> Optional[dict]:
    if report is None:
        return None
    return {
        "id": report.id,
        "name": report.name,
        "report_type": _enum_val(report.report_type),
    }


def _serialize_widget(widget: DashboardWidget) -> dict:
    return {
        "id": widget.id,
        "dashboard_id": widget.dashboard_id,
        "saved_report_id": widget.saved_report_id,
        "visualization": _enum_val(widget.visualization),
        "title": widget.title,
        "position": widget.position,
        "created_at": isoformat_utc(widget.created_at),
        "report": _serialize_report_ref(widget.saved_report),
    }


def _serialize_dashboard(dashboard: Dashboard) -> dict:
    widgets = sorted(dashboard.widgets or [], key=lambda w: (w.position or 0, w.id or 0))
    return {
        "id": dashboard.id,
        "name": dashboard.name,
        "widgets": [_serialize_widget(w) for w in widgets],
        "created_at": isoformat_utc(dashboard.created_at),
        "updated_at": isoformat_utc(dashboard.updated_at),
    }


def _report_in_company(db: Session, current_user, report_id: int) -> SavedReport:
    report = apply_company_scope(db.query(SavedReport), SavedReport, current_user).filter(
        SavedReport.id == report_id
    ).first()
    if report is None:
        raise HTTPException(status_code=400, detail="saved_report_id not found in this company")
    return report


def _widget_or_404(db: Session, current_user, widget_id: int) -> DashboardWidget:
    widget = apply_company_scope(db.query(DashboardWidget), DashboardWidget, current_user).filter(
        DashboardWidget.id == widget_id
    ).first()
    if widget is None:
        raise HTTPException(status_code=404, detail="Widget not found")
    ensure_company_access(widget, current_user)
    return widget


@router.get("/default")
def get_default_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    dashboard = _get_or_create_dashboard(db, current_user)
    # refresh widgets + reports
    dashboard = apply_company_scope(db.query(Dashboard), Dashboard, current_user).filter(
        Dashboard.id == dashboard.id
    ).first()
    return _serialize_dashboard(dashboard)


@router.post("/default/widgets", status_code=status.HTTP_201_CREATED)
def create_widget(
    payload: WidgetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    dashboard = _get_or_create_dashboard(db, current_user)
    report = _report_in_company(db, current_user, payload.saved_report_id)
    viz = _normalize_viz(payload.visualization, required=True)
    position = payload.position
    if position is None:
        max_pos = (
            db.query(DashboardWidget.position)
            .filter(DashboardWidget.dashboard_id == dashboard.id)
            .order_by(DashboardWidget.position.desc())
            .first()
        )
        position = (max_pos[0] + 1) if max_pos and max_pos[0] is not None else 0
    title = payload.title.strip()[:255] if payload.title and payload.title.strip() else None
    widget = DashboardWidget(
        company_id=current_user.company_id,
        dashboard_id=dashboard.id,
        saved_report_id=report.id,
        visualization=viz,
        title=title,
        position=position,
    )
    db.add(widget)
    db.flush()
    log_activity(
        db, user=current_user, action="created", entity_type="dashboard_widget",
        entity_id=widget.id, entity_name=title or report.name,
    )
    db.commit()
    db.refresh(widget)
    return _serialize_widget(widget)


@router.patch("/default/widgets/{widget_id:int}")
def update_widget(
    widget_id: int,
    payload: WidgetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    widget = _widget_or_404(db, current_user, widget_id)
    if payload.saved_report_id is not None:
        report = _report_in_company(db, current_user, payload.saved_report_id)
        widget.saved_report_id = report.id
    if payload.visualization is not None:
        widget.visualization = _normalize_viz(payload.visualization, required=True)
    if payload.title is not None:
        widget.title = payload.title.strip()[:255] if payload.title.strip() else None
    if payload.position is not None:
        widget.position = payload.position
    log_activity(
        db, user=current_user, action="updated", entity_type="dashboard_widget",
        entity_id=widget.id, entity_name=widget.title,
    )
    db.commit()
    db.refresh(widget)
    return _serialize_widget(widget)


@router.delete("/default/widgets/{widget_id:int}", status_code=status.HTTP_204_NO_CONTENT)
def delete_widget(
    widget_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    widget = _widget_or_404(db, current_user, widget_id)
    log_activity(
        db, user=current_user, action="deleted", entity_type="dashboard_widget",
        entity_id=widget.id, entity_name=widget.title,
    )
    db.delete(widget)
    db.commit()
    return None
