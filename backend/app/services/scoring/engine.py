from datetime import datetime, timezone

_NULL_DAYS = 10 ** 6

_STRING_OPS = {"eq", "ne", "in", "is_set", "is_empty"}
_ENUM_OPS = {"eq", "ne", "in"}
_PRESENCE_OPS = {"is_set", "is_empty"}
_NUM_OPS = {"eq", "ne", "gt", "gte", "lt", "lte"}

OPERATORS = {"eq", "ne", "in", "gt", "gte", "lt", "lte", "is_set", "is_empty"}

LEAD_FIELDS = {
    "source": _STRING_OPS,
    "industry": _STRING_OPS,
    "status": _ENUM_OPS,
    "email": _PRESENCE_OPS,
    "phone": _PRESENCE_OPS,
    "website": _PRESENCE_OPS,
    "days_since_last_contact": _NUM_OPS,
    "age_days": _NUM_OPS,
}

DEAL_FIELDS = {
    "amount": _NUM_OPS,
    "stage_id": _ENUM_OPS,
    "probability": _NUM_OPS,
    "days_to_expected_close": _NUM_OPS,
    "age_days": _NUM_OPS,
}

_COMPUTED = {"days_since_last_contact", "age_days", "days_to_expected_close"}
_NUMERIC_RAW = {"amount", "probability", "stage_id"}


def fields_for(entity_type: str) -> dict:
    return DEAL_FIELDS if entity_type == "deal" else LEAD_FIELDS


def _aware(dt):
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _days_between(later, earlier) -> int:
    later = _aware(later)
    earlier = _aware(earlier)
    return int((later - earlier).total_seconds() // 86400)


def _field_value(entity, field, now):
    if field == "days_since_last_contact":
        ts = getattr(entity, "last_contacted_at", None)
        return _NULL_DAYS if ts is None else _days_between(now, ts)
    if field == "age_days":
        ts = getattr(entity, "created_at", None)
        return 0 if ts is None else _days_between(now, ts)
    if field == "days_to_expected_close":
        d = getattr(entity, "expected_close", None)
        return _NULL_DAYS if d is None else (d - now.date()).days
    return getattr(entity, field, None)


def _num_cmp(op, a, b) -> bool:
    return {
        "eq": a == b, "ne": a != b,
        "gt": a > b, "gte": a >= b,
        "lt": a < b, "lte": a <= b,
    }[op]


def _matches(entity, rule, now) -> bool:
    op = rule.operator
    actual = _field_value(entity, rule.field, now)

    if op == "is_set":
        return actual is not None and str(actual).strip() != ""
    if op == "is_empty":
        return actual is None or str(actual).strip() == ""

    if actual is None:
        return False

    if rule.field in _COMPUTED or rule.field in _NUMERIC_RAW:
        left = float(actual)
        if op == "in":
            targets = {float(v.strip()) for v in str(rule.value).split(",") if v.strip()}
            return left in targets
        return _num_cmp(op, left, float(rule.value))

    left = str(actual).strip().lower()
    if op == "in":
        targets = {v.strip().lower() for v in str(rule.value or "").split(",") if v.strip()}
        return left in targets
    right = str(rule.value or "").strip().lower()
    if op == "eq":
        return left == right
    if op == "ne":
        return left != right
    return False


def score_entity(entity, rules, now=None) -> dict:
    if now is None:
        now = datetime.now(timezone.utc)
    total = 0
    breakdown = []
    for rule in rules:
        if not rule.is_active:
            continue
        try:
            matched = _matches(entity, rule, now)
        except Exception:
            matched = False
        if matched:
            total += rule.points
        breakdown.append({
            "rule_id": rule.id,
            "field": rule.field,
            "operator": rule.operator,
            "value": rule.value,
            "points": rule.points,
            "matched": matched,
        })
    return {"total": total, "breakdown": breakdown}
