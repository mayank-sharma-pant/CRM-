import json
from datetime import datetime
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.utils.dependencies import get_current_user, apply_company_scope, ensure_company_access
from app.utils.audit import log_activity
from app.models.core.user import User
from app.models.core.enums import DealStageType
from app.models.sales.deal import Deal
from app.models.sales.pipeline import Pipeline, PipelineStage
from app.services.sales.pipeline_seed import ensure_default_pipeline
from app.schemas.sales.deal import DealCreate, DealUpdate, DealStageUpdate

router = APIRouter()


def _role(user: User) -> str:
    r = getattr(user, "role", None)
    return str(getattr(r, "value", r)) if r is not None else ""


def _get_stage(db: Session, current_user: User, stage_id: int) -> Optional[PipelineStage]:
    return apply_company_scope(db.query(PipelineStage), PipelineStage, current_user).filter(
        PipelineStage.id == stage_id
    ).first()


def _effective_probability(deal: Deal, stage: PipelineStage) -> int:
    if deal.probability is not None:
        return deal.probability
    return stage.default_probability or 0


def _serialize_deal(deal: Deal, stage: PipelineStage) -> dict:
    return {
        "id": deal.id,
        "title": deal.title,
        "amount": str(deal.amount) if deal.amount is not None else "0",
        "currency": deal.currency,
        "pipeline_id": deal.pipeline_id,
        "stage_id": deal.stage_id,
        "stage_name": stage.name if stage else None,
        "stage_type": stage.stage_type.value if stage else None,
        "probability": deal.probability,
        "effective_probability": _effective_probability(deal, stage) if stage else None,
        "expected_close": deal.expected_close.isoformat() if deal.expected_close else None,
        "closed_at": deal.closed_at.isoformat() if deal.closed_at else None,
        "lead_id": deal.lead_id,
        "client_id": deal.client_id,
        "assigned_to_id": deal.assigned_to_id,
        "source": deal.source,
        "created_at": deal.created_at.isoformat() if deal.created_at else None,
    }


@router.post("", status_code=status.HTTP_201_CREATED)
def create_deal(payload: DealCreate, db: Session = Depends(get_db),
                current_user: User = Depends(get_current_user)):
    if payload.amount is not None and payload.amount < 0:
        raise HTTPException(status_code=400, detail="amount must be >= 0")
    if payload.probability is not None and not (0 <= payload.probability <= 100):
        raise HTTPException(status_code=400, detail="probability must be between 0 and 100")

    pipeline_id = payload.pipeline_id
    stage_id = payload.stage_id
    if pipeline_id is None or stage_id is None:
        default_pipeline = ensure_default_pipeline(db, current_user.company_id)
        pipeline_id = pipeline_id or default_pipeline.id
        if stage_id is None:
            first_stage = apply_company_scope(db.query(PipelineStage), PipelineStage, current_user).filter(
                PipelineStage.pipeline_id == pipeline_id
            ).order_by(PipelineStage.position).first()
            if first_stage is None:
                raise HTTPException(status_code=400, detail="pipeline has no stages")
            stage_id = first_stage.id

    stage = _get_stage(db, current_user, stage_id)
    if stage is None or stage.pipeline_id != pipeline_id:
        raise HTTPException(status_code=400, detail="stage does not belong to pipeline")

    deal = Deal(
        company_id=current_user.company_id,
        title=payload.title,
        amount=payload.amount if payload.amount is not None else Decimal("0"),
        currency=payload.currency or "INR",
        pipeline_id=pipeline_id,
        stage_id=stage_id,
        probability=payload.probability,
        expected_close=payload.expected_close,
        lead_id=payload.lead_id,
        client_id=payload.client_id,
        assigned_to_id=payload.assigned_to_id,
        created_by_id=current_user.id,
        team_id=payload.team_id,
        source=payload.source,
    )
    db.add(deal)
    db.flush()
    log_activity(db, user=current_user, action="created", entity_type="deal",
                 entity_id=deal.id, entity_name=deal.title,
                 after=json.dumps({"amount": str(deal.amount), "stage_id": stage_id}))
    db.commit()
    db.refresh(deal)
    return _serialize_deal(deal, stage)


@router.get("")
def list_deals(db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
               pipeline_id: Optional[int] = Query(None), stage_id: Optional[int] = Query(None),
               assigned_to_id: Optional[int] = Query(None),
               skip: int = 0, limit: int = 100):
    query = apply_company_scope(db.query(Deal), Deal, current_user)
    if _role(current_user) == "sales":
        query = query.filter(
            (Deal.assigned_to_id == current_user.id) | (Deal.assigned_to_id.is_(None))
        )
    if pipeline_id is not None:
        query = query.filter(Deal.pipeline_id == pipeline_id)
    if stage_id is not None:
        query = query.filter(Deal.stage_id == stage_id)
    if assigned_to_id is not None:
        query = query.filter(Deal.assigned_to_id == assigned_to_id)

    total = query.count()
    deals = query.order_by(Deal.created_at.desc()).offset(skip).limit(limit).all()
    stage_ids = {d.stage_id for d in deals}
    stage_map = {
        s.id: s for s in apply_company_scope(db.query(PipelineStage), PipelineStage, current_user)
        .filter(PipelineStage.id.in_(stage_ids or [-1])).all()
    }
    return {
        "items": [_serialize_deal(d, stage_map.get(d.stage_id)) for d in deals],
        "total": total, "skip": skip, "limit": limit,
    }


@router.get("/{deal_id:int}")
def get_deal(deal_id: int, db: Session = Depends(get_db),
             current_user: User = Depends(get_current_user)):
    deal = apply_company_scope(db.query(Deal), Deal, current_user).filter(Deal.id == deal_id).first()
    if deal is None:
        raise HTTPException(status_code=404, detail="Deal not found")
    ensure_company_access(deal, current_user)
    stage = _get_stage(db, current_user, deal.stage_id)
    return _serialize_deal(deal, stage)


@router.patch("/{deal_id:int}")
def update_deal(deal_id: int, payload: DealUpdate, db: Session = Depends(get_db),
                current_user: User = Depends(get_current_user)):
    deal = apply_company_scope(db.query(Deal), Deal, current_user).filter(Deal.id == deal_id).first()
    if deal is None:
        raise HTTPException(status_code=404, detail="Deal not found")
    ensure_company_access(deal, current_user)
    data = payload.model_dump(exclude_unset=True)
    if "amount" in data and data["amount"] is not None and data["amount"] < 0:
        raise HTTPException(status_code=400, detail="amount must be >= 0")
    if "probability" in data and data["probability"] is not None and not (0 <= data["probability"] <= 100):
        raise HTTPException(status_code=400, detail="probability must be between 0 and 100")
    for field, value in data.items():
        setattr(deal, field, value)
    audit_after = {**data, "amount": str(data["amount"])} if data.get("amount") is not None else data
    log_activity(db, user=current_user, action="updated", entity_type="deal",
                 entity_id=deal.id, entity_name=deal.title, after=json.dumps(audit_after, default=str))
    db.commit()
    db.refresh(deal)
    stage = _get_stage(db, current_user, deal.stage_id)
    return _serialize_deal(deal, stage)


@router.delete("/{deal_id:int}")
def delete_deal(deal_id: int, db: Session = Depends(get_db),
                current_user: User = Depends(get_current_user)):
    deal = apply_company_scope(db.query(Deal), Deal, current_user).filter(Deal.id == deal_id).first()
    if deal is None:
        raise HTTPException(status_code=404, detail="Deal not found")
    ensure_company_access(deal, current_user)
    log_activity(db, user=current_user, action="deleted", entity_type="deal",
                 entity_id=deal.id, entity_name=deal.title)
    db.delete(deal)
    db.commit()
    return {"message": "Deal deleted"}


@router.patch("/{deal_id:int}/stage")
def move_deal_stage(deal_id: int, payload: DealStageUpdate, db: Session = Depends(get_db),
                    current_user: User = Depends(get_current_user)):
    deal = apply_company_scope(db.query(Deal), Deal, current_user).filter(Deal.id == deal_id).first()
    if deal is None:
        raise HTTPException(status_code=404, detail="Deal not found")
    ensure_company_access(deal, current_user)
    stage = _get_stage(db, current_user, payload.stage_id)
    if stage is None or stage.pipeline_id != deal.pipeline_id:
        raise HTTPException(status_code=400, detail="stage does not belong to deal's pipeline")

    before_stage = deal.stage_id
    deal.stage_id = stage.id
    if stage.stage_type in (DealStageType.WON, DealStageType.LOST):
        deal.closed_at = deal.closed_at or datetime.utcnow()
    else:
        deal.closed_at = None
    log_activity(db, user=current_user, action="stage_changed", entity_type="deal",
                 entity_id=deal.id, entity_name=deal.title,
                 before=json.dumps({"stage_id": before_stage}), after=json.dumps({"stage_id": stage.id}))
    db.commit()
    db.refresh(deal)
    return _serialize_deal(deal, stage)


@router.get("/board")
def deal_board(db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
               pipeline_id: Optional[int] = Query(None)):
    if pipeline_id is None:
        default_pipeline = ensure_default_pipeline(db, current_user.company_id)
        pipeline_id = default_pipeline.id

    stages = apply_company_scope(db.query(PipelineStage), PipelineStage, current_user).filter(
        PipelineStage.pipeline_id == pipeline_id
    ).order_by(PipelineStage.position).all()

    deals_q = apply_company_scope(db.query(Deal), Deal, current_user).filter(Deal.pipeline_id == pipeline_id)
    if _role(current_user) == "sales":
        deals_q = deals_q.filter(
            (Deal.assigned_to_id == current_user.id) | (Deal.assigned_to_id.is_(None))
        )
    deals = deals_q.all()

    by_stage = {s.id: [] for s in stages}
    for d in deals:
        by_stage.setdefault(d.stage_id, []).append(d)

    open_forecast = Decimal("0")
    won_value = Decimal("0")
    stage_blocks = []
    for s in stages:
        s_deals = by_stage.get(s.id, [])
        stage_total = sum((d.amount or Decimal("0")) for d in s_deals) or Decimal("0")
        weighted = Decimal("0")
        for d in s_deals:
            amt = d.amount or Decimal("0")
            if s.stage_type == DealStageType.OPEN:
                eff = d.probability if d.probability is not None else (s.default_probability or 0)
                weighted += amt * Decimal(eff) / Decimal(100)
            elif s.stage_type == DealStageType.WON:
                won_value += amt
        if s.stage_type == DealStageType.OPEN:
            open_forecast += weighted
        stage_blocks.append({
            "stage_id": s.id, "name": s.name, "stage_type": s.stage_type.value,
            "stage_total": str(stage_total.quantize(Decimal("0.01"))),
            "weighted_value": str(weighted.quantize(Decimal("0.01"))),
            "deals": [_serialize_deal(d, s) for d in s_deals],
        })

    return {
        "pipeline_id": pipeline_id,
        "stages": stage_blocks,
        "open_forecast": str(open_forecast.quantize(Decimal("0.01"))),
        "won_value": str(won_value.quantize(Decimal("0.01"))),
    }
