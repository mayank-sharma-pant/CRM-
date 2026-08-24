import json
from datetime import datetime
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from sqlalchemy import or_

from app.database import get_db
from app.utils.dependencies import get_current_user, apply_company_scope, ensure_company_access, get_active_team_id
from app.utils.audit import log_activity
from app.models.core.user import User
from app.models.core.team import Team
from app.models.core.team_membership import TeamMembership
from app.models.core.enums import DealStageType
from app.models.sales.deal import Deal
from app.models.sales.lead import Lead
from app.models.sales.client import Client
from app.models.sales.pipeline import Pipeline, PipelineStage
from app.services.sales.pipeline_seed import ensure_default_pipeline
from app.schemas.sales.deal import DealCreate, DealUpdate, DealStageUpdate, StageCreate, StageUpdate

router = APIRouter()

_VALID_STAGE_TYPES = {t.value for t in DealStageType}


def _role(user: User) -> str:
    r = getattr(user, "role", None)
    return str(getattr(r, "value", r)) if r is not None else ""


def _validate_ownership_refs(db: Session, current_user: User, *, assigned_to_id=None,
                              team_id=None, lead_id=None, client_id=None) -> None:
    """Ensure any provided ownership refs resolve within the caller's company."""
    checks = (
        ("assigned_to_id", assigned_to_id, User),
        ("team_id", team_id, Team),
        ("lead_id", lead_id, Lead),
        ("client_id", client_id, Client),
    )
    for field, value, model in checks:
        if value is None:
            continue
        found = apply_company_scope(db.query(model), model, current_user).filter(
            model.id == value
        ).first()
        if found is None:
            raise HTTPException(status_code=400, detail=f"{field} not found in your company")


def _apply_role_scope(db: Session, query, current_user: User, active_team_id: Optional[int]):
    """Mirror leads.py's role-based row scoping (see get_leads) for deals."""
    role = _role(current_user)
    if role == "sales":
        if active_team_id is not None:
            query = query.filter(
                Deal.team_id == active_team_id,
                or_(Deal.assigned_to_id == current_user.id, Deal.assigned_to_id.is_(None)),
            )
        else:
            # Fallback: no active team header/primary team set — still allow
            # "open to anyone" deals from any team the user belongs to.
            member_team_ids = [
                tm.team_id
                for tm in apply_company_scope(db.query(TeamMembership), TeamMembership, current_user)
                .filter(TeamMembership.user_id == current_user.id)
                .all()
            ]
            if member_team_ids:
                query = query.filter(
                    or_(
                        Deal.assigned_to_id == current_user.id,
                        (Deal.assigned_to_id.is_(None) & Deal.team_id.in_(member_team_ids)),
                    )
                )
            else:
                query = query.filter(Deal.assigned_to_id == current_user.id)
    elif role == "manager":
        if active_team_id is None:
            query = query.filter(False)
        else:
            query = query.filter(Deal.team_id == active_team_id)
    return query


def _ensure_deal_row_access(deal: Deal, current_user: User, active_team_id: Optional[int]) -> None:
    """Mirror leads.py get_lead's role check on by-id access."""
    role = _role(current_user)
    if role == "sales":
        own_or_open = (deal.assigned_to_id == current_user.id) or (
            deal.assigned_to_id is None and deal.team_id == active_team_id
        )
        if not own_or_open:
            raise HTTPException(status_code=403, detail="You do not have access to this deal")
    elif role == "manager":
        if active_team_id is None or deal.team_id != active_team_id:
            raise HTTPException(status_code=403, detail="You do not have access to this team's deal")


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
    _validate_ownership_refs(
        db, current_user,
        assigned_to_id=payload.assigned_to_id, team_id=payload.team_id,
        lead_id=payload.lead_id, client_id=payload.client_id,
    )

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
               active_team_id: Optional[int] = Depends(get_active_team_id),
               pipeline_id: Optional[int] = Query(None), stage_id: Optional[int] = Query(None),
               assigned_to_id: Optional[int] = Query(None),
               skip: int = 0, limit: int = 100):
    query = apply_company_scope(db.query(Deal), Deal, current_user)
    query = _apply_role_scope(db, query, current_user, active_team_id)
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
             current_user: User = Depends(get_current_user),
             active_team_id: Optional[int] = Depends(get_active_team_id)):
    deal = apply_company_scope(db.query(Deal), Deal, current_user).filter(Deal.id == deal_id).first()
    if deal is None:
        raise HTTPException(status_code=404, detail="Deal not found")
    ensure_company_access(deal, current_user)
    _ensure_deal_row_access(deal, current_user, active_team_id)
    stage = _get_stage(db, current_user, deal.stage_id)
    return _serialize_deal(deal, stage)


@router.patch("/{deal_id:int}")
def update_deal(deal_id: int, payload: DealUpdate, db: Session = Depends(get_db),
                current_user: User = Depends(get_current_user),
                active_team_id: Optional[int] = Depends(get_active_team_id)):
    deal = apply_company_scope(db.query(Deal), Deal, current_user).filter(Deal.id == deal_id).first()
    if deal is None:
        raise HTTPException(status_code=404, detail="Deal not found")
    ensure_company_access(deal, current_user)
    _ensure_deal_row_access(deal, current_user, active_team_id)
    data = payload.model_dump(exclude_unset=True)
    if "amount" in data and data["amount"] is not None and data["amount"] < 0:
        raise HTTPException(status_code=400, detail="amount must be >= 0")
    if "probability" in data and data["probability"] is not None and not (0 <= data["probability"] <= 100):
        raise HTTPException(status_code=400, detail="probability must be between 0 and 100")
    _validate_ownership_refs(
        db, current_user,
        assigned_to_id=data.get("assigned_to_id"), team_id=data.get("team_id"),
        lead_id=data.get("lead_id"), client_id=data.get("client_id"),
    )
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
                current_user: User = Depends(get_current_user),
                active_team_id: Optional[int] = Depends(get_active_team_id)):
    deal = apply_company_scope(db.query(Deal), Deal, current_user).filter(Deal.id == deal_id).first()
    if deal is None:
        raise HTTPException(status_code=404, detail="Deal not found")
    ensure_company_access(deal, current_user)
    _ensure_deal_row_access(deal, current_user, active_team_id)
    log_activity(db, user=current_user, action="deleted", entity_type="deal",
                 entity_id=deal.id, entity_name=deal.title)
    db.delete(deal)
    db.commit()
    return {"message": "Deal deleted"}


@router.patch("/{deal_id:int}/stage")
def move_deal_stage(deal_id: int, payload: DealStageUpdate, db: Session = Depends(get_db),
                    current_user: User = Depends(get_current_user),
                    active_team_id: Optional[int] = Depends(get_active_team_id)):
    deal = apply_company_scope(db.query(Deal), Deal, current_user).filter(Deal.id == deal_id).first()
    if deal is None:
        raise HTTPException(status_code=404, detail="Deal not found")
    ensure_company_access(deal, current_user)
    _ensure_deal_row_access(deal, current_user, active_team_id)
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
               active_team_id: Optional[int] = Depends(get_active_team_id),
               pipeline_id: Optional[int] = Query(None)):
    if pipeline_id is None:
        default_pipeline = ensure_default_pipeline(db, current_user.company_id)
        pipeline_id = default_pipeline.id

    stages = apply_company_scope(db.query(PipelineStage), PipelineStage, current_user).filter(
        PipelineStage.pipeline_id == pipeline_id
    ).order_by(PipelineStage.position).all()

    deals_q = apply_company_scope(db.query(Deal), Deal, current_user).filter(Deal.pipeline_id == pipeline_id)
    deals_q = _apply_role_scope(db, deals_q, current_user, active_team_id)
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


def _require_admin_or_md(current_user: User):
    if _role(current_user) not in ("admin", "md"):
        raise HTTPException(status_code=403, detail="Only admin or MD can configure stages")


def _serialize_stage(s: PipelineStage) -> dict:
    return {"id": s.id, "pipeline_id": s.pipeline_id, "name": s.name,
            "position": s.position, "stage_type": s.stage_type.value if hasattr(s.stage_type, "value") else s.stage_type,
            "default_probability": s.default_probability, "is_active": s.is_active}


@router.get("/pipelines")
def list_pipelines(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    pipelines = apply_company_scope(db.query(Pipeline), Pipeline, current_user).order_by(Pipeline.id).all()
    return {"items": [{"id": p.id, "name": p.name, "is_default": p.is_default, "is_active": p.is_active}
                      for p in pipelines]}


@router.get("/stages")
def list_stages(db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
                pipeline_id: Optional[int] = Query(None)):
    q = apply_company_scope(db.query(PipelineStage), PipelineStage, current_user)
    if pipeline_id is not None:
        q = q.filter(PipelineStage.pipeline_id == pipeline_id)
    stages = q.order_by(PipelineStage.pipeline_id, PipelineStage.position).all()
    return {"items": [_serialize_stage(s) for s in stages]}


@router.post("/stages", status_code=status.HTTP_201_CREATED)
def create_stage(payload: StageCreate, db: Session = Depends(get_db),
                 current_user: User = Depends(get_current_user)):
    _require_admin_or_md(current_user)
    pipeline = apply_company_scope(db.query(Pipeline), Pipeline, current_user).filter(
        Pipeline.id == payload.pipeline_id
    ).first()
    if pipeline is None:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    if not (0 <= payload.default_probability <= 100):
        raise HTTPException(status_code=400, detail="default_probability must be 0..100")
    if payload.stage_type is not None and payload.stage_type not in _VALID_STAGE_TYPES:
        raise HTTPException(status_code=400, detail="stage_type must be one of: open, won, lost")
    stage = PipelineStage(
        company_id=current_user.company_id, pipeline_id=pipeline.id, name=payload.name,
        position=payload.position, stage_type=payload.stage_type,
        default_probability=payload.default_probability,
    )
    db.add(stage)
    db.commit()
    db.refresh(stage)
    return _serialize_stage(stage)


@router.patch("/stages/{stage_id:int}")
def update_stage(stage_id: int, payload: StageUpdate, db: Session = Depends(get_db),
                 current_user: User = Depends(get_current_user)):
    _require_admin_or_md(current_user)
    stage = apply_company_scope(db.query(PipelineStage), PipelineStage, current_user).filter(
        PipelineStage.id == stage_id
    ).first()
    if stage is None:
        raise HTTPException(status_code=404, detail="Stage not found")
    data = payload.model_dump(exclude_unset=True)
    if "default_probability" in data and data["default_probability"] is not None and not (0 <= data["default_probability"] <= 100):
        raise HTTPException(status_code=400, detail="default_probability must be 0..100")
    if "stage_type" in data and data["stage_type"] is not None and data["stage_type"] not in _VALID_STAGE_TYPES:
        raise HTTPException(status_code=400, detail="stage_type must be one of: open, won, lost")
    for field, value in data.items():
        setattr(stage, field, value)
    db.commit()
    db.refresh(stage)
    return _serialize_stage(stage)
