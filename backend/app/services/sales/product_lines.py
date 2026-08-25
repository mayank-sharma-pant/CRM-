from dataclasses import dataclass
from decimal import Decimal
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.core.user import User
from app.models.ops.stock_item import StockItem
from app.models.sales.product import Product
from app.services.finance.gst import line_tax
from app.utils.dependencies import apply_company_scope


@dataclass(frozen=True)
class ResolvedSaleLine:
    description: str
    quantity: int
    unit_price: Decimal
    hsn: Optional[str]
    tax_rate: Decimal
    line_amount: Decimal
    tax: float
    product_id: Optional[int]
    deduct_stock_item_id: Optional[int]


def _attr(item, name, default=None):
    if isinstance(item, dict):
        return item.get(name, default)
    return getattr(item, name, default)


def resolve_sale_lines(db: Session, *, company_id: int, items: list, company_tax_rate: float) -> list[ResolvedSaleLine]:
    resolved: list[ResolvedSaleLine] = []
    for item in items:
        product_id = _attr(item, "product_id")
        product = None
        if product_id is not None:
            product = (
                db.query(Product)
                .filter(Product.id == product_id, Product.company_id == company_id)
                .first()
            )
            if product is None:
                raise ValueError("product_id not found in your company")
            if not product.is_active:
                raise ValueError("product is inactive")

        req_description = str(_attr(item, "description") or "").strip()
        req_price = _attr(item, "unit_price")
        req_hsn = _attr(item, "hsn")
        if isinstance(req_hsn, str):
            req_hsn = req_hsn.strip() or None

        description = req_description or (product.name if product is not None else "")
        unit_price = product.unit_price if product is not None and req_price is None else req_price
        hsn = req_hsn if req_hsn is not None else (product.hsn if product is not None else None)
        tax_rate = Decimal(str(product.tax_rate if product is not None else company_tax_rate))
        qty = int(_attr(item, "quantity") or 0)
        price = Decimal(str(unit_price or 0))
        amount = Decimal(qty) * price
        legacy_stock = _attr(item, "stock_item_id")
        if product is not None and product.stock_item_id is not None:
            deduct = product.stock_item_id
        else:
            deduct = legacy_stock
        resolved.append(ResolvedSaleLine(
            description=description,
            quantity=qty,
            unit_price=price,
            hsn=hsn,
            tax_rate=tax_rate,
            line_amount=amount,
            tax=line_tax(amount, tax_rate),
            product_id=product.id if product is not None else None,
            deduct_stock_item_id=int(deduct) if deduct is not None else None,
        ))
    return resolved


def deduct_stock(db: Session, current_user: User, lines: list[ResolvedSaleLine]) -> set[int]:
    requested: dict[int, int] = {}
    for line in lines:
        if line.deduct_stock_item_id is None:
            continue
        requested[line.deduct_stock_item_id] = requested.get(line.deduct_stock_item_id, 0) + int(line.quantity or 0)
    if not requested:
        return set()
    rows = (
        apply_company_scope(db.query(StockItem), StockItem, current_user)
        .filter(StockItem.id.in_(requested.keys()))
        .with_for_update()
        .all()
    )
    stock_map = {s.id: s for s in rows}
    missing = [sid for sid in requested if sid not in stock_map]
    if missing:
        raise HTTPException(status_code=404, detail=f"Stock item(s) not found: {missing}")
    for sid, qty in requested.items():
        if int(stock_map[sid].quantity or 0) < qty:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for '{stock_map[sid].name}'. Available: {stock_map[sid].quantity}, requested: {qty}",
            )
    low: set[int] = set()
    for sid, qty in requested.items():
        stock_item = stock_map[sid]
        stock_item.quantity = int(stock_item.quantity or 0) - qty
        stock_item.updated_by_id = current_user.id
        if int(stock_item.quantity or 0) <= int(stock_item.reorder_level or 0):
            low.add(sid)
    return low
