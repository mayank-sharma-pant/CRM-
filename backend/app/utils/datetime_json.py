"""Consistent UTC ISO-8601 strings for JSON (browser parseISO + formatDistanceToNow)."""
from datetime import datetime, timezone
from typing import Optional


def isoformat_utc(dt: Optional[datetime]) -> Optional[str]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        u = dt.replace(tzinfo=timezone.utc)
    else:
        u = dt.astimezone(timezone.utc)
    s = u.isoformat()
    return s.replace("+00:00", "Z") if s.endswith("+00:00") else s


def task_due_for_json(dt: Optional[datetime]) -> Optional[str]:
    """
    Due dates entered as calendar days (stored at 00:00:00) are returned as YYYY-MM-DD
    so browsers parse them in the user's local timezone. Instants with a time component
    stay as UTC Z strings.
    """
    if dt is None:
        return None
    if (
        dt.hour == 0
        and dt.minute == 0
        and dt.second == 0
        and getattr(dt, "microsecond", 0) == 0
    ):
        return dt.strftime("%Y-%m-%d")
    return isoformat_utc(dt)
