"""Customer invoice checkout (Razorpay payment link or local stub)."""
import uuid
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.config import settings
from app.models.core.enums import InvoiceStatus
from app.models.finance.invoice import Invoice
from app.models.finance.ledger import LedgerEntry
from app.models.sales.client import Client

_PAYABLE = {InvoiceStatus.DRAFT.value, InvoiceStatus.PENDING.value, InvoiceStatus.OVERDUE.value}


def _status(invoice: Invoice) -> str:
    value = invoice.status
    return value.value if hasattr(value, "value") else str(value)


def invoice_is_payable(invoice: Invoice) -> bool:
    return _status(invoice) in _PAYABLE


def razorpay_keys_configured() -> bool:
    return bool((settings.RAZORPAY_KEY_ID or "").strip() and (settings.RAZORPAY_KEY_SECRET or "").strip())


def ensure_payment_url(db: Session, invoice: Invoice, *, require_payable: bool = False) -> str:
    if require_payable and not invoice_is_payable(invoice):
        raise HTTPException(status_code=400, detail="Invoice is not payable")
    if invoice.payment_url:
        return invoice.payment_url
    total = Decimal(str(invoice.total or 0))
    if total <= 0:
        raise HTTPException(status_code=400, detail="Invoice total must be greater than 0")
    if razorpay_keys_configured():
        try:
            import razorpay
            client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
            paise = int((total * 100).quantize(Decimal("1")))
            link = client.payment_link.create({
                "amount": paise,
                "currency": "INR",
                "accept_partial": False,
                "description": invoice.invoice_number or f"Invoice {invoice.id}",
                "notes": {"crm_invoice_id": str(invoice.id)},
            })
            invoice.payment_url = link.get("short_url") or link.get("url")
            invoice.payment_reference = link.get("id")
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=502, detail="Payment provider failed") from exc
    else:
        token = uuid.uuid4().hex
        invoice.payment_url = f"/p/pay/{token}"
        invoice.payment_reference = token
    db.commit()
    db.refresh(invoice)
    return invoice.payment_url


def mark_invoice_paid(db: Session, invoice: Invoice, *, method: str = "razorpay", reference: str | None = None) -> Invoice:
    if _status(invoice) == InvoiceStatus.PAID.value:
        return invoice
    today = datetime.now(timezone.utc).date()
    invoice.status = InvoiceStatus.PAID
    invoice.paid_date = today
    invoice.payment_method = method
    if reference:
        invoice.payment_reference = reference
    client = db.query(Client).filter(Client.id == invoice.client_id).first()
    db.add(LedgerEntry(
        company_id=invoice.company_id,
        ledger_slug="payments_received",
        data={
            "date": today.isoformat(),
            "party_name": client.name if client else "Unknown",
            "mode": "Razorpay" if method == "razorpay" else method,
            "reference": reference or invoice.payment_reference or "",
            "amount": float(invoice.total or 0),
            "invoice_no": invoice.invoice_number or "",
            "remarks": f"Auto-recorded from Invoice #{invoice.invoice_number}",
        },
        created_by=invoice.created_by_id,
    ))
    return invoice


def mark_invoice_paid_by_id(db: Session, invoice_id: int, *, method: str = "razorpay", reference: str | None = None) -> None:
    try:
        iid = int(invoice_id)
    except (TypeError, ValueError):
        return
    invoice = db.query(Invoice).filter(Invoice.id == iid).first()
    if invoice is None:
        return
    mark_invoice_paid(db, invoice, method=method, reference=reference)


def complete_stub_pay(db: Session, pay_token: str) -> Invoice:
    invoice = db.query(Invoice).filter(Invoice.payment_reference == pay_token).first()
    if invoice is None or not str(invoice.payment_url or "").startswith("/p/pay/"):
        raise HTTPException(status_code=404, detail="not found")
    invoice = mark_invoice_paid(db, invoice, method="stub", reference=pay_token)
    db.commit()
    db.refresh(invoice)
    return invoice
