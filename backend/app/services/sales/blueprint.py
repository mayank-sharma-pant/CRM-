import json
from decimal import Decimal

from app.models.core.enums import DealStageType

ALLOWED_REQUIRED_FIELDS = frozenset(
    {"title", "amount", "expected_close", "client_id", "probability"}
)


class BlueprintError(Exception):
    def __init__(self, message: str, missing_fields: list[str] | None = None):
        super().__init__(message)
        self.message = message
        self.missing_fields = missing_fields


def parse_required_fields(raw) -> list[str]:
    if raw is None or raw == "":
        return []
    if isinstance(raw, list):
        keys = [str(x) for x in raw]
    else:
        try:
            data = json.loads(raw)
        except (TypeError, json.JSONDecodeError):
            return []
        if not isinstance(data, list):
            return []
        keys = [str(x) for x in data]
    return [k for k in keys if k in ALLOWED_REQUIRED_FIELDS]


def missing_required_fields(deal, keys: list[str]) -> list[str]:
    missing = []
    for key in keys:
        if key == "title":
            if not str(getattr(deal, "title", None) or "").strip():
                missing.append(key)
        elif key == "amount":
            amount = getattr(deal, "amount", None)
            if amount is None or Decimal(str(amount)) <= 0:
                missing.append(key)
        elif key == "expected_close":
            if getattr(deal, "expected_close", None) is None:
                missing.append(key)
        elif key == "client_id":
            if getattr(deal, "client_id", None) is None:
                missing.append(key)
        elif key == "probability":
            p = getattr(deal, "probability", None)
            if p is None or not (0 <= int(p) <= 100):
                missing.append(key)
    return missing


def _stage_type(stage) -> str:
    t = stage.stage_type
    return t.value if hasattr(t, "value") else str(t)


def open_stage_sequence(stages: list) -> list:
    open_stages = [
        s for s in stages
        if bool(getattr(s, "is_active", True)) and _stage_type(s) == DealStageType.OPEN.value
    ]
    return sorted(open_stages, key=lambda s: (s.position, s.id))


def allowed_target_ids(pipeline, stages, current_stage) -> set[int]:
    if current_stage is None:
        return set()
    active = [s for s in stages if bool(getattr(s, "is_active", True))]
    opens = open_stage_sequence(active)
    cur_type = _stage_type(current_stage)
    allowed: set[int] = set()
    if cur_type in (DealStageType.WON.value, DealStageType.LOST.value):
        if opens:
            allowed.add(opens[-1].id)
        return allowed
    # current is open
    open_ids = [s.id for s in opens]
    if current_stage.id in open_ids:
        idx = open_ids.index(current_stage.id)
        if idx > 0:
            allowed.add(open_ids[idx - 1])
        if idx + 1 < len(open_ids):
            allowed.add(open_ids[idx + 1])
        if opens and current_stage.id == opens[-1].id:
            for s in active:
                if _stage_type(s) == DealStageType.WON.value:
                    allowed.add(s.id)
    for s in active:
        if _stage_type(s) == DealStageType.LOST.value:
            allowed.add(s.id)
    return allowed


def assert_blueprint_move(*, deal, pipeline, current_stage, target_stage, stages) -> None:
    if not getattr(pipeline, "blueprint_enabled", False):
        return
    if current_stage is None or target_stage is None:
        raise BlueprintError("blueprint does not allow this stage move")
    if current_stage.id == target_stage.id:
        return
    missing = missing_required_fields(deal, parse_required_fields(current_stage.required_fields))
    if missing:
        raise BlueprintError(
            "missing required fields to leave this stage",
            missing_fields=missing,
        )
    if target_stage.id not in allowed_target_ids(pipeline, stages, current_stage):
        raise BlueprintError("blueprint does not allow this stage move")
