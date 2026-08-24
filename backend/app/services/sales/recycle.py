from datetime import datetime

from fastapi import HTTPException
from sqlalchemy.orm import Session, Query

from app.models.core.user import User
from app.models.sales.lead import Lead
from app.utils.dependencies import apply_company_scope, ensure_company_access


def not_deleted(query: Query) -> Query:
    return query.filter(Lead.deleted_at.is_(None))


def live_lead_query(db: Session, current_user: User) -> Query:
    return not_deleted(apply_company_scope(db.query(Lead), Lead, current_user))


def get_live_lead(db: Session, current_user: User, lead_id: int) -> Lead:
    lead = live_lead_query(db, current_user).filter(Lead.id == lead_id).first()
    if lead is None:
        raise HTTPException(status_code=404, detail="Lead not found")
    ensure_company_access(lead, current_user)
    return lead


def get_trashed_lead(db: Session, current_user: User, lead_id: int) -> Lead:
    lead = (
        apply_company_scope(db.query(Lead), Lead, current_user)
        .filter(Lead.id == lead_id, Lead.deleted_at.isnot(None))
        .first()
    )
    if lead is None:
        raise HTTPException(status_code=404, detail="Lead not found")
    ensure_company_access(lead, current_user)
    return lead


def soft_delete_lead(lead: Lead) -> None:
    lead.deleted_at = datetime.utcnow()


def restore_lead(lead: Lead) -> None:
    lead.deleted_at = None
