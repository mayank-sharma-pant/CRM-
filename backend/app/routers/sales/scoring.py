from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.core.user import User
from app.models.sales.scoring import ScoringRule
from app.services.scoring.engine import fields_for, OPERATORS
from app.services.scoring.recompute import recompute_all
from app.utils.dependencies import (
    apply_company_scope,
    ensure_company_access,
    get_current_user,
    require_admin_or_md,
)

router = APIRouter()

_ENTITY_TYPES = {"lead", "deal"}


class ScoringRuleIn(BaseModel):
    entity_type: str
    field: str
    operator: str
    value: Optional[str] = None
    points: int
    is_active: Optional[bool] = True


class ScoringRulePatch(BaseModel):
    field: Optional[str] = None
    operator: Optional[str] = None
    value: Optional[str] = None
    points: Optional[int] = None
    is_active: Optional[bool] = None


class RecomputeIn(BaseModel):
    entity_type: str


def _serialize(rule: ScoringRule) -> dict:
    return {
        "id": rule.id,
        "entity_type": rule.entity_type,
        "field": rule.field,
        "operator": rule.operator,
        "value": rule.value,
        "points": rule.points,
        "is_active": rule.is_active,
    }


def _validate(entity_type: str, field: str, operator: str, value) -> None:
    if entity_type not in _ENTITY_TYPES:
        raise HTTPException(status_code=400, detail="entity_type must be 'lead' or 'deal'")
    fields = fields_for(entity_type)
    if field not in fields:
        raise HTTPException(status_code=400, detail=f"Invalid field: {field}")
    if operator not in OPERATORS:
        raise HTTPException(status_code=400, detail=f"Invalid operator: {operator}")
    if operator not in fields[field]:
        raise HTTPException(
            status_code=400,
            detail=f"Operator '{operator}' not valid for field '{field}'",
        )
    if operator not in ("is_set", "is_empty") and (value is None or str(value).strip() == ""):
        raise HTTPException(status_code=400, detail="value is required for this operator")


def _get_rule(db: Session, rule_id: int, current_user: User) -> ScoringRule:
    rule = (
        apply_company_scope(db.query(ScoringRule), ScoringRule, current_user)
        .filter(ScoringRule.id == rule_id)
        .first()
    )
    if rule is None:
        raise HTTPException(status_code=404, detail="Rule not found")
    ensure_company_access(rule, current_user)
    return rule


@router.get("/rules")
def list_rules(
    entity_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.company_id is None:
        raise HTTPException(status_code=403, detail="User must belong to a company")
    q = apply_company_scope(db.query(ScoringRule), ScoringRule, current_user)
    if entity_type is not None:
        q = q.filter(ScoringRule.entity_type == entity_type)
    rows = q.order_by(ScoringRule.id.asc()).all()
    return {"items": [_serialize(r) for r in rows], "total": len(rows)}


@router.post("/rules", status_code=status.HTTP_201_CREATED)
def create_rule(
    payload: ScoringRuleIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    if current_user.company_id is None:
        raise HTTPException(status_code=403, detail="User must belong to a company")
    _validate(payload.entity_type, payload.field, payload.operator, payload.value)
    rule = ScoringRule(
        company_id=current_user.company_id,
        entity_type=payload.entity_type,
        field=payload.field,
        operator=payload.operator,
        value=payload.value,
        points=payload.points,
        is_active=payload.is_active if payload.is_active is not None else True,
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)
    recompute_all(db, current_user.company_id, payload.entity_type)
    return _serialize(rule)


@router.put("/rules/{rule_id:int}")
def update_rule(
    rule_id: int,
    payload: ScoringRulePatch,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    rule = _get_rule(db, rule_id, current_user)
    data = payload.model_dump(exclude_unset=True)
    field = data.get("field", rule.field)
    operator = data.get("operator", rule.operator)
    value = data.get("value", rule.value)
    _validate(rule.entity_type, field, operator, value)
    rule.field = field
    rule.operator = operator
    rule.value = value
    if "points" in data and data["points"] is not None:
        rule.points = data["points"]
    if "is_active" in data and data["is_active"] is not None:
        rule.is_active = data["is_active"]
    db.commit()
    db.refresh(rule)
    recompute_all(db, current_user.company_id, rule.entity_type)
    return _serialize(rule)


@router.delete("/rules/{rule_id:int}", status_code=status.HTTP_204_NO_CONTENT)
def delete_rule(
    rule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    rule = _get_rule(db, rule_id, current_user)
    entity_type = rule.entity_type
    db.delete(rule)
    db.commit()
    recompute_all(db, current_user.company_id, entity_type)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/recompute")
def recompute(
    payload: RecomputeIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    if payload.entity_type not in _ENTITY_TYPES:
        raise HTTPException(status_code=400, detail="entity_type must be 'lead' or 'deal'")
    n = recompute_all(db, current_user.company_id, payload.entity_type)
    return {"updated": n, "entity_type": payload.entity_type}
