"""Accept/reject quotes (staff JWT and public portal)."""
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.core.enums import QuoteStatus
from app.models.sales.quote import Quote
from app.services.sales.sales_order_lifecycle import create_sales_order_from_quote
from app.services.sales.workflow import run_workflows


def _status(quote: Quote) -> str:
    value = quote.status
    return value.value if hasattr(value, "value") else str(value)


def accept_quote(db: Session, quote: Quote) -> Quote:
    if _status(quote) != QuoteStatus.DRAFT.value:
        raise HTTPException(status_code=400, detail="Only draft quotes can be accepted")
    create_sales_order_from_quote(db, quote)
    quote.status = QuoteStatus.ACCEPTED
    run_workflows(db, "quote_accepted", quote=quote)
    db.commit()
    db.refresh(quote)
    return quote


def reject_quote(db: Session, quote: Quote) -> Quote:
    if _status(quote) != QuoteStatus.DRAFT.value:
        raise HTTPException(status_code=400, detail="Only draft quotes can be rejected")
    quote.status = QuoteStatus.REJECTED
    db.commit()
    db.refresh(quote)
    return quote
