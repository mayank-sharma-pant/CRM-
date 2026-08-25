from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional
import re

GSTIN_ERROR = "GSTIN must be a 15-character Indian GST identification number"
_GSTIN_RE = re.compile(r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$")


def _money(value) -> float:
    return float(Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def normalize_gstin(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    cleaned = str(value).strip().upper()
    if not cleaned:
        return None
    if not _GSTIN_RE.match(cleaned):
        raise ValueError(GSTIN_ERROR)
    return cleaned


def state_code(gstin: Optional[str]) -> Optional[str]:
    normalized = normalize_gstin(gstin) if gstin else None
    if not normalized:
        return None
    return normalized[:2]


@dataclass(frozen=True)
class GstBreakup:
    tax: float
    cgst: float
    sgst: float
    igst: float
    tax_mode: str
    place_of_supply: Optional[str]
    seller_gstin: Optional[str]
    buyer_gstin: Optional[str]


def compute_gst(
    *,
    subtotal,
    rate_percent,
    seller_gstin: Optional[str],
    buyer_gstin: Optional[str],
    tax_override=None,
) -> GstBreakup:
    seller = normalize_gstin(seller_gstin) if seller_gstin else None
    buyer = normalize_gstin(buyer_gstin) if buyer_gstin else None
    if tax_override is not None:
        tax_total = _money(tax_override)
    else:
        tax_total = _money(Decimal(str(subtotal)) * Decimal(str(rate_percent)) / Decimal("100"))

    seller_state = seller[:2] if seller else None
    buyer_state = buyer[:2] if buyer else None
    if not seller_state:
        return GstBreakup(
            tax=tax_total, cgst=0.0, sgst=0.0, igst=0.0,
            tax_mode="legacy", place_of_supply=buyer_state, seller_gstin=seller, buyer_gstin=buyer,
        )
    place = buyer_state or seller_state
    if not buyer_state or buyer_state == seller_state:
        cgst = _money(Decimal(str(tax_total)) / Decimal("2"))
        sgst = _money(Decimal(str(tax_total)) - Decimal(str(cgst)))
        return GstBreakup(
            tax=tax_total, cgst=cgst, sgst=sgst, igst=0.0,
            tax_mode="intra", place_of_supply=place, seller_gstin=seller, buyer_gstin=buyer,
        )
    return GstBreakup(
        tax=tax_total, cgst=0.0, sgst=0.0, igst=tax_total,
        tax_mode="inter", place_of_supply=place, seller_gstin=seller, buyer_gstin=buyer,
    )
