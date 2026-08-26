"""India e-invoice IRN: stub SHA-256 (6.16) or live NIC/IRP when configured (7.6)."""
import hashlib
import json
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.core.company_settings import CompanySettings
from app.models.finance.invoice import Invoice, InvoiceItem
from app.services.finance.einvoice_settings import decrypt_creds, live_configured
from app.services.finance.einvoice_transport import EinvoicePushError, auth_token, generate_live_irn


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


def _settings(db: Session, company_id: int) -> CompanySettings | None:
    return db.query(CompanySettings).filter(CompanySettings.company_id == company_id).first()


def _parse_ack_date(value: str | None) -> datetime:
    if not value:
        return datetime.now(timezone.utc)
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S", "%d/%m/%Y %H:%M:%S", "%Y-%m-%d"):
        try:
            return datetime.strptime(value[:19], fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return datetime.now(timezone.utc)


def generate_irn(db: Session, invoice: Invoice) -> tuple[Invoice, str]:
    settings = _settings(db, invoice.company_id)
    mode = "live" if live_configured(settings) else "stub"

    if not (invoice.seller_gstin and invoice.buyer_gstin):
        raise HTTPException(status_code=400, detail="Seller and buyer GSTIN required for e-invoice")
    if invoice.irn:
        return invoice, mode

    items = db.query(InvoiceItem).filter(InvoiceItem.invoice_id == invoice.id).all()
    payload = irp_payload(invoice, items)

    if mode == "live":
        creds = decrypt_creds(settings)
        try:
            token = auth_token(
                creds["base_url"],
                gstin=invoice.seller_gstin,
                username=creds["username"],
                password=creds["password"],
                client_id=creds["client_id"],
                client_secret=creds["client_secret"],
            )
            result = generate_live_irn(creds["base_url"], token=token, payload=payload)
        except EinvoicePushError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc

        invoice.irn = result["irn"]
        invoice.ack_no = result["ack_no"] or datetime.now(timezone.utc).strftime("%Y%m%d") + f"{invoice.id:08d}"
        invoice.ack_date = _parse_ack_date(result.get("ack_date"))
        invoice.signed_qr = result.get("signed_qr") or result["irn"]
        db.commit()
        db.refresh(invoice)
        return invoice, "live"

    invoice.irn = stub_irn(payload)
    now = datetime.now(timezone.utc)
    invoice.ack_date = now
    invoice.ack_no = now.strftime("%Y%m%d") + f"{invoice.id:08d}"
    invoice.signed_qr = invoice.irn
    db.commit()
    db.refresh(invoice)
    return invoice, "stub"
