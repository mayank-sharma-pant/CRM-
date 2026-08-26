"""Pending deal/quote approvals (admin/md)."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.core.enums import ApprovalStatus
from app.models.core.user import User
from app.models.sales.deal import Deal
from app.models.sales.quote import Quote
from app.utils.dependencies import apply_company_scope, require_admin_or_md

router = APIRouter()


def _serialize_deal_pending(deal: Deal) -> dict:
    return {
        "id": deal.id,
        "title": deal.title,
        "amount": str(deal.amount or 0),
        "approval_status": deal.approval_status,
        "created_at": deal.created_at.isoformat() if deal.created_at else None,
    }


def _serialize_quote_pending(quote: Quote) -> dict:
    return {
        "id": quote.id,
        "quote_number": quote.quote_number,
        "total": str(quote.total or 0),
        "approval_status": quote.approval_status,
        "deal_id": quote.deal_id,
        "created_at": quote.created_at.isoformat() if quote.created_at else None,
    }


@router.get("/pending")
def list_pending(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    deals = (
        apply_company_scope(db.query(Deal), Deal, current_user)
        .filter(Deal.approval_status == ApprovalStatus.PENDING.value)
        .order_by(Deal.updated_at.desc())
        .all()
    )
    quotes = (
        apply_company_scope(db.query(Quote), Quote, current_user)
        .filter(Quote.approval_status == ApprovalStatus.PENDING.value)
        .order_by(Quote.updated_at.desc())
        .all()
    )
    return {
        "deals": [_serialize_deal_pending(d) for d in deals],
        "deals_total": len(deals),
        "quotes": [_serialize_quote_pending(q) for q in quotes],
        "quotes_total": len(quotes),
    }
