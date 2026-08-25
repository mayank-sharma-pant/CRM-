import hashlib
import secrets
from datetime import datetime, timezone


def hash_share_token(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def mint_share_token() -> tuple[str, str]:
    raw = secrets.token_urlsafe(32)
    return raw, hash_share_token(raw)


def apply_share(doc, *, now=None) -> tuple[str, str]:
    raw, token_hash = mint_share_token()
    doc.share_token_hash = token_hash
    doc.share_created_at = now or datetime.now(timezone.utc)
    return raw, token_hash


def revoke_share(doc) -> None:
    doc.share_token_hash = None
    doc.share_created_at = None


def _money(v):
    if v is None:
        return 0.0
    return float(v)


def _status(v):
    return v.value if hasattr(v, "value") else v


def _items(rows):
    return [
        {
            "description": it.description,
            "quantity": it.quantity,
            "unit_price": _money(it.unit_price),
            "tax": _money(getattr(it, "tax", 0)),
            "tax_rate": _money(getattr(it, "tax_rate", None))
            if getattr(it, "tax_rate", None) is not None
            else None,
            "hsn": getattr(it, "hsn", None),
            "total": _money(it.total),
        }
        for it in (rows or [])
    ]


def portal_invoice_dto(invoice, *, client, company) -> dict:
    return {
        "invoice_number": invoice.invoice_number,
        "status": _status(invoice.status),
        "issued_date": invoice.issued_date.isoformat() if invoice.issued_date else None,
        "due_date": invoice.due_date.isoformat() if invoice.due_date else None,
        "paid_date": invoice.paid_date.isoformat()
        if getattr(invoice, "paid_date", None)
        else None,
        "client_name": client.name if client else None,
        "seller_gstin": invoice.seller_gstin,
        "buyer_gstin": invoice.buyer_gstin,
        "place_of_supply": invoice.place_of_supply,
        "tax_mode": invoice.tax_mode,
        "subtotal": _money(invoice.subtotal),
        "tax": _money(invoice.tax),
        "cgst": _money(invoice.cgst),
        "sgst": _money(invoice.sgst),
        "igst": _money(invoice.igst),
        "discount": _money(getattr(invoice, "discount", 0)),
        "total": _money(invoice.total),
        "notes": invoice.notes,
        "company_name": company.name if company else None,
        "items": _items(invoice.items),
    }


def portal_quote_dto(quote, *, client, company) -> dict:
    return {
        "quote_number": quote.quote_number,
        "title": quote.title,
        "status": _status(quote.status),
        "client_name": client.name if client else None,
        "seller_gstin": quote.seller_gstin,
        "buyer_gstin": quote.buyer_gstin,
        "place_of_supply": quote.place_of_supply,
        "tax_mode": quote.tax_mode,
        "subtotal": _money(quote.subtotal),
        "tax": _money(quote.tax),
        "cgst": _money(quote.cgst),
        "sgst": _money(quote.sgst),
        "igst": _money(quote.igst),
        "total": _money(quote.total),
        "notes": quote.notes,
        "company_name": company.name if company else None,
        "items": _items(quote.items),
    }
