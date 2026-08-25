from datetime import date, datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Query

from app.models.sales.deal import Deal

ROTTING_DAYS = 14
ALLOWED_VIEWS = frozenset({"due_today", "rotting"})
ALLOWED_FILTER_KEYS = frozenset({"view", "pipeline_id", "stage_id", "assigned_to_id"})
ALLOWED_OBJECT_TYPES = frozenset({"deal"})


def utc_today() -> date:
    return datetime.now(timezone.utc).date()


def rotting_cutoff() -> datetime:
    return datetime.utcnow() - timedelta(days=ROTTING_DAYS)


def apply_deal_view(query: Query, view: str | None, user_id: int) -> Query:
    if not view:
        return query
    if view not in ALLOWED_VIEWS:
        raise HTTPException(status_code=400, detail=f"invalid view: {view}")
    if view == "due_today":
        return query.filter(
            Deal.expected_close == utc_today(),
            Deal.assigned_to_id == user_id,
        )
    return query.filter(
        Deal.closed_at.is_(None),
        Deal.updated_at < rotting_cutoff(),
    )


def normalize_filters(raw) -> dict:
    if raw is None:
        return {}
    if not isinstance(raw, dict):
        raise HTTPException(status_code=400, detail="filters must be an object")
    extra = set(raw) - ALLOWED_FILTER_KEYS
    if extra:
        raise HTTPException(status_code=400, detail=f"unknown filter keys: {sorted(extra)}")
    out = {}
    if "view" in raw and raw["view"] is not None:
        view = str(raw["view"])
        if view not in ALLOWED_VIEWS:
            raise HTTPException(status_code=400, detail=f"invalid view: {view}")
        out["view"] = view
    for key in ("pipeline_id", "stage_id", "assigned_to_id"):
        if key not in raw or raw[key] is None:
            continue
        try:
            out[key] = int(raw[key])
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail=f"{key} must be an integer")
    return out
