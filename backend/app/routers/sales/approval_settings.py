"""Approval threshold settings."""
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.core.company_settings import CompanySettings
from app.models.core.user import User
from app.services.sales.approvals import apply_approval_settings_update, serialize_approval_settings
from app.utils.dependencies import get_current_user, require_admin_or_md

router = APIRouter()


class ApprovalSettingsWrite(BaseModel):
    deal_approval_amount_threshold: Optional[Decimal] = None
    discount_approval_percent_threshold: Optional[float] = None


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


@router.get("")
def get_approval_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = db.query(CompanySettings).filter(
        CompanySettings.company_id == _company_id(current_user)
    ).first()
    return serialize_approval_settings(row)


@router.put("")
def put_approval_settings(
    payload: ApprovalSettingsWrite,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    row = _settings(db, _company_id(current_user))
    try:
        apply_approval_settings_update(row, payload.model_dump(exclude_unset=True))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    db.commit()
    db.refresh(row)
    return serialize_approval_settings(row)
