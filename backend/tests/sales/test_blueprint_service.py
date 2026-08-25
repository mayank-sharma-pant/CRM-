from decimal import Decimal
from datetime import date
from types import SimpleNamespace

import pytest

from app.models.core.enums import DealStageType
from app.services.sales.blueprint import (
    allowed_target_ids, assert_blueprint_move, missing_required_fields, BlueprintError,
)


def _stage(id, position, stage_type, *, active=True, required=None):
    return SimpleNamespace(
        id=id, position=position, stage_type=stage_type, is_active=active,
        required_fields=required,
    )


def _pipeline(enabled=True):
    return SimpleNamespace(blueprint_enabled=enabled)


def _deal(**kwargs):
    base = dict(title="Roof", amount=Decimal("100"), expected_close=date(2026, 9, 1),
                client_id=1, probability=40)
    base.update(kwargs)
    return SimpleNamespace(**base)


def test_blueprint_off_allows_any_target():
    stages = [
        _stage(1, 1, DealStageType.OPEN),
        _stage(2, 2, DealStageType.OPEN),
        _stage(3, 3, DealStageType.WON),
    ]
    assert_blueprint_move(
        deal=_deal(), pipeline=_pipeline(False), current_stage=stages[0],
        target_stage=stages[2], stages=stages,
    )


def test_adjacent_ok_skip_forbidden_lost_ok_won_only_from_last():
    q = _stage(1, 1, DealStageType.OPEN, required='["amount"]')
    prop = _stage(2, 2, DealStageType.OPEN)
    won = _stage(3, 3, DealStageType.WON)
    lost = _stage(4, 4, DealStageType.LOST)
    stages = [q, prop, won, lost]
    pipe = _pipeline(True)
    assert allowed_target_ids(pipe, stages, q) == {prop.id, lost.id}
    assert allowed_target_ids(pipe, stages, prop) == {q.id, won.id, lost.id}
    assert_blueprint_move(deal=_deal(), pipeline=pipe, current_stage=q, target_stage=prop, stages=stages)
    with pytest.raises(BlueprintError, match="does not allow"):
        assert_blueprint_move(deal=_deal(), pipeline=pipe, current_stage=q, target_stage=won, stages=stages)
    assert_blueprint_move(deal=_deal(), pipeline=pipe, current_stage=q, target_stage=lost, stages=stages)
    assert_blueprint_move(deal=_deal(), pipeline=pipe, current_stage=prop, target_stage=won, stages=stages)


def test_missing_amount_and_reentry():
    q = _stage(1, 1, DealStageType.OPEN, required='["amount","expected_close"]')
    prop = _stage(2, 2, DealStageType.OPEN)
    won = _stage(3, 3, DealStageType.WON)
    stages = [q, prop, won]
    pipe = _pipeline(True)
    with pytest.raises(BlueprintError) as exc:
        assert_blueprint_move(
            deal=_deal(amount=Decimal("0"), expected_close=None),
            pipeline=pipe, current_stage=q, target_stage=prop, stages=stages,
        )
    assert set(exc.value.missing_fields) == {"amount", "expected_close"}
    assert missing_required_fields(_deal(amount=None), ["amount"]) == ["amount"]
    assert allowed_target_ids(pipe, stages, won) == {prop.id}
