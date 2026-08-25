from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.core.user import User
from app.models.sales.saved_filter import SavedFilter
from app.services.sales.deal_views import ALLOWED_OBJECT_TYPES, normalize_filters
from app.utils.dependencies import apply_company_scope, ensure_company_access, get_current_user

router = APIRouter()


class SavedFilterCreate(BaseModel):
    name: str
    object_type: str = "deal"
    filters: Optional[dict] = None


class SavedFilterPatch(BaseModel):
    name: Optional[str] = None
    filters: Optional[dict] = None


def serialize(row: SavedFilter) -> dict:
    return {
        "id": row.id,
        "name": row.name,
        "object_type": row.object_type,
        "filters": row.filters or {},
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


def get_own_or_404(db: Session, current_user: User, filter_id: int) -> SavedFilter:
    row = (
        apply_company_scope(db.query(SavedFilter), SavedFilter, current_user)
        .filter(SavedFilter.id == filter_id, SavedFilter.user_id == current_user.id)
        .first()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Saved filter not found")
    ensure_company_access(row, current_user)
    return row


@router.get("")
def list_saved_filters(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.company_id is None:
        raise HTTPException(status_code=403, detail="User must belong to a company")
    rows = (
        apply_company_scope(db.query(SavedFilter), SavedFilter, current_user)
        .filter(SavedFilter.user_id == current_user.id)
        .order_by(SavedFilter.name.asc())
        .all()
    )
    return {"items": [serialize(r) for r in rows], "total": len(rows)}


@router.post("", status_code=status.HTTP_201_CREATED)
def create_saved_filter(
    payload: SavedFilterCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.company_id is None:
        raise HTTPException(status_code=403, detail="User must belong to a company")
    name = (payload.name or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="name is required")
    object_type = (payload.object_type or "deal").strip()
    if object_type not in ALLOWED_OBJECT_TYPES:
        raise HTTPException(status_code=400, detail="object_type must be deal")
    row = SavedFilter(
        company_id=current_user.company_id,
        user_id=current_user.id,
        name=name,
        object_type=object_type,
        filters=normalize_filters(payload.filters),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return serialize(row)


@router.get("/{filter_id:int}")
def get_saved_filter(
    filter_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return serialize(get_own_or_404(db, current_user, filter_id))


@router.patch("/{filter_id:int}")
def patch_saved_filter(
    filter_id: int,
    payload: SavedFilterPatch,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = get_own_or_404(db, current_user, filter_id)
    data = payload.model_dump(exclude_unset=True)
    if "name" in data:
        name = (data["name"] or "").strip()
        if not name:
            raise HTTPException(status_code=400, detail="name is required")
        row.name = name
    if "filters" in data:
        row.filters = normalize_filters(data["filters"])
    db.commit()
    db.refresh(row)
    return serialize(row)


@router.delete("/{filter_id:int}", status_code=status.HTTP_204_NO_CONTENT)
def delete_saved_filter(
    filter_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = get_own_or_404(db, current_user, filter_id)
    db.delete(row)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
