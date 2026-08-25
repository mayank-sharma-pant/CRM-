from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP

_TWO_PLACES = Decimal("0.01")


def month_bounds(year: int, month: int) -> tuple[datetime, datetime]:
    if not 1 <= month <= 12:
        raise ValueError(f"month must be 1-12, got {month}")
    start = datetime(year, month, 1)
    if month == 12:
        end = datetime(year + 1, 1, 1)
    else:
        end = datetime(year, month + 1, 1)
    return start, end


def effective_probability(deal, stage) -> int:
    prob = getattr(deal, "probability", None)
    if prob is not None:
        return int(prob)
    return int(getattr(stage, "default_probability", None) or 0)


def weighted_amount(deal, stage) -> Decimal:
    amount = getattr(deal, "amount", None) or Decimal("0")
    eff = effective_probability(deal, stage)
    weighted = Decimal(str(amount)) * Decimal(eff) / Decimal(100)
    return weighted.quantize(_TWO_PLACES, rounding=ROUND_HALF_UP)


def attainment_pct(part: Decimal, whole: Decimal) -> float | Decimal | None:
    if whole == 0:
        return None
    return part / whole


def format_money(value) -> str:
    return str(Decimal(str(value or 0)).quantize(_TWO_PLACES, rounding=ROUND_HALF_UP))


def closed_won_for_user(db, *, company_id: int, user_id: int, year: int, month: int) -> Decimal:
    from app.models.core.enums import DealStageType
    from app.models.sales.deal import Deal
    from app.models.sales.pipeline import PipelineStage

    start, end = month_bounds(year, month)
    rows = (
        db.query(Deal)
        .join(PipelineStage, Deal.stage_id == PipelineStage.id)
        .filter(
            Deal.company_id == company_id,
            Deal.assigned_to_id == user_id,
            PipelineStage.stage_type == DealStageType.WON,
            Deal.closed_at.isnot(None),
            Deal.closed_at >= start,
            Deal.closed_at < end,
        )
        .all()
    )
    total = sum((d.amount or Decimal("0")) for d in rows) or Decimal("0")
    return total.quantize(_TWO_PLACES, rounding=ROUND_HALF_UP)


def open_weighted_for_user(db, *, company_id: int, user_id: int) -> Decimal:
    from app.models.core.enums import DealStageType
    from app.models.sales.deal import Deal
    from app.models.sales.pipeline import PipelineStage

    rows = (
        db.query(Deal, PipelineStage)
        .join(PipelineStage, Deal.stage_id == PipelineStage.id)
        .filter(
            Deal.company_id == company_id,
            Deal.assigned_to_id == user_id,
            PipelineStage.stage_type == DealStageType.OPEN,
        )
        .all()
    )
    total = Decimal("0")
    for deal, stage in rows:
        total += weighted_amount(deal, stage)
    return total.quantize(_TWO_PLACES, rounding=ROUND_HALF_UP)


def build_report(db, *, company_id: int, users, year: int, month: int) -> list[dict]:
    from app.models.sales.sales_quota import SalesQuota

    user_ids = [u.id for u in users]
    quotas = {}
    if user_ids:
        for q in (
            db.query(SalesQuota)
            .filter(
                SalesQuota.company_id == company_id,
                SalesQuota.year == year,
                SalesQuota.month == month,
                SalesQuota.user_id.in_(user_ids),
            )
            .all()
        ):
            quotas[q.user_id] = q

    rows = []
    for user in users:
        quota_row = quotas.get(user.id)
        quota_amount = Decimal(str(quota_row.amount)) if quota_row else Decimal("0")
        closed_won = closed_won_for_user(
            db, company_id=company_id, user_id=user.id, year=year, month=month,
        )
        open_weighted = open_weighted_for_user(
            db, company_id=company_id, user_id=user.id,
        )
        rows.append({
            "user_id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "quota": format_money(quota_amount),
            "closed_won": format_money(closed_won),
            "open_weighted": format_money(open_weighted),
            "closed_pct": attainment_pct(closed_won, quota_amount),
            "pipeline_pct": attainment_pct(open_weighted, quota_amount),
            "quota_id": quota_row.id if quota_row else None,
        })
    return rows
