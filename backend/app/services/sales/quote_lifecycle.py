"""Accept/reject quotes (staff JWT and public portal)."""
from types import SimpleNamespace
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.core.enums import InvoiceStatus, QuoteStatus
from app.models.finance.invoice import Invoice, InvoiceItem
from app.models.ops.stock_item import StockItem
from app.models.sales.product import Product
from app.models.sales.quote import Quote
from app.services.sales.product_lines import ResolvedSaleLine, deduct_stock
from app.services.sales.workflow import run_workflows
from app.utils.notify import notify_role_users


def _status(quote: Quote) -> str:
    value = quote.status
    return value.value if hasattr(value, "value") else str(value)


def _actor(quote: Quote):
    return SimpleNamespace(id=quote.created_by_id, company_id=quote.company_id, role="sales")


def _notify_low_stock(db: Session, company_id: int, low_stock_alert_ids: set[int]) -> None:
    if not low_stock_alert_ids:
        return
    stock_rows = (
        db.query(StockItem)
        .filter(StockItem.company_id == company_id, StockItem.id.in_(low_stock_alert_ids))
        .all()
    )
    stock_map = {s.id: s for s in stock_rows}
    role_map = {
        "purchase": "/purchase/stock",
        "md": "/md/stock",
        "manager": "/manager/stock",
        "sales": "/sales/stock",
    }
    for stock_id in low_stock_alert_ids:
        stock_item = stock_map.get(stock_id)
        if stock_item is None:
            continue
        for target_role, link in role_map.items():
            notify_role_users(
                db,
                company_id=company_id,
                role=target_role,
                title=f"Low Stock: {stock_item.name}",
                message=f"Only {stock_item.quantity} {stock_item.unit}(s) remaining.",
                type="warning",
                link=link,
                category="inventory",
                dedupe_window_seconds=6 * 60 * 60,
                dedupe_match_message=False,
                skip_if_unread_duplicate=True,
            )


def accept_quote(db: Session, quote: Quote) -> Quote:
    if _status(quote) != QuoteStatus.DRAFT.value:
        raise HTTPException(status_code=400, detail="Only draft quotes can be accepted")
    actor = _actor(quote)
    invoice = Invoice(
        company_id=quote.company_id,
        invoice_number=f"INV-{uuid4().hex[:8].upper()}",
        client_id=quote.client_id,
        subtotal=quote.subtotal,
        tax=quote.tax or 0,
        discount=0,
        total=quote.total,
        status=InvoiceStatus.PENDING,
        notes=quote.notes,
        created_by_id=quote.created_by_id,
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
            company_id=quote.company_id,
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
    low_ids = deduct_stock(db, actor, accept_lines)
    _notify_low_stock(db, quote.company_id, low_ids)
    quote.status = QuoteStatus.ACCEPTED
    quote.invoice_id = invoice.id
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
