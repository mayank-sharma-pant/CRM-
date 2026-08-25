import uuid
from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.core.company_settings import CompanySettings
from app.models.core.enums import InvoiceStatus, QuoteStatus
from app.models.core.user import User
from app.models.finance.invoice import Invoice, InvoiceItem
from app.models.ops.stock_item import StockItem
from app.models.sales.client import Client
from app.models.sales.deal import Deal
from app.models.sales.product import Product
from app.models.sales.quote import Quote, QuoteItem
from app.services.finance.gst import compute_gst
from app.services.sales.product_lines import ResolvedSaleLine, deduct_stock, resolve_sale_lines
from app.services.sales.workflow import run_workflows
from app.utils.dependencies import apply_company_scope, ensure_company_access, get_current_user
from app.utils.notify import notify_role_users

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
    items: List[QuoteItemIn]


def _money(value) -> str:
    return str(Decimal(value or 0).quantize(Decimal("0.01")))


def _stock_link_for_role(role: str) -> str:
    role_map = {
        "purchase": "/purchase/stock",
        "md": "/md/stock",
        "manager": "/manager/stock",
        "sales": "/sales/stock",
    }
    return role_map.get(role, "/purchase/stock")


def _notify_low_stock(db: Session, company_id: int, low_stock_alert_ids: set[int]) -> None:
    if not low_stock_alert_ids:
        return
    stock_rows = (
        db.query(StockItem)
        .filter(StockItem.company_id == company_id, StockItem.id.in_(low_stock_alert_ids))
        .all()
    )
    stock_map = {s.id: s for s in stock_rows}
    for stock_id in low_stock_alert_ids:
        stock_item = stock_map.get(stock_id)
        if stock_item is None:
            continue
        for target_role in ("purchase", "md", "manager", "sales"):
            notify_role_users(
                db,
                company_id=company_id,
                role=target_role,
                title=f"Low Stock: {stock_item.name}",
                message=f"Only {stock_item.quantity} {stock_item.unit}(s) remaining.",
                type="warning",
                link=_stock_link_for_role(target_role),
                category="inventory",
                dedupe_window_seconds=6 * 60 * 60,
                dedupe_match_message=False,
                skip_if_unread_duplicate=True,
            )


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
        "payment_url": payment_url,
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

    settings = (
        db.query(CompanySettings)
        .filter(CompanySettings.company_id == current_user.company_id)
        .first()
    )
    company_tax_rate = 18.0
    if settings:
        company_tax_rate = getattr(settings, "tax_rate", 18.0) or 18.0

    try:
        lines = resolve_sale_lines(
            db,
            company_id=current_user.company_id,
            items=payload.items,
            company_tax_rate=company_tax_rate,
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
        cgst=quote.cgst,
        sgst=quote.sgst,
        igst=quote.igst,
        seller_gstin=quote.seller_gstin,
        buyer_gstin=quote.buyer_gstin,
        place_of_supply=quote.place_of_supply,
        tax_mode=quote.tax_mode,
    )
    db.add(invoice)
    db.flush()
    accept_lines: list[ResolvedSaleLine] = []
    for item in quote.items:
        deduct_id = None
        if item.product_id:
            product = db.query(Product).filter(
                Product.id == item.product_id,
                Product.company_id == quote.company_id,
            ).first()
            if product is not None:
                deduct_id = product.stock_item_id
        accept_lines.append(ResolvedSaleLine(
            description=item.description,
            quantity=item.quantity,
            unit_price=item.unit_price,
            hsn=item.hsn,
            tax_rate=item.tax_rate or 0,
            line_amount=item.total,
            tax=float(item.tax or 0),
            product_id=item.product_id,
            deduct_stock_item_id=deduct_id,
        ))
        db.add(InvoiceItem(
            company_id=current_user.company_id,
            invoice_id=invoice.id,
            description=item.description,
            quantity=item.quantity,
            unit_price=item.unit_price,
            total=item.total,
            product_id=item.product_id,
            hsn=item.hsn,
            tax_rate=item.tax_rate,
            tax=item.tax,
        ))
    low_ids = deduct_stock(db, current_user, accept_lines)
    _notify_low_stock(db, current_user.company_id, low_ids)
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
