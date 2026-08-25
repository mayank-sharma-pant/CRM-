from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.core.enums import UserStatus
from app.models.core.team_membership import TeamMembership
from app.models.core.user import User
from app.models.sales.sales_quota import SalesQuota
from app.services.sales.forecasting import build_report, format_money, month_bounds
from app.utils.dependencies import (
    apply_company_scope,
    ensure_company_access,
    get_active_team_id,
    get_current_user,
)

router = APIRouter()


class QuotaUpsert(BaseModel):
    user_id: int
    year: int
    month: int
    amount: Decimal


def _role(user: User) -> str:
    r = getattr(user, "role", None)
    return str(getattr(r, "value", r)) if r is not None else ""


def _validate_period(year: int, month: int) -> None:
    try:
        month_bounds(year, month)
    except ValueError:
        raise HTTPException(status_code=400, detail="month must be between 1 and 12")


def _active_company_users_query(db: Session, current_user: User):
    return apply_company_scope(db.query(User), User, current_user).filter(
        User.is_active.is_(True),
        User.status == UserStatus.ACTIVE,
    )


def _visible_users(
    db: Session, current_user: User, active_team_id: Optional[int],
) -> list[User]:
    base = _active_company_users_query(db, current_user)
    role = _role(current_user)
    if role in ("admin", "md"):
        return base.order_by(User.full_name, User.id).all()
    if role == "manager":
        member_ids: list[int] = []
        if active_team_id is not None:
            member_ids = [
                r[0]
                for r in apply_company_scope(db.query(User.id), User, current_user)
                .join(TeamMembership, TeamMembership.user_id == User.id)
                .filter(TeamMembership.team_id == active_team_id)
                .all()
            ]
        visible_ids = set(member_ids + [current_user.id])
        return base.filter(User.id.in_(list(visible_ids))).order_by(User.full_name, User.id).all()
    return base.filter(User.id == current_user.id).all()


def _can_write_quota_for(
    db: Session,
    current_user: User,
    target_user_id: int,
    active_team_id: Optional[int],
) -> bool:
    role = _role(current_user)
    if role in ("admin", "md"):
        return True
    if role != "manager":
        return False
    if target_user_id == current_user.id:
        return True
    if active_team_id is None:
        return False
    membership = apply_company_scope(db.query(TeamMembership), TeamMembership, current_user).filter(
        TeamMembership.team_id == active_team_id,
        TeamMembership.user_id == target_user_id,
    ).first()
    return membership is not None


def _require_write_access(
    db: Session,
    current_user: User,
    target_user_id: int,
    active_team_id: Optional[int],
) -> User:
    if current_user.company_id is None:
        raise HTTPException(status_code=403, detail="User must be assigned to a company")
    target = _active_company_users_query(db, current_user).filter(User.id == target_user_id).first()
    if target is None:
        raise HTTPException(status_code=400, detail="user_id not found in your company")
    if not _can_write_quota_for(db, current_user, target_user_id, active_team_id):
        raise HTTPException(status_code=403, detail="You cannot set quotas for this user")
    return target


def _require_delete_access(
    db: Session,
    current_user: User,
    target_user_id: int,
    active_team_id: Optional[int],
) -> None:
    if current_user.company_id is None:
        raise HTTPException(status_code=403, detail="User must be assigned to a company")
    role = _role(current_user)
    if role in ("admin", "md"):
        return
    if role == "manager":
        if not _can_write_quota_for(db, current_user, target_user_id, active_team_id):
            raise HTTPException(status_code=403, detail="You cannot delete quotas for this user")
        return
    raise HTTPException(status_code=403, detail="You cannot delete quotas")


def _serialize_quota(q: SalesQuota) -> dict:
    return {
        "id": q.id,
        "user_id": q.user_id,
        "year": q.year,
        "month": q.month,
        "amount": format_money(q.amount),
    }


@router.get("/quotas")
def list_quotas(
    year: int = Query(...),
    month: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    active_team_id: Optional[int] = Depends(get_active_team_id),
):
    if current_user.company_id is None:
        raise HTTPException(status_code=403, detail="User must be assigned to a company")
    _validate_period(year, month)
    visible = _visible_users(db, current_user, active_team_id)
    visible_ids = [u.id for u in visible]
    if not visible_ids:
        return {"items": []}
    rows = (
        apply_company_scope(db.query(SalesQuota), SalesQuota, current_user)
        .filter(
            SalesQuota.year == year,
            SalesQuota.month == month,
            SalesQuota.user_id.in_(visible_ids),
        )
        .order_by(SalesQuota.user_id)
        .all()
    )
    return {"items": [_serialize_quota(q) for q in rows]}


@router.put("/quotas")
def upsert_quota(
    payload: QuotaUpsert,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    active_team_id: Optional[int] = Depends(get_active_team_id),
):
    _validate_period(payload.year, payload.month)
    if payload.amount < 0:
        raise HTTPException(status_code=400, detail="amount must be >= 0")
    _require_write_access(db, current_user, payload.user_id, active_team_id)

    quota = (
        apply_company_scope(db.query(SalesQuota), SalesQuota, current_user)
        .filter(
            SalesQuota.user_id == payload.user_id,
            SalesQuota.year == payload.year,
            SalesQuota.month == payload.month,
        )
        .first()
    )
    if quota is None:
        quota = SalesQuota(
            company_id=current_user.company_id,
            user_id=payload.user_id,
            year=payload.year,
            month=payload.month,
            amount=payload.amount,
        )
        db.add(quota)
    else:
        quota.amount = payload.amount
    db.commit()
    db.refresh(quota)
    return _serialize_quota(quota)


@router.delete("/quotas/{quota_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_quota(
    quota_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    active_team_id: Optional[int] = Depends(get_active_team_id),
):
    quota = apply_company_scope(db.query(SalesQuota), SalesQuota, current_user).filter(
        SalesQuota.id == quota_id
    ).first()
    if quota is None:
        raise HTTPException(status_code=404, detail="Quota not found")
    ensure_company_access(quota, current_user)
    _require_delete_access(db, current_user, quota.user_id, active_team_id)
    db.delete(quota)
    db.commit()


@router.get("/report")
def forecast_report(
    year: int = Query(...),
    month: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    active_team_id: Optional[int] = Depends(get_active_team_id),
):
    if current_user.company_id is None:
        raise HTTPException(status_code=403, detail="User must be assigned to a company")
    _validate_period(year, month)
    users = _visible_users(db, current_user, active_team_id)
    items = build_report(
        db,
        company_id=current_user.company_id,
        users=users,
        year=year,
        month=month,
    )
    return {"items": items}
