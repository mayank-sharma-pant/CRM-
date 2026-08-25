from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.core.user import User
from app.models.sales.dashboard import DashboardWidget
from app.models.sales.saved_report import SavedReport
from app.routers.finance.export import make_csv_response
from app.services.sales.report_runner import (
    normalize_filters,
    normalize_report_type,
    run_leads_invoices_report,
)
from app.utils.audit import log_activity
from app.utils.datetime_json import isoformat_utc
from app.utils.dependencies import (
    apply_company_scope,
    ensure_company_access,
    get_current_user,
    require_admin_or_md,
)

router = APIRouter()


class SavedReportCreate(BaseModel):
    name: str
    report_type: str
    filters: Optional[dict] = None


class SavedReportUpdate(BaseModel):
    name: Optional[str] = None
    report_type: Optional[str] = None
    filters: Optional[dict] = None


def _enum_val(value):
    return value.value if hasattr(value, "value") else value


def _serialize(report: SavedReport) -> dict:
    return {
        "id": report.id,
        "company_id": report.company_id,
        "name": report.name,
        "report_type": _enum_val(report.report_type),
        "filters": report.filters or {},
        "created_by_id": report.created_by_id,
        "created_at": isoformat_utc(report.created_at),
        "updated_at": isoformat_utc(report.updated_at),
    }


def _get_or_404(db: Session, current_user, report_id: int) -> SavedReport:
    report = apply_company_scope(db.query(SavedReport), SavedReport, current_user).filter(
        SavedReport.id == report_id
    ).first()
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    ensure_company_access(report, current_user)
    return report


def _require_name(raw: Optional[str], *, required: bool) -> Optional[str]:
    if raw is None:
        if required:
            raise HTTPException(status_code=400, detail="name is required")
        return None
    name = raw.strip()
    if not name:
        raise HTTPException(status_code=400, detail="name is required")
    return name[:255]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_saved_report(
    payload: SavedReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    name = _require_name(payload.name, required=True)
    report_type = normalize_report_type(payload.report_type)
    filters = normalize_filters(payload.filters)
    report = SavedReport(
        company_id=current_user.company_id,
        name=name,
        report_type=report_type,
        filters=filters,
        created_by_id=current_user.id,
    )
    db.add(report)
    db.flush()
    log_activity(
        db, user=current_user, action="created", entity_type="saved_report",
        entity_id=report.id, entity_name=report.name,
    )
    db.commit()
    db.refresh(report)
    return _serialize(report)


@router.get("")
def list_saved_reports(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = apply_company_scope(db.query(SavedReport), SavedReport, current_user)
    total = query.count()
    rows = query.order_by(SavedReport.created_at.desc()).offset(skip).limit(limit).all()
    return {"items": [_serialize(r) for r in rows], "total": total}


@router.get("/{report_id:int}")
def get_saved_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return _serialize(_get_or_404(db, current_user, report_id))


@router.patch("/{report_id:int}")
def update_saved_report(
    report_id: int,
    payload: SavedReportUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    report = _get_or_404(db, current_user, report_id)
    if payload.name is not None:
        report.name = _require_name(payload.name, required=True)
    if payload.report_type is not None:
        report.report_type = normalize_report_type(payload.report_type)
    if payload.filters is not None:
        report.filters = normalize_filters(payload.filters)
    log_activity(
        db, user=current_user, action="updated", entity_type="saved_report",
        entity_id=report.id, entity_name=report.name,
    )
    db.commit()
    db.refresh(report)
    return _serialize(report)


@router.delete("/{report_id:int}", status_code=status.HTTP_204_NO_CONTENT)
def delete_saved_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    report = _get_or_404(db, current_user, report_id)
    db.query(DashboardWidget).filter(
        DashboardWidget.saved_report_id == report.id,
        DashboardWidget.company_id == current_user.company_id,
    ).delete(synchronize_session=False)
    log_activity(
        db, user=current_user, action="deleted", entity_type="saved_report",
        entity_id=report.id, entity_name=report.name,
    )
    db.delete(report)
    db.commit()
    return None


@router.get("/{report_id:int}/run")
def run_saved_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    report = _get_or_404(db, current_user, report_id)
    return run_leads_invoices_report(db, current_user, report.filters or {})


@router.get("/{report_id:int}/csv")
def csv_saved_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    report = _get_or_404(db, current_user, report_id)
    result = run_leads_invoices_report(db, current_user, report.filters or {})
    headers = ["Invoice", "Client", "Date", "Source", "Product", "Status", "Amount"]
    rows = [
        [r.get("id"), r.get("client"), r.get("date"), r.get("source"), r.get("service_type"), r.get("status"), r.get("amount")]
        for r in result.get("gridData") or []
    ]
    safe_name = "".join(ch if ch.isalnum() or ch in "-_" else "_" for ch in report.name)[:40] or "report"
    return make_csv_response(rows, headers, f"{safe_name}.csv")
