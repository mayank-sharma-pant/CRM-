from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.core.user import User
from app.models.finance.invoice import InvoiceItem
from app.models.ops.stock_item import StockItem
from app.models.sales.product import Product
from app.models.sales.quote import QuoteItem
from app.utils.dependencies import apply_company_scope, get_current_user, is_platform_admin

router = APIRouter()

PRODUCT_WRITE_ROLES = {"purchase", "md", "admin"}


class ProductCreate(BaseModel):
    name: str
    sku: Optional[str] = None
    unit: Optional[str] = None
    unit_price: float
    tax_rate: float
    hsn: Optional[str] = None
    stock_item_id: Optional[int] = None
    is_active: Optional[bool] = None


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    sku: Optional[str] = None
    unit: Optional[str] = None
    unit_price: Optional[float] = None
    tax_rate: Optional[float] = None
    hsn: Optional[str] = None
    stock_item_id: Optional[int] = None
    is_active: Optional[bool] = None


def _blank_sku(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    stripped = value.strip()
    return stripped or None


def _require_company(user: User) -> None:
    if is_platform_admin(user) or user.company_id is None:
        raise HTTPException(status_code=403, detail="User must be assigned to a company")


def _assert_writable(user: User) -> None:
    if user.role not in PRODUCT_WRITE_ROLES:
        raise HTTPException(status_code=403, detail="Only purchase/MD/admin can modify products")


def _serialize(product: Product, stock_quantity=None) -> dict:
    return {
        "id": product.id,
        "name": product.name,
        "sku": product.sku,
        "unit": product.unit,
        "unit_price": float(product.unit_price or 0),
        "tax_rate": float(product.tax_rate),
        "hsn": product.hsn,
        "stock_item_id": product.stock_item_id,
        "stock_quantity": stock_quantity,
        "is_active": bool(product.is_active),
    }


def _get_product(db: Session, user: User, product_id: int) -> Product:
    product = (
        apply_company_scope(db.query(Product), Product, user)
        .filter(Product.id == product_id)
        .first()
    )
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


def _validate_stock(db: Session, user: User, stock_item_id: Optional[int]) -> None:
    if stock_item_id is None:
        return
    stock = (
        apply_company_scope(db.query(StockItem), StockItem, user)
        .filter(StockItem.id == stock_item_id)
        .first()
    )
    if stock is None:
        raise HTTPException(status_code=400, detail="stock_item_id not found in your company")


def _validate_tax_rate(tax_rate: float) -> None:
    if tax_rate < 0 or tax_rate > 100:
        raise HTTPException(status_code=400, detail="tax_rate must be between 0 and 100")


def _validate_unit_price(unit_price: float) -> None:
    if unit_price < 0:
        raise HTTPException(status_code=400, detail="unit_price must be >= 0")


def _assert_sku_unique(db: Session, user: User, sku: Optional[str], exclude_id: Optional[int] = None) -> None:
    if sku is None:
        return
    query = apply_company_scope(db.query(Product), Product, user).filter(Product.sku == sku)
    if exclude_id is not None:
        query = query.filter(Product.id != exclude_id)
    if query.first():
        raise HTTPException(status_code=400, detail="SKU already exists")


def _stock_quantities(db: Session, user: User, products: list[Product]) -> dict[int, Optional[float]]:
    stock_ids = {p.stock_item_id for p in products if p.stock_item_id is not None}
    if not stock_ids:
        return {}
    stocks = (
        apply_company_scope(db.query(StockItem), StockItem, user)
        .filter(StockItem.id.in_(stock_ids))
        .all()
    )
    return {s.id: float(s.quantity) if s.quantity is not None else None for s in stocks}


def _stock_quantity_for(db: Session, user: User, product: Product):
    if product.stock_item_id is None:
        return None
    qty_map = _stock_quantities(db, user, [product])
    return qty_map.get(product.stock_item_id)


@router.get("")
def list_products(
    q: Optional[str] = Query(None),
    active_only: bool = Query(True),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_company(current_user)
    query = apply_company_scope(db.query(Product), Product, current_user)
    if active_only:
        query = query.filter(Product.is_active.is_(True))
    if q:
        pattern = f"%{q}%"
        query = query.filter((Product.name.ilike(pattern)) | (Product.sku.ilike(pattern)))

    total = query.count()
    products = query.order_by(Product.id.desc()).offset(skip).limit(limit).all()
    qty_map = _stock_quantities(db, current_user, products)
    return {
        "items": [
            _serialize(p, stock_quantity=qty_map.get(p.stock_item_id) if p.stock_item_id else None)
            for p in products
        ],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.get("/{product_id}")
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_company(current_user)
    product = _get_product(db, current_user, product_id)
    return _serialize(product, stock_quantity=_stock_quantity_for(db, current_user, product))


@router.post("", status_code=201)
def create_product(
    body: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_company(current_user)
    _assert_writable(current_user)

    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name is required")

    _validate_unit_price(body.unit_price)
    _validate_tax_rate(body.tax_rate)
    sku = _blank_sku(body.sku)
    _assert_sku_unique(db, current_user, sku)
    _validate_stock(db, current_user, body.stock_item_id)

    unit = (body.unit or "unit").strip() or "unit"
    product = Product(
        company_id=current_user.company_id,
        name=name,
        sku=sku,
        unit=unit,
        unit_price=round(body.unit_price, 2),
        tax_rate=round(body.tax_rate, 2),
        hsn=(body.hsn or "").strip() or None,
        stock_item_id=body.stock_item_id,
        is_active=True if body.is_active is None else bool(body.is_active),
        created_by_id=current_user.id,
        updated_by_id=current_user.id,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return _serialize(product, stock_quantity=_stock_quantity_for(db, current_user, product))


@router.patch("/{product_id}")
def update_product(
    product_id: int,
    body: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_company(current_user)
    _assert_writable(current_user)
    product = _get_product(db, current_user, product_id)

    if body.name is not None:
        name = body.name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="Name cannot be empty")
        product.name = name

    if body.sku is not None:
        sku = _blank_sku(body.sku)
        _assert_sku_unique(db, current_user, sku, exclude_id=product.id)
        product.sku = sku

    if body.unit is not None:
        unit = body.unit.strip()
        if not unit:
            raise HTTPException(status_code=400, detail="Unit cannot be empty")
        product.unit = unit

    if body.unit_price is not None:
        _validate_unit_price(body.unit_price)
        product.unit_price = round(body.unit_price, 2)

    if body.tax_rate is not None:
        _validate_tax_rate(body.tax_rate)
        product.tax_rate = round(body.tax_rate, 2)

    if body.hsn is not None:
        product.hsn = body.hsn.strip() or None

    if body.stock_item_id is not None:
        _validate_stock(db, current_user, body.stock_item_id)
        product.stock_item_id = body.stock_item_id

    if body.is_active is not None:
        product.is_active = bool(body.is_active)

    product.updated_by_id = current_user.id
    db.commit()
    db.refresh(product)
    return _serialize(product, stock_quantity=_stock_quantity_for(db, current_user, product))


@router.delete("/{product_id}", status_code=204)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_company(current_user)
    _assert_writable(current_user)
    product = _get_product(db, current_user, product_id)

    quoted = db.query(QuoteItem).filter(QuoteItem.product_id == product.id).first()
    invoiced = db.query(InvoiceItem).filter(InvoiceItem.product_id == product.id).first()
    if quoted or invoiced:
        raise HTTPException(status_code=400, detail="Product is used on a quote or invoice")

    db.delete(product)
    db.commit()
    return Response(status_code=204)
