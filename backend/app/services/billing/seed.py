from decimal import Decimal
from sqlalchemy.orm import Session
from app.models.billing import Plan

_TIERS = [
    {"name": "Starter", "price_monthly": Decimal("29"), "max_users": 10, "max_teams": 3, "max_storage_gb": 20},
    {"name": "Growth", "price_monthly": Decimal("79"), "max_users": 50, "max_teams": 15, "max_storage_gb": 200},
    {"name": "Enterprise", "price_monthly": Decimal("199"), "max_users": 500, "max_teams": 100, "max_storage_gb": None},
]


def seed_plans(db: Session) -> None:
    """Idempotently seed the three default tiers. Safe to call on every boot."""
    for tier in _TIERS:
        exists = db.query(Plan).filter(Plan.name == tier["name"]).first()
        if exists:
            continue
        db.add(Plan(currency="INR", is_active=True, **tier))
    db.commit()
