"""Canonical Tally / QuickBooks invoice envelopes. No HTTP."""
from __future__ import annotations

import hashlib
import json
from decimal import Decimal

from app.models.finance.invoice import Invoice, InvoiceItem
from app.models.sales.client import Client


def _money(value) -> float:
    return float(Decimal(str(value or 0)).quantize(Decimal("0.01")))


def _date(d) -> str | None:
    return d.isoformat() if d else None


def stub_external_id(provider: str, company_id: int, invoice_number: str) -> str:
    raw = f"{provider}|{company_id}|{invoice_number or ''}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:32]


def payload_hash(payload: dict) -> str:
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=True)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def tally_payload(invoice: Invoice, items: list[InvoiceItem], client: Client | None) -> dict:
    party = (client.name if client else None) or "Unknown"
    ledgers = [
        {"LedgerName": party, "IsDeemedPositive": True, "Amount": _money(invoice.total)},
        {"LedgerName": "Sales", "IsDeemedPositive": False, "Amount": _money(invoice.subtotal)},
    ]
    if _money(invoice.cgst) > 0:
        ledgers.append({"LedgerName": "CGST", "IsDeemedPositive": False, "Amount": _money(invoice.cgst)})
    if _money(invoice.sgst) > 0:
        ledgers.append({"LedgerName": "SGST", "IsDeemedPositive": False, "Amount": _money(invoice.sgst)})
    if _money(invoice.igst) > 0:
        ledgers.append({"LedgerName": "IGST", "IsDeemedPositive": False, "Amount": _money(invoice.igst)})
    return {
        "provider": "tally",
        "voucher": {
            "VoucherType": "Sales",
            "Date": _date(invoice.issued_date),
            "VoucherNumber": invoice.invoice_number,
            "PartyLedgerName": party,
            "Narration": invoice.notes or "",
            "Ledgers": ledgers,
        },
    }


def quickbooks_payload(invoice: Invoice, items: list[InvoiceItem], client: Client | None) -> dict:
    party = (client.name if client else None) or "Unknown"
    lines = [
        {
            "Description": item.description,
            "Amount": _money(item.total),
            "DetailType": "SalesItemLineDetail",
            "SalesItemLineDetail": {
                "Qty": int(item.quantity or 0),
                "UnitPrice": _money(item.unit_price),
                "TaxCodeRef": {"value": str(item.hsn or "")},
            },
        }
        for item in items
    ]
    return {
        "provider": "quickbooks",
        "Invoice": {
            "DocNumber": invoice.invoice_number,
            "TxnDate": _date(invoice.issued_date),
            "DueDate": _date(invoice.due_date),
            "CustomerRef": {"name": party},
            "TotalAmt": _money(invoice.total),
            "Line": lines,
        },
    }
