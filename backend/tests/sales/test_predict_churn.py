from datetime import datetime, timedelta, timezone
from app.services.predictions.churn import churn_score

NOW = datetime(2026, 8, 26, tzinfo=timezone.utc)


def _days_ago(n):
    return NOW - timedelta(days=n)


def test_zero_invoices_is_none():
    out = churn_score([], NOW)
    assert out["risk"] is None
    assert out["invoice_count"] == 0


def test_on_cadence_is_low_risk():
    dates = [_days_ago(90), _days_ago(60), _days_ago(30)]
    out = churn_score(dates, NOW)
    assert out["band"] == "low"
    assert out["typical_interval_days"] == 30


def test_overdue_is_high_risk():
    dates = [_days_ago(210), _days_ago(180), _days_ago(150)]
    out = churn_score(dates, NOW)
    assert out["band"] == "high"
    assert out["risk"] >= 0.7


def test_single_invoice_recent_low():
    out = churn_score([_days_ago(10)], NOW)
    assert out["invoice_count"] == 1
    assert out["band"] == "low"
