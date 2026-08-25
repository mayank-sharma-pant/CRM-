from statistics import median

_SINGLE_INVOICE_HORIZON = 180.0  # days -> risk 1.0 for a lone old invoice


def band_for(risk: float) -> str:
    if risk < 0.4:
        return "low"
    if risk < 0.7:
        return "med"
    return "high"


def _days_between(later, earlier) -> int:
    # accept date or datetime; compare on calendar days to avoid tz / date-vs-datetime issues
    lo = later.date() if hasattr(later, "date") else later
    eo = earlier.date() if hasattr(earlier, "date") else earlier
    return (lo - eo).days


def churn_score(event_dates: list, now) -> dict:
    dates = sorted(event_dates)
    count = len(dates)
    if count == 0:
        return {"risk": None, "band": None, "days_since_last_invoice": None,
                "typical_interval_days": None, "invoice_count": 0,
                "reasons": ["No invoices — not a customer yet."]}

    last = dates[-1]
    recency = max(0, _days_between(now, last))

    if count >= 2:
        gaps = [_days_between(dates[i + 1], dates[i]) for i in range(count - 1)]
        typical = max(1, int(median(gaps)))
        cadence_gap = recency / typical
        risk = min(1.0, max(0.0, (cadence_gap - 1.0) / 2.0))
        reasons = [
            f"Last invoice {recency}d ago; usual gap ~{typical}d.",
            f"That is {cadence_gap:.1f}× the usual cadence.",
        ]
    else:
        typical = None
        risk = min(1.0, recency / _SINGLE_INVOICE_HORIZON)
        reasons = [f"Single invoice, {recency}d ago."]

    return {
        "risk": round(risk, 4),
        "band": band_for(risk),
        "days_since_last_invoice": recency,
        "typical_interval_days": typical,
        "invoice_count": count,
        "reasons": reasons,
    }
