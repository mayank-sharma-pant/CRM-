"""Price book CRUD and entry management."""
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.core.user import User
from app.models.sales.price_book import PriceBook, PriceBookEntry
from app.models.sales.product import Product
from app.services.sales.price_books import set_default_book
from app.utils.dependencies import apply_company_scope, get_current_user, is_platform_admin

router = APIRouter()

BOOK_WRITE_ROLES = {"purchase", "md", "admin"}


class PriceBookCreate(BaseModel):
    name: str
    is_default: Optional[bool] = False


class PriceBookUpdate(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None
    is_default: Optional[bool] = None


class EntryIn(BaseModel):
    product_id: int
    unit_price: float


class EntriesWrite(BaseModel):
    entries: list[EntryIn]


def _require_company(user: User) -> int:
    if is_platform_admin(user) or user.company_id is None:
        raise HTTPException(status_code=403, detail="User must be assigned to a company")
    return user.company_id


def _assert_writable(user: User) -> None:
    if user.role not in BOOK_WRITE_ROLES:
        raise HTTPException(status_code=403, detail="Only purchase/MD/admin can modify price books")


def _get_book(db: Session, user: User, book_id: int) -> PriceBook:
    book = (
        apply_company_scope(db.query(PriceBook), PriceBook, user)
        .filter(PriceBook.id == book_id)
        .first()
    )
    if book is None:
        raise HTTPException(status_code=404, detail="Price book not found")
    return book


def _serialize_book(book: PriceBook, *, entry_count: int = 0) -> dict:
    return {
        "id": book.id,
        "name": book.name,
        "is_default": bool(book.is_default),
        "is_active": bool(book.is_active),
        "entry_count": entry_count,
    }


@router.get("")
def list_books(
    active_only: bool = Query(True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    company_id = _require_company(current_user)
    query = apply_company_scope(db.query(PriceBook), PriceBook, current_user)
    if active_only:
        query = query.filter(PriceBook.is_active.is_(True))
    books = query.order_by(PriceBook.is_default.desc(), PriceBook.name.asc()).all()
    entry_counts: dict[int, int] = {}
    if books:
        book_ids = [b.id for b in books]
        rows = (
            db.query(PriceBookEntry.price_book_id, func.count(PriceBookEntry.id))
            .filter(PriceBookEntry.price_book_id.in_(book_ids))
            .group_by(PriceBookEntry.price_book_id)
            .all()
        )
        entry_counts = {bid: cnt for bid, cnt in rows}

    return {
        "items": [_serialize_book(b, entry_count=entry_counts.get(b.id, 0)) for b in books],
    }


@router.post("", status_code=201)
def create_book(
    payload: PriceBookCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _assert_writable(current_user)
    company_id = _require_company(current_user)
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="name is required")
    existing = (
        apply_company_scope(db.query(PriceBook), PriceBook, current_user)
        .filter(PriceBook.name == name)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Price book name already exists")

    book = PriceBook(company_id=company_id, name=name, is_active=True, is_default=False)
    db.add(book)
    db.flush()
    if payload.is_default:
        set_default_book(db, book)
    db.commit()
    db.refresh(book)
    return _serialize_book(book)


@router.get("/{book_id}")
def get_book(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    book = _get_book(db, current_user, book_id)
    entries = (
        db.query(PriceBookEntry, Product)
        .join(Product, Product.id == PriceBookEntry.product_id)
        .filter(
            PriceBookEntry.price_book_id == book.id,
            PriceBookEntry.company_id == book.company_id,
        )
        .order_by(Product.name.asc())
        .all()
    )
    return {
        **_serialize_book(book, entry_count=len(entries)),
        "entries": [
            {
                "product_id": entry.product_id,
                "unit_price": float(entry.unit_price or 0),
                "product_name": product.name,
                "product_sku": product.sku,
            }
            for entry, product in entries
        ],
    }


@router.patch("/{book_id}")
def update_book(
    book_id: int,
    payload: PriceBookUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _assert_writable(current_user)
    book = _get_book(db, current_user, book_id)
    if payload.name is not None:
        name = payload.name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="name is required")
        clash = (
            apply_company_scope(db.query(PriceBook), PriceBook, current_user)
            .filter(PriceBook.name == name, PriceBook.id != book.id)
            .first()
        )
        if clash:
            raise HTTPException(status_code=400, detail="Price book name already exists")
        book.name = name
    if payload.is_active is not None:
        book.is_active = bool(payload.is_active)
    if payload.is_default is not None:
        if payload.is_default:
            set_default_book(db, book)
        else:
            book.is_default = False
    db.commit()
    db.refresh(book)
    return _serialize_book(book)


@router.delete("/{book_id}", status_code=204)
def delete_book(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _assert_writable(current_user)
    book = _get_book(db, current_user, book_id)
    db.delete(book)
    db.commit()
    return None


@router.put("/{book_id}/entries")
def upsert_entries(
    book_id: int,
    payload: EntriesWrite,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _assert_writable(current_user)
    book = _get_book(db, current_user, book_id)
    requested_ids = {e.product_id for e in payload.entries}
    for entry in payload.entries:
        if entry.unit_price < 0:
            raise HTTPException(status_code=400, detail="unit_price must be >= 0")
        product = (
            apply_company_scope(db.query(Product), Product, current_user)
            .filter(Product.id == entry.product_id)
            .first()
        )
        if product is None:
            raise HTTPException(status_code=400, detail=f"product_id {entry.product_id} not found in your company")

    existing = (
        db.query(PriceBookEntry)
        .filter(PriceBookEntry.price_book_id == book.id)
        .all()
    )
    by_product = {row.product_id: row for row in existing}
    for entry_in in payload.entries:
        row = by_product.get(entry_in.product_id)
        if row is None:
            row = PriceBookEntry(
                company_id=book.company_id,
                price_book_id=book.id,
                product_id=entry_in.product_id,
            )
            db.add(row)
        row.unit_price = Decimal(str(entry_in.unit_price))
    for product_id, row in by_product.items():
        if product_id not in requested_ids:
            db.delete(row)
    db.commit()
    return get_book(book_id, db, current_user)
