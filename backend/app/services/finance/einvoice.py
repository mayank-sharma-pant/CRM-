"""India e-invoice IRN path: IRP-shaped JSON + SHA-256 IRN stub (no live NIC)."""
import hashlib
import json
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.finance.invoice import Invoice, InvoiceItem


def _money(value) -> float:
    return float(Decimal(str(value or 0)).quantize(Decimal("0.01")))


def irp_payload(invoice: Invoice, items: list[InvoiceItem]) -> dict:
    issued = invoice.issued_date.isoformat() if invoice.issued_date else datetime.now(timezone.utc).date().isoformat()
    return {
        "Version": "1.1",
        "TranDtls": {"TaxSch": "GST", "SupTyp": "B2B"},
        "DocDtls": {"Typ": "INV", "No": invoice.invoice_number, "Dt": issued},
        "SellerDtls": {"Gstin": invoice.seller_gstin},
        "BuyerDtls": {"Gstin": invoice.buyer_gstin, "Pos": invoice.place_of_supply},
        "ItemList": [
            {
                "SlNo": str(i),
                "Desc": item.description,
                "HsnCd": item.hsn or "",
                "Qty": int(item.quantity or 0),
                "UnitPrice": _money(item.unit_price),
                "TotAmt": _money(item.total),
            }
            for i, item in enumerate(items, start=1)
        ],
        "ValDtls": {
            "AssVal": _money(invoice.subtotal),
            "CgstVal": _money(invoice.cgst),
            "SgstVal": _money(invoice.sgst),
            "IgstVal": _money(invoice.igst),
            "TotInvVal": _money(invoice.total),
        },
    }


def stub_irn(payload: dict) -> str:
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=True)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def generate_irn(db: Session, invoice: Invoice) -> Invoice:
    if not (invoice.seller_gstin and invoice.buyer_gstin):
        raise HTTPException(status_code=400, detail="Seller and buyer GSTIN required for e-invoice")
    if invoice.irn:
        return invoice
    items = db.query(InvoiceItem).filter(InvoiceItem.invoice_id == invoice.id).all()
    payload = irp_payload(invoice, items)
    invoice.irn = stub_irn(payload)
    now = datetime.now(timezone.utc)
    invoice.ack_date = now
    invoice.ack_no = now.strftime("%Y%m%d") + f"{invoice.id:08d}"
    invoice.signed_qr = invoice.irn
    db.commit()
    db.refresh(invoice)
    return invoice
