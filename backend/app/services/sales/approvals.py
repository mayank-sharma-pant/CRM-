"""Deal amount + quote discount approval gates (Phase 7.10)."""
from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.core.company_settings import CompanySettings
from app.models.core.enums import ApprovalStatus, DealStageType
from app.models.core.user import User
from app.models.sales.deal import Deal
from app.models.sales.pipeline import PipelineStage
from app.models.sales.product import Product
from app.models.sales.quote import Quote
from app.services.sales.price_books import resolve_product_unit_price
from app.services.sales.product_lines import ResolvedSaleLine
from app.utils.notify import notify_role_users


class ApprovalRequired(Exception):
    pass


def _role(user: User) -> str:
    value = getattr(user, "role", None)
    return value.value if hasattr(value, "value") else str(value or "").lower()


def is_approver(user: User) -> bool:
    return _role(user) in ("admin", "md")


def _settings(db: Session, company_id: int) -> Optional[CompanySettings]:
    return db.query(CompanySettings).filter(CompanySettings.company_id == company_id).first()


def thresholds(db: Session, company_id: int) -> tuple[Optional[Decimal], Optional[float]]:
    row = _settings(db, company_id)
    if row is None:
        return None, None
    amount = (
        Decimal(str(row.deal_approval_amount_threshold))
        if row.deal_approval_amount_threshold is not None
        else None
    )
    pct = (
        float(row.discount_approval_percent_threshold)
        if row.discount_approval_percent_threshold is not None
        else None
    )
    return amount, pct


def deal_amount_requires_approval(amount, threshold: Optional[Decimal]) -> bool:
    if threshold is None:
        return False
    return Decimal(str(amount or 0)) >= threshold


def refresh_deal_approval(
    db: Session,
    *,
    deal: Deal,
    amount,
    actor: User,
    notify: bool = True,
) -> None:
    if is_approver(actor):
        return
    amount_threshold, _ = thresholds(db, deal.company_id)
    if not deal_amount_requires_approval(amount, amount_threshold):
        if deal.approval_status == ApprovalStatus.PENDING.value:
            deal.approval_status = None
            deal.approved_by_id = None
            deal.approved_at = None
        return
    if deal.approval_status in (ApprovalStatus.APPROVED.value, ApprovalStatus.REJECTED.value):
        deal.approval_status = ApprovalStatus.PENDING.value
        deal.approved_by_id = None
        deal.approved_at = None
    elif deal.approval_status != ApprovalStatus.PENDING.value:
        deal.approval_status = ApprovalStatus.PENDING.value
        if notify:
            _notify_pending(db, deal.company_id, "deal", deal.title, deal.id)


def max_line_discount_percent(
    db: Session,
    *,
    company_id: int,
    lines: list[ResolvedSaleLine],
    price_book_id: Optional[int],
) -> float:
    max_pct = 0.0
    for line in lines:
        if not line.product_id:
            continue
        product = db.query(Product).filter(
            Product.id == line.product_id,
            Product.company_id == company_id,
        ).first()
        if product is None:
            continue
        list_price = resolve_product_unit_price(
            db,
            company_id=company_id,
            product=product,
            price_book_id=price_book_id,
            explicit_price=None,
        )
        if list_price <= 0:
            continue
        unit = Decimal(str(line.unit_price or 0))
        if unit >= list_price:
            continue
        pct = float((list_price - unit) / list_price * Decimal("100"))
        max_pct = max(max_pct, pct)
    return max_pct


def refresh_quote_approval(
    db: Session,
    *,
    quote: Quote,
    discount_pct: float,
    actor: User,
    notify: bool = True,
) -> None:
    if is_approver(actor):
        return
    _, discount_threshold = thresholds(db, quote.company_id)
    if discount_threshold is None or discount_pct < discount_threshold:
        if quote.approval_status == ApprovalStatus.PENDING.value:
            quote.approval_status = None
            quote.approved_by_id = None
            quote.approved_at = None
        return
    quote.approval_status = ApprovalStatus.PENDING.value
    quote.approved_by_id = None
    quote.approved_at = None
    if notify:
        _notify_pending(db, quote.company_id, "quote", quote.quote_number, quote.id)


def assert_deal_approved_for_close(deal: Deal, target_stage: PipelineStage) -> None:
    if target_stage.stage_type not in (DealStageType.WON, DealStageType.LOST):
        return
    status = deal.approval_status
    if status == ApprovalStatus.PENDING.value:
        raise ApprovalRequired("Deal requires admin approval before closing")
    if status == ApprovalStatus.REJECTED.value:
        raise ApprovalRequired("Deal approval was rejected")


def assert_quote_approved_for_accept(quote: Quote) -> None:
    status = quote.approval_status
    if status == ApprovalStatus.PENDING.value:
        raise ApprovalRequired("Quote requires admin approval before acceptance")
    if status == ApprovalStatus.REJECTED.value:
        raise ApprovalRequired("Quote approval was rejected")


def approve_deal(db: Session, deal: Deal, approver: User) -> Deal:
    deal.approval_status = ApprovalStatus.APPROVED.value
    deal.approved_by_id = approver.id
    deal.approved_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    db.refresh(deal)
    return deal


def reject_deal(db: Session, deal: Deal, approver: User) -> Deal:
    deal.approval_status = ApprovalStatus.REJECTED.value
    deal.approved_by_id = approver.id
    deal.approved_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    db.refresh(deal)
    return deal


def approve_quote(db: Session, quote: Quote, approver: User) -> Quote:
    quote.approval_status = ApprovalStatus.APPROVED.value
    quote.approved_by_id = approver.id
    quote.approved_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    db.refresh(quote)
    return quote


def reject_quote(db: Session, quote: Quote, approver: User) -> Quote:
    quote.approval_status = ApprovalStatus.REJECTED.value
    quote.approved_by_id = approver.id
    quote.approved_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    db.refresh(quote)
    return quote


def _notify_pending(db: Session, company_id: int, kind: str, label: str, entity_id: int) -> None:
    link = f"/admin/approvals?tab={kind}s"
    title = f"Approval needed: {kind} {label}"
    message = f"A {kind} is waiting for admin/MD approval."
    for role in ("admin", "md"):
        notify_role_users(
            db,
            company_id=company_id,
            role=role,
            title=title,
            message=message,
            type="warning",
            link=link,
            category="approvals",
            dedupe_window_seconds=3600,
            dedupe_match_message=False,
            skip_if_unread_duplicate=True,
        )


def serialize_approval_settings(row: Optional[CompanySettings]) -> dict:
    if row is None:
        return {
            "deal_approval_amount_threshold": None,
            "discount_approval_percent_threshold": None,
        }
    return {
        "deal_approval_amount_threshold": (
            str(row.deal_approval_amount_threshold)
            if row.deal_approval_amount_threshold is not None
            else None
        ),
        "discount_approval_percent_threshold": row.discount_approval_percent_threshold,
    }


def apply_approval_settings_update(row: CompanySettings, payload: dict) -> None:
    if "deal_approval_amount_threshold" in payload:
        raw = payload["deal_approval_amount_threshold"]
        if raw is None or raw == "":
            row.deal_approval_amount_threshold = None
        else:
            amount = Decimal(str(raw))
            if amount < 0:
                raise ValueError("deal_approval_amount_threshold must be >= 0")
            row.deal_approval_amount_threshold = amount
    if "discount_approval_percent_threshold" in payload:
        raw = payload["discount_approval_percent_threshold"]
        if raw is None or raw == "":
            row.discount_approval_percent_threshold = None
        else:
            pct = float(raw)
            if pct < 0 or pct > 100:
                raise ValueError("discount_approval_percent_threshold must be between 0 and 100")
            row.discount_approval_percent_threshold = pct
