from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.core.user import User
from app.models.sales.client import Client
from app.models.sales.deal import Deal
from app.models.sales.lead import Lead
from app.utils.dependencies import apply_company_scope


def naive_utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def parse_iso_datetime(raw: Optional[str], field_name: str) -> Optional[datetime]:
    if raw is None:
        return None
    value = raw.strip()
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid {field_name} format. Use ISO datetime.",
        ) from exc
    if parsed.tzinfo is None:
        return parsed
    return parsed.astimezone(timezone.utc).replace(tzinfo=None)


def require_parent_in_company(
    db: Session,
    current_user: User,
    *,
    lead_id: Optional[int] = None,
    client_id: Optional[int] = None,
    deal_id: Optional[int] = None,
) -> None:
    if lead_id is None and client_id is None and deal_id is None:
        raise HTTPException(
            status_code=400,
            detail="At least one of lead_id, client_id, deal_id is required",
        )
    checks = (
        ("lead_id", lead_id, Lead),
        ("client_id", client_id, Client),
        ("deal_id", deal_id, Deal),
    )
    for field, value, model in checks:
        if value is None:
            continue
        found = apply_company_scope(db.query(model), model, current_user).filter(
            model.id == value
        ).first()
        if found is None:
            raise HTTPException(status_code=400, detail=f"{field} not found in your company")
