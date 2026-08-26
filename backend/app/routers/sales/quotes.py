import uuid
from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.core.company_settings import CompanySettings
from app.models.core.enums import QuoteStatus
from app.models.core.user import User
from app.models.finance.invoice import Invoice
from app.models.sales.client import Client
from app.models.sales.deal import Deal
from app.models.sales.quote import Quote, QuoteItem
from app.services.finance.gst import compute_gst
from app.services.portal.share_links import apply_share, revoke_share
from app.services.sales.price_books import validate_price_book_id
from app.services.sales.product_lines import resolve_sale_lines
from app.services.sales.quote_lifecycle import accept_quote as accept_quote_record
from app.services.sales.quote_lifecycle import reject_quote as reject_quote_record
from app.services.sales.approvals import (
    ApprovalRequired,
    approve_quote,
    assert_quote_approved_for_accept,
    max_line_discount_percent,
    refresh_quote_approval,
    reject_quote as reject_quote_approval,
)
from app.models.core.enums import ApprovalStatus
from app.utils.dependencies import apply_company_scope, ensure_company_access, get_current_user, require_admin_or_md

router = APIRouter()


class QuoteItemIn(BaseModel):
    description: str
    quantity: int = 1
    unit_price: Optional[Decimal] = None
    product_id: Optional[int] = None
    hsn: Optional[str] = None


class QuoteCreate(BaseModel):
    client_id: int
    deal_id: Optional[int] = None
    title: Optional[str] = None
    notes: Optional[str] = None
    price_book_id: Optional[int] = None
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
        "cgst": _money(quote.cgst),
        "sgst": _money(quote.sgst),
        "igst": _money(quote.igst),
        "tax_mode": quote.tax_mode,
        "seller_gstin": quote.seller_gstin,
        "buyer_gstin": quote.buyer_gstin,
        "place_of_supply": quote.place_of_supply,
        "notes": quote.notes,
        "invoice_id": quote.invoice_id,
        "sales_order_id": quote.sales_order_id,
        "approval_status": quote.approval_status,
        "payment_url": payment_url,
        "share_active": bool(quote.share_token_hash),
        "share_created_at": quote.share_created_at.isoformat() if quote.share_created_at else None,
        "items": [
            {
                "description": it.description,
                "quantity": it.quantity,
                "unit_price": _money(it.unit_price),
                "total": _money(it.total),
                "product_id": it.product_id,
                "hsn": it.hsn,
                "tax_rate": _money(it.tax_rate),
                "tax": _money(it.tax),
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

    for item in payload.items:
        if item.quantity <= 0:
            raise HTTPException(status_code=400, detail="quantity must be > 0")
        if item.unit_price is not None and item.unit_price < 0:
            raise HTTPException(status_code=400, detail="unit_price must be >= 0")
        if item.product_id is None and item.unit_price is None:
            raise HTTPException(status_code=400, detail="unit_price is required when product_id is not set")

    settings = (
        db.query(CompanySettings)
        .filter(CompanySettings.company_id == current_user.company_id)
        .first()
    )
    company_tax_rate = 18.0
    if settings:
        company_tax_rate = getattr(settings, "tax_rate", 18.0) or 18.0

    try:
        validate_price_book_id(db, current_user.company_id, payload.price_book_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    try:
        lines = resolve_sale_lines(
            db,
            company_id=current_user.company_id,
            items=payload.items,
            company_tax_rate=company_tax_rate,
            price_book_id=payload.price_book_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    subtotal = sum((line.line_amount for line in lines), Decimal("0"))
    header_tax = sum(line.tax for line in lines)
    try:
        gst = compute_gst(
            subtotal=subtotal,
            rate_percent=company_tax_rate,
            seller_gstin=getattr(settings, "gst_number", None) if settings else None,
            buyer_gstin=getattr(client, "gstin", None),
            tax_override=header_tax,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    quote = Quote(
        company_id=current_user.company_id,
        quote_number=f"QUO-{uuid.uuid4().hex[:8].upper()}",
        title=payload.title,
        deal_id=payload.deal_id,
        client_id=payload.client_id,
        status=QuoteStatus.DRAFT,
        subtotal=subtotal,
        tax=Decimal(str(gst.tax)),
        total=subtotal + Decimal(str(gst.tax)),
        notes=payload.notes,
        created_by_id=current_user.id,
        cgst=gst.cgst,
        sgst=gst.sgst,
        igst=gst.igst,
        seller_gstin=gst.seller_gstin,
        buyer_gstin=gst.buyer_gstin,
        place_of_supply=gst.place_of_supply,
        tax_mode=gst.tax_mode,
    )
    db.add(quote)
    db.flush()
    for line in lines:
        db.add(QuoteItem(
            company_id=current_user.company_id,
            quote_id=quote.id,
            description=line.description,
            quantity=line.quantity,
            unit_price=line.unit_price,
            total=line.line_amount,
            product_id=line.product_id,
            hsn=line.hsn,
            tax_rate=line.tax_rate,
            tax=line.tax,
        ))
    discount_pct = max_line_discount_percent(
        db,
        company_id=current_user.company_id,
        lines=lines,
        price_book_id=payload.price_book_id,
    )
    refresh_quote_approval(db, quote=quote, discount_pct=discount_pct, actor=current_user)
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


@router.post("/{quote_id:int}/share")
def share_quote(quote_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    quote = _get_quote(db, current_user, quote_id)
    raw, _ = apply_share(quote)
    db.commit()
    db.refresh(quote)
    created = quote.share_created_at
    return {
        "token": raw,
        "url": f"/p/quote/{raw}",
        "created_at": created.isoformat() if created else None,
    }


@router.delete("/{quote_id:int}/share", status_code=204)
def revoke_quote_share(quote_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    quote = _get_quote(db, current_user, quote_id)
    revoke_share(quote)
    db.commit()
    return Response(status_code=204)


@router.post("/{quote_id:int}/accept")
def accept_quote(quote_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    quote = _get_quote(db, current_user, quote_id)
    try:
        assert_quote_approved_for_accept(quote)
    except ApprovalRequired as err:
        raise HTTPException(status_code=400, detail=str(err))
    quote = accept_quote_record(db, quote)
    return _serialize(quote)


@router.post("/{quote_id:int}/approve")
def approve_quote_route(
    quote_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    quote = _get_quote(db, current_user, quote_id)
    if quote.approval_status != ApprovalStatus.PENDING.value:
        raise HTTPException(status_code=400, detail="Quote is not pending approval")
    quote = approve_quote(db, quote, current_user)
    return _serialize(quote)


@router.post("/{quote_id:int}/reject")
def reject_quote(
    quote_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    quote = _get_quote(db, current_user, quote_id)
    if quote.approval_status == ApprovalStatus.PENDING.value:
        role = getattr(current_user.role, "value", str(current_user.role or "")).lower()
        if role not in ("admin", "md"):
            raise HTTPException(status_code=403, detail="Admin or MD access required")
        quote = reject_quote_approval(db, quote, current_user)
        return _serialize(quote)
    quote = reject_quote_record(db, quote)
    return _serialize(quote)
