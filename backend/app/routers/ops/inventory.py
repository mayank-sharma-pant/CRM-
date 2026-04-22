from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.core.user import User
from app.models.ops.stock_item import StockItem
from app.utils.dependencies import get_current_user, apply_company_scope, is_platform_admin


router = APIRouter()

INVENTORY_VIEW_ROLES = {"purchase", "md", "manager", "sales", "admin"}
INVENTORY_MANAGE_ROLES = {"purchase", "md", "admin"}


def require_inventory_view_user(current_user: User = Depends(get_current_user)) -> User:
    if is_platform_admin(current_user) or current_user.company_id is None:
        raise HTTPException(status_code=403, detail="Company inventory context required")
    if current_user.role not in INVENTORY_VIEW_ROLES:
        raise HTTPException(status_code=403, detail="Inventory access required")
    return current_user


def require_inventory_manage_user(
    current_user: User = Depends(require_inventory_view_user),
) -> User:
    if current_user.role not in INVENTORY_MANAGE_ROLES:
        raise HTTPException(status_code=403, detail="Only purchase/MD/admin can modify inventory")
    return current_user


class StockItemCreate(BaseModel):
    name: str
    sku: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[str] = "unit"
    unit_price: float = 0.0
    quantity: int = 0
    reorder_level: int = 0


class StockItemUpdate(BaseModel):
    name: Optional[str] = None
    sku: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[str] = None
    unit_price: Optional[float] = None
    reorder_level: Optional[int] = None


class StockAdjustBody(BaseModel):
    quantity_change: int
    note: Optional[str] = None


def _serialize_stock(item: StockItem) -> dict:
    qty = int(item.quantity or 0)
    reorder = int(item.reorder_level or 0)
    return {
        "id": item.id,
        "name": item.name,
        "sku": item.sku,
        "category": item.category,
        "unit": item.unit,
        "unit_price": float(item.unit_price or 0),
        "quantity": qty,
        "reorder_level": reorder,
        "is_low_stock": qty <= reorder,
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "updated_at": item.updated_at.isoformat() if item.updated_at else None,
    }


@router.get("")
def list_stock_items(
    search: Optional[str] = Query(None),
    low_stock_only: bool = Query(False),
    in_stock_only: bool = Query(False),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_inventory_view_user),
):
    query = apply_company_scope(db.query(StockItem), StockItem, current_user)

    if search:
        pattern = f"%{search}%"
        query = query.filter(
            (StockItem.name.ilike(pattern))
            | (StockItem.sku.ilike(pattern))
            | (StockItem.category.ilike(pattern))
        )

    if low_stock_only:
        query = query.filter(StockItem.quantity <= StockItem.reorder_level)

    if in_stock_only:
        query = query.filter(StockItem.quantity > 0)

    total = query.count()
    items = query.order_by(StockItem.updated_at.desc(), StockItem.id.desc()).offset(skip).limit(limit).all()

    return {
        "items": [_serialize_stock(item) for item in items],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.post("")
def create_stock_item(
    body: StockItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_inventory_manage_user),
):
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name is required")
    if body.quantity < 0:
        raise HTTPException(status_code=400, detail="Quantity cannot be negative")
    if body.unit_price < 0:
        raise HTTPException(status_code=400, detail="Unit price cannot be negative")
    if body.reorder_level < 0:
        raise HTTPException(status_code=400, detail="Reorder level cannot be negative")

    sku = (body.sku or "").strip() or None
    if sku:
        existing = apply_company_scope(db.query(StockItem), StockItem, current_user).filter(StockItem.sku == sku).first()
        if existing:
            raise HTTPException(status_code=400, detail="SKU already exists in your company")

    item = StockItem(
        company_id=current_user.company_id,
        name=name,
        sku=sku,
        category=(body.category or "").strip() or None,
        unit=(body.unit or "unit").strip() or "unit",
        unit_price=round(body.unit_price, 2),
        quantity=int(body.quantity),
        reorder_level=int(body.reorder_level),
        created_by_id=current_user.id,
        updated_by_id=current_user.id,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return _serialize_stock(item)


@router.patch("/{stock_item_id}")
def update_stock_item(
    stock_item_id: int,
    body: StockItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_inventory_manage_user),
):
    item = apply_company_scope(db.query(StockItem), StockItem, current_user).filter(StockItem.id == stock_item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Stock item not found")

    if body.name is not None:
        name = body.name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="Name cannot be empty")
        item.name = name

    if body.sku is not None:
        sku = body.sku.strip() or None
        if sku:
            existing = (
                apply_company_scope(db.query(StockItem), StockItem, current_user)
                .filter(StockItem.sku == sku, StockItem.id != stock_item_id)
                .first()
            )
            if existing:
                raise HTTPException(status_code=400, detail="SKU already exists in your company")
        item.sku = sku

    if body.category is not None:
        item.category = body.category.strip() or None

    if body.unit is not None:
        unit = body.unit.strip()
        if not unit:
            raise HTTPException(status_code=400, detail="Unit cannot be empty")
        item.unit = unit

    if body.unit_price is not None:
        if body.unit_price < 0:
            raise HTTPException(status_code=400, detail="Unit price cannot be negative")
        item.unit_price = round(body.unit_price, 2)

    if body.reorder_level is not None:
        if body.reorder_level < 0:
            raise HTTPException(status_code=400, detail="Reorder level cannot be negative")
        item.reorder_level = int(body.reorder_level)

    item.updated_by_id = current_user.id
    item.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(item)
    return _serialize_stock(item)


@router.post("/{stock_item_id}/adjust")
def adjust_stock_item_quantity(
    stock_item_id: int,
    body: StockAdjustBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_inventory_manage_user),
):
    item = apply_company_scope(db.query(StockItem), StockItem, current_user).filter(StockItem.id == stock_item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Stock item not found")
    if body.quantity_change == 0:
        raise HTTPException(status_code=400, detail="Quantity change cannot be zero")

    new_qty = int(item.quantity or 0) + int(body.quantity_change)
    if new_qty < 0:
        raise HTTPException(status_code=400, detail="Insufficient stock for this adjustment")

    item.quantity = new_qty
    item.updated_by_id = current_user.id
    item.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(item)
    return _serialize_stock(item)


@router.delete("/{stock_item_id}")
def delete_stock_item(
    stock_item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_inventory_manage_user),
):
    item = apply_company_scope(db.query(StockItem), StockItem, current_user).filter(StockItem.id == stock_item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Stock item not found")

    db.delete(item)
    db.commit()
    return {"detail": "Stock item deleted successfully", "id": stock_item_id}
