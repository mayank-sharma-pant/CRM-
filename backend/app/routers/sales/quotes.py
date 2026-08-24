import uuid
from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.core.enums import InvoiceStatus, QuoteStatus
from app.models.core.user import User
from app.models.finance.invoice import Invoice, InvoiceItem
from app.models.sales.client import Client
from app.models.sales.deal import Deal
from app.models.sales.quote import Quote, QuoteItem
from app.services.sales.workflow import run_workflows
from app.utils.dependencies import apply_company_scope, ensure_company_access, get_current_user

router = APIRouter()


class QuoteItemIn(BaseModel):
    description: str
    quantity: int = 1
    unit_price: Decimal


class QuoteCreate(BaseModel):
    client_id: int
    deal_id: Optional[int] = None
    title: Optional[str] = None
    notes: Optional[str] = None
    items: List[QuoteItemIn]


def _money(value) -> str:
    return str(Decimal(value or 0).quantize(Decimal("0.01")))


def _serialize(quote: Quote, payment_url=None) -> dict:
    return {
        "id": quote.id,
        "quote_number": quote.quote_number,
        "title": quote.title,
        "deal_id": quote.deal_id,
        "client_id": quote.client_id,
        "status": quote.status.value if hasattr(quote.status, "value") else quote.status,
        "subtotal": _money(quote.subtotal),
        "tax": _money(quote.tax),
        "total": _money(quote.total),
        "notes": quote.notes,
        "invoice_id": quote.invoice_id,
        "payment_url": payment_url,
        "items": [
            {
                "description": it.description,
                "quantity": it.quantity,
                "unit_price": _money(it.unit_price),
                "total": _money(it.total),
            }
            for it in quote.items
        ],
    }


def _payment_url(db: Session, quote: Quote):
    if not quote.invoice_id:
        return None
    invoice = db.query(Invoice).filter(Invoice.id == quote.invoice_id).first()
    return invoice.payment_url if invoice else None


def _get_quote(db: Session, current_user: User, quote_id: int) -> Quote:
    quote = apply_company_scope(db.query(Quote), Quote, current_user).filter(Quote.id == quote_id).first()
    if quote is None:
        raise HTTPException(status_code=404, detail="Quote not found")
    ensure_company_access(quote, current_user)
    return quote


@router.post("", status_code=201)
def create_quote(payload: QuoteCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.company_id is None:
        raise HTTPException(status_code=403, detail="User must be assigned to a company")
    if not payload.items:
        raise HTTPException(status_code=400, detail="At least one line item is required")

    client = apply_company_scope(db.query(Client), Client, current_user).filter(Client.id == payload.client_id).first()
    if client is None:
        raise HTTPException(status_code=400, detail="client_id not found in your company")

    if payload.deal_id is not None:
        deal = apply_company_scope(db.query(Deal), Deal, current_user).filter(Deal.id == payload.deal_id).first()
        if deal is None:
            raise HTTPException(status_code=400, detail="deal_id not found in your company")

    subtotal = Decimal("0")
    for item in payload.items:
        if item.quantity <= 0:
            raise HTTPException(status_code=400, detail="quantity must be > 0")
        if item.unit_price < 0:
            raise HTTPException(status_code=400, detail="unit_price must be >= 0")
        subtotal += Decimal(item.quantity) * item.unit_price

    quote = Quote(
        company_id=current_user.company_id,
        quote_number=f"QUO-{uuid.uuid4().hex[:8].upper()}",
        title=payload.title,
        deal_id=payload.deal_id,
        client_id=payload.client_id,
        status=QuoteStatus.DRAFT,
        subtotal=subtotal,
        tax=Decimal("0"),
        total=subtotal,
        notes=payload.notes,
        created_by_id=current_user.id,
    )
    db.add(quote)
    db.flush()
    for item in payload.items:
        line_total = Decimal(item.quantity) * item.unit_price
        db.add(QuoteItem(
            company_id=current_user.company_id,
            quote_id=quote.id,
            description=item.description,
            quantity=item.quantity,
            unit_price=item.unit_price,
            total=line_total,
        ))
    db.commit()
    db.refresh(quote)
    return _serialize(quote)


@router.get("")
def list_quotes(
    deal_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = apply_company_scope(db.query(Quote), Quote, current_user)
    if deal_id is not None:
        query = query.filter(Quote.deal_id == deal_id)
    quotes = query.order_by(Quote.created_at.desc()).all()
    return {"items": [_serialize(q, payment_url=_payment_url(db, q)) for q in quotes], "total": len(quotes)}


@router.get("/{quote_id:int}")
def get_quote(quote_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    quote = _get_quote(db, current_user, quote_id)
    return _serialize(quote, payment_url=_payment_url(db, quote))


@router.post("/{quote_id:int}/accept")
def accept_quote(quote_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    quote = _get_quote(db, current_user, quote_id)
    status = quote.status.value if hasattr(quote.status, "value") else quote.status
    if status != QuoteStatus.DRAFT.value:
        raise HTTPException(status_code=400, detail="Only draft quotes can be accepted")

    invoice = Invoice(
        company_id=current_user.company_id,
        invoice_number=f"INV-{uuid.uuid4().hex[:8].upper()}",
        client_id=quote.client_id,
        subtotal=quote.subtotal,
        tax=quote.tax or 0,
        discount=0,
        total=quote.total,
        status=InvoiceStatus.PENDING,
        notes=quote.notes,
        created_by_id=current_user.id,
    )
    db.add(invoice)
    db.flush()
    for item in quote.items:
        db.add(InvoiceItem(
            company_id=current_user.company_id,
            invoice_id=invoice.id,
            description=item.description,
            quantity=item.quantity,
            unit_price=item.unit_price,
            total=item.total,
        ))
    quote.status = QuoteStatus.ACCEPTED
    quote.invoice_id = invoice.id
    run_workflows(db, "quote_accepted", quote=quote)
    db.commit()
    db.refresh(quote)
    return _serialize(quote)


@router.post("/{quote_id:int}/reject")
def reject_quote(quote_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    quote = _get_quote(db, current_user, quote_id)
    status = quote.status.value if hasattr(quote.status, "value") else quote.status
    if status != QuoteStatus.DRAFT.value:
        raise HTTPException(status_code=400, detail="Only draft quotes can be rejected")
    quote.status = QuoteStatus.REJECTED
    db.commit()
    db.refresh(quote)
    return _serialize(quote)
