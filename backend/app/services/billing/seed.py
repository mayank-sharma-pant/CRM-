from decimal import Decimal
from sqlalchemy.orm import Session
from app.models.billing import Plan

_TIERS = [
    {"name": "Starter", "price_monthly": Decimal("29"), "max_users": 10, "max_teams": 3, "max_storage_gb": 20, "max_api_requests_per_day": 1000},
    {"name": "Growth", "price_monthly": Decimal("79"), "max_users": 50, "max_teams": 15, "max_storage_gb": 200, "max_api_requests_per_day": 10000},
    {"name": "Enterprise", "price_monthly": Decimal("199"), "max_users": 500, "max_teams": 100, "max_storage_gb": None, "max_api_requests_per_day": None},
]

_QUOTA_BACKFILL = {"Starter": 1000, "Growth": 10000}


def seed_plans(db: Session) -> None:
    """Idempotently seed the three default tiers. Safe to call on every boot."""
    for tier in _TIERS:
        exists = db.query(Plan).filter(Plan.name == tier["name"]).first()
        if exists:
            continue
        db.add(Plan(currency="INR", is_active=True, **tier))
    db.commit()


def backfill_api_quotas(db: Session) -> None:
    """Set Starter/Growth daily API caps when still NULL. Does not overwrite non-NULL
    (platform-admin edits) and does not fill Enterprise (unlimited)."""
    for name, cap in _QUOTA_BACKFILL.items():
        plan = db.query(Plan).filter(Plan.name == name).first()
        if plan is not None and plan.max_api_requests_per_day is None:
            plan.max_api_requests_per_day = cap
    db.commit()
