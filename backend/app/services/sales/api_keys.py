import secrets
from datetime import datetime, timedelta, timezone
from dataclasses import dataclass

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.billing import Plan, Subscription
from app.models.core.api_key import ApiKey, ApiUsageDaily
from app.models.core.enums import ApiKeyAccess
from app.utils.security import hash_refresh_token

MAX_LIVE_KEYS = 10
TOKEN_PREFIX = "crm_live_"


@dataclass(frozen=True)
class ApiPrincipal:
    company_id: int
    key_id: int
    access: ApiKeyAccess


def generate_api_token() -> tuple[str, str, str]:
    """Return (raw_token, prefix, token_hash). Raw token is shown once."""
    secret = secrets.token_hex(32)
    token = f"{TOKEN_PREFIX}{secret}"
    prefix = f"{TOKEN_PREFIX}{secret[:8]}"
    return token, prefix, hash_refresh_token(token)


def live_key_count(db: Session, company_id: int) -> int:
    return db.query(ApiKey).filter(ApiKey.company_id == company_id, ApiKey.revoked_at.is_(None)).count()


def utc_today():
    return datetime.now(timezone.utc).date()


def seconds_until_utc_midnight() -> int:
    now = datetime.now(timezone.utc)
    tomorrow = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    return max(1, int((tomorrow - now).total_seconds()))


def usage_row(db: Session, company_id: int) -> ApiUsageDaily:
    today = utc_today()
    row = db.query(ApiUsageDaily).filter(
        ApiUsageDaily.company_id == company_id,
        ApiUsageDaily.usage_date == today,
    ).first()
    if row is None:
        row = ApiUsageDaily(company_id=company_id, usage_date=today, request_count=0)
        db.add(row)
        db.flush()
    return row


def daily_quota_cap(db: Session, company_id: int):
    sub = db.query(Subscription).filter(Subscription.company_id == company_id).first()
    if sub:
        plan = db.query(Plan).filter(Plan.id == sub.plan_id).first()
        if plan:
            return plan.max_api_requests_per_day
    plan = db.query(Plan).filter(Plan.name == "Starter").first()
    if plan is None:
        return None
    return plan.max_api_requests_per_day


def assert_and_count_quota(db: Session, company_id: int) -> None:
    cap = daily_quota_cap(db, company_id)
    row = usage_row(db, company_id)
    if cap is not None and row.request_count >= cap:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Daily API quota exceeded.",
            headers={"Retry-After": str(seconds_until_utc_midnight())},
        )
    row.request_count = int(row.request_count or 0) + 1
