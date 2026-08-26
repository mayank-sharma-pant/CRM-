"""Report schedule settings and cron runner."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.core.company_settings import CompanySettings
from app.models.core.user import User
from app.models.sales.saved_report import SavedReport
from app.services.sales.report_schedule import (
    apply_report_schedule_update,
    run_scheduled_reports,
    serialize_report_schedule,
)
from app.utils.dependencies import apply_company_scope, get_current_user, require_admin_or_md

router = APIRouter()


class ReportScheduleWrite(BaseModel):
    enabled: Optional[bool] = None
    frequency: Optional[str] = None
    saved_report_id: Optional[int] = None


def _company_id(user: User) -> int:
    if user.company_id is None:
        raise HTTPException(status_code=403, detail="User must belong to a company")
    return user.company_id


def _settings(db: Session, company_id: int) -> CompanySettings:
    row = db.query(CompanySettings).filter(CompanySettings.company_id == company_id).first()
    if row is None:
        row = CompanySettings(company_id=company_id, company_name="Company")
        db.add(row)
        db.flush()
    return row


def _validate_report(db: Session, current_user: User, report_id: int | None) -> None:
    if report_id is None:
        return
    report = apply_company_scope(db.query(SavedReport), SavedReport, current_user).filter(
        SavedReport.id == report_id
    ).first()
    if report is None:
        raise HTTPException(status_code=400, detail="saved_report_id not found")


@router.get("")
def get_report_schedule(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = db.query(CompanySettings).filter(
        CompanySettings.company_id == _company_id(current_user)
    ).first()
    return serialize_report_schedule(row)


@router.put("")
def put_report_schedule(
    payload: ReportScheduleWrite,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    if payload.saved_report_id is not None:
        _validate_report(db, current_user, payload.saved_report_id)
    row = _settings(db, _company_id(current_user))
    try:
        apply_report_schedule_update(row, payload.model_dump(exclude_unset=True))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if row.report_schedule_enabled and not row.report_schedule_saved_report_id:
        raise HTTPException(status_code=400, detail="saved_report_id is required when schedule is enabled")
    if row.report_schedule_enabled and not row.report_schedule_frequency:
        row.report_schedule_frequency = "weekly"
    db.commit()
    db.refresh(row)
    return serialize_report_schedule(row)


@router.post("/run")
def run_report_schedule(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    return run_scheduled_reports(db)
