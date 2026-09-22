from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.core.user import User
from app.models.sales.quote_plan import QuotePlan
from app.utils.dependencies import apply_company_scope, get_current_user, require_admin_or_md

router = APIRouter()

_BILLING = {"monthly", "one_time"}


class QuotePlanIn(BaseModel):
    name: str
    tagline: Optional[str] = None
    billing_interval: str = "monthly"
    default_fee: Decimal = Decimal("0")
    fee_inclusive: bool = True
    scope_text: Optional[str] = None
    is_active: bool = True


class QuotePlanPatch(BaseModel):
    name: Optional[str] = None
    tagline: Optional[str] = None
    billing_interval: Optional[str] = None
    default_fee: Optional[Decimal] = None
    fee_inclusive: Optional[bool] = None
    scope_text: Optional[str] = None
    is_active: Optional[bool] = None


def _require_company(user: User) -> int:
    if user.company_id is None:
        raise HTTPException(status_code=403, detail="User must belong to a company")
    return user.company_id


def _money(value) -> str:
    return str(Decimal(value or 0).quantize(Decimal("0.01")))


def _serialize(row: QuotePlan) -> dict:
    return {
        "id": row.id,
        "company_id": row.company_id,
        "name": row.name,
        "tagline": row.tagline,
        "billing_interval": row.billing_interval,
        "default_fee": _money(row.default_fee),
        "fee_inclusive": bool(row.fee_inclusive),
        "scope_text": row.scope_text,
        "is_active": bool(row.is_active),
        "created_by_id": row.created_by_id,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


def _get_plan(db: Session, plan_id: int, current_user: User) -> QuotePlan:
    row = (
        apply_company_scope(db.query(QuotePlan), QuotePlan, current_user)
        .filter(QuotePlan.id == plan_id)
        .first()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Plan not found")
    return row


def _clean_name(value: str) -> str:
    text = (value or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="name is required")
    if len(text) > 200:
        raise HTTPException(status_code=400, detail="name must be at most 200 characters")
    return text


def _clean_interval(value: str) -> str:
    interval = (value or "").strip().lower()
    if interval not in _BILLING:
        raise HTTPException(status_code=400, detail="billing_interval must be monthly or one_time")
    return interval


@router.get("")
def list_plans(
    active_only: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_company(current_user)
    query = apply_company_scope(db.query(QuotePlan), QuotePlan, current_user)
    if active_only:
        query = query.filter(QuotePlan.is_active.is_(True))
    rows = query.order_by(QuotePlan.id.desc()).all()
    return {"items": [_serialize(r) for r in rows], "total": len(rows)}


@router.post("", status_code=201)
def create_plan(
    payload: QuotePlanIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    company_id = _require_company(current_user)
    if payload.default_fee < 0:
        raise HTTPException(status_code=400, detail="default_fee must be >= 0")
    row = QuotePlan(
        company_id=company_id,
        name=_clean_name(payload.name),
        tagline=(payload.tagline or "").strip() or None,
        billing_interval=_clean_interval(payload.billing_interval),
        default_fee=payload.default_fee,
        fee_inclusive=bool(payload.fee_inclusive),
        scope_text=(payload.scope_text or "").strip() or None,
        is_active=bool(payload.is_active),
        created_by_id=current_user.id,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _serialize(row)


@router.patch("/{plan_id:int}")
def update_plan(
    plan_id: int,
    payload: QuotePlanPatch,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    row = _get_plan(db, plan_id, current_user)
    if payload.name is not None:
        row.name = _clean_name(payload.name)
    if payload.tagline is not None:
        row.tagline = payload.tagline.strip() or None
    if payload.billing_interval is not None:
        row.billing_interval = _clean_interval(payload.billing_interval)
    if payload.default_fee is not None:
        if payload.default_fee < 0:
            raise HTTPException(status_code=400, detail="default_fee must be >= 0")
        row.default_fee = payload.default_fee
    if payload.fee_inclusive is not None:
        row.fee_inclusive = bool(payload.fee_inclusive)
    if payload.scope_text is not None:
        row.scope_text = payload.scope_text.strip() or None
    if payload.is_active is not None:
        row.is_active = bool(payload.is_active)
    db.commit()
    db.refresh(row)
    return _serialize(row)


@router.delete("/{plan_id:int}", status_code=204)
def delete_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    row = _get_plan(db, plan_id, current_user)
    db.delete(row)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
