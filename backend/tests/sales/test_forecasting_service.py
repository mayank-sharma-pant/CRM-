from datetime import datetime
from decimal import Decimal
from types import SimpleNamespace

import pytest

from app.models.core.enums import DealStageType
from app.services.sales.forecasting import (
    month_bounds,
    effective_probability,
    weighted_amount,
    attainment_pct,
    format_money,
)


def test_month_bounds_august_2026():
    start, end = month_bounds(2026, 8)
    assert start == datetime(2026, 8, 1)
    assert end == datetime(2026, 9, 1)


def test_month_bounds_rejects_bad_month():
    with pytest.raises(ValueError):
        month_bounds(2026, 13)


def test_weighted_uses_deal_probability_else_stage_default():
    stage = SimpleNamespace(default_probability=10, stage_type=DealStageType.OPEN)
    d1 = SimpleNamespace(amount=Decimal("100"), probability=40)
    d2 = SimpleNamespace(amount=Decimal("200"), probability=None)
    assert weighted_amount(d1, stage) == Decimal("40.00")
    assert weighted_amount(d2, stage) == Decimal("20.00")
    assert attainment_pct(Decimal("25"), Decimal("100")) == 0.25
    assert attainment_pct(Decimal("25"), Decimal("0")) is None
