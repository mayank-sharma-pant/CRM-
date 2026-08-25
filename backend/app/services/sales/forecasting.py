from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP

_TWO_PLACES = Decimal("0.01")


def month_bounds(year: int, month: int) -> tuple[datetime, datetime]:
    if not 1 <= month <= 12:
        raise ValueError(f"month must be 1-12, got {month}")
    start = datetime(year, month, 1)
    if month == 12:
        end = datetime(year + 1, 1, 1)
    else:
        end = datetime(year, month + 1, 1)
    return start, end


def effective_probability(deal, stage) -> int:
    prob = getattr(deal, "probability", None)
    if prob is not None:
        return int(prob)
    return int(getattr(stage, "default_probability", None) or 0)


def weighted_amount(deal, stage) -> Decimal:
    amount = getattr(deal, "amount", None) or Decimal("0")
    eff = effective_probability(deal, stage)
    weighted = Decimal(str(amount)) * Decimal(eff) / Decimal(100)
    return weighted.quantize(_TWO_PLACES, rounding=ROUND_HALF_UP)


def attainment_pct(part: Decimal, whole: Decimal) -> float | Decimal | None:
    if whole == 0:
        return None
    return part / whole


def format_money(value) -> str:
    return str(Decimal(str(value or 0)).quantize(_TWO_PLACES, rounding=ROUND_HALF_UP))
