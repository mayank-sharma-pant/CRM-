from decimal import Decimal
from typing import Optional

from sqlalchemy.orm import Session

from app.models.sales.price_book import PriceBook, PriceBookEntry
from app.models.sales.product import Product


def get_default_book(db: Session, company_id: int) -> Optional[PriceBook]:
    return (
        db.query(PriceBook)
        .filter(
            PriceBook.company_id == company_id,
            PriceBook.is_default.is_(True),
            PriceBook.is_active.is_(True),
        )
        .first()
    )


def entry_price_map(db: Session, *, company_id: int, price_book_id: int) -> dict[int, Decimal]:
    rows = (
        db.query(PriceBookEntry)
        .filter(
            PriceBookEntry.company_id == company_id,
            PriceBookEntry.price_book_id == price_book_id,
        )
        .all()
    )
    return {row.product_id: Decimal(str(row.unit_price or 0)) for row in rows}


def resolve_product_unit_price(
    db: Session,
    *,
    company_id: int,
    product: Product,
    price_book_id: Optional[int],
    explicit_price,
) -> Decimal:
    if explicit_price is not None:
        return Decimal(str(explicit_price))

    book_id = price_book_id
    if book_id is None:
        default = get_default_book(db, company_id)
        book_id = default.id if default else None

    if book_id is not None:
        entry = (
            db.query(PriceBookEntry)
            .filter(
                PriceBookEntry.company_id == company_id,
                PriceBookEntry.price_book_id == book_id,
                PriceBookEntry.product_id == product.id,
            )
            .first()
        )
        if entry is not None:
            return Decimal(str(entry.unit_price or 0))

    return Decimal(str(product.unit_price or 0))


def validate_price_book_id(db: Session, company_id: int, price_book_id: Optional[int]) -> None:
    if price_book_id is None:
        return
    book = (
        db.query(PriceBook)
        .filter(
            PriceBook.id == price_book_id,
            PriceBook.company_id == company_id,
            PriceBook.is_active.is_(True),
        )
        .first()
    )
    if book is None:
        raise ValueError("price_book_id not found in your company")


def set_default_book(db: Session, book: PriceBook) -> None:
    (
        db.query(PriceBook)
        .filter(PriceBook.company_id == book.company_id, PriceBook.id != book.id)
        .update({PriceBook.is_default: False}, synchronize_session=False)
    )
    book.is_default = True
