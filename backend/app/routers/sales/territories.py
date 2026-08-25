from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.core.team import Team
from app.models.core.user import User
from app.models.sales.territory import Territory, TerritoryRule
from app.services.sales.territory import MATCH_FIELDS
from app.utils.dependencies import (
    apply_company_scope,
    ensure_company_access,
    get_current_user,
    require_admin_or_md,
)

router = APIRouter()


class TerritoryRuleIn(BaseModel):
    match_field: str
    match_value: str


class TerritoryCreate(BaseModel):
    name: str
    team_id: int
    priority: Optional[int] = 100
    is_active: Optional[bool] = True
    rules: Optional[List[TerritoryRuleIn]] = None


class TerritoryPatch(BaseModel):
    name: Optional[str] = None
    team_id: Optional[int] = None
    priority: Optional[int] = None
    is_active: Optional[bool] = None


def _serialize_rule(rule: TerritoryRule) -> dict:
    return {
        "id": rule.id,
        "match_field": rule.match_field,
        "match_value": rule.match_value,
    }


def _serialize_territory(territory: Territory) -> dict:
    return {
        "id": territory.id,
        "name": territory.name,
        "team_id": territory.team_id,
        "priority": territory.priority,
        "is_active": territory.is_active,
        "rules": [_serialize_rule(r) for r in territory.rules],
    }


def _validate_match_value(match_field: str, match_value: str) -> str:
    if match_field not in MATCH_FIELDS:
        raise HTTPException(status_code=400, detail=f"Invalid match_field: {match_field}")
    value = (match_value or "").strip()
    if not value:
        raise HTTPException(status_code=400, detail="match_value cannot be empty")
    return value


def _validate_team(db: Session, current_user: User, team_id: int) -> None:
    team = apply_company_scope(db.query(Team), Team, current_user).filter(Team.id == team_id).first()
    if team is None:
        raise HTTPException(status_code=400, detail="Team not found")


def _get_territory(db: Session, territory_id: int, current_user: User) -> Territory:
    territory = (
        apply_company_scope(db.query(Territory), Territory, current_user)
        .options(joinedload(Territory.rules))
        .filter(Territory.id == territory_id)
        .first()
    )
    if territory is None:
        raise HTTPException(status_code=404, detail="Territory not found")
    ensure_company_access(territory, current_user)
    return territory


@router.get("")
def list_territories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.company_id is None:
        raise HTTPException(status_code=403, detail="User must belong to a company")
    rows = (
        apply_company_scope(db.query(Territory), Territory, current_user)
        .options(joinedload(Territory.rules))
        .order_by(Territory.priority.asc(), Territory.id.asc())
        .all()
    )
    return {"items": [_serialize_territory(t) for t in rows], "total": len(rows)}


@router.post("", status_code=status.HTTP_201_CREATED)
def create_territory(
    payload: TerritoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    if current_user.company_id is None:
        raise HTTPException(status_code=403, detail="User must belong to a company")
    name = (payload.name or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="name is required")
    _validate_team(db, current_user, payload.team_id)

    territory = Territory(
        company_id=current_user.company_id,
        name=name,
        team_id=payload.team_id,
        priority=payload.priority if payload.priority is not None else 100,
        is_active=payload.is_active if payload.is_active is not None else True,
    )
    db.add(territory)
    db.flush()

    for rule_in in payload.rules or []:
        value = _validate_match_value(rule_in.match_field, rule_in.match_value)
        db.add(
            TerritoryRule(
                company_id=current_user.company_id,
                territory_id=territory.id,
                match_field=rule_in.match_field,
                match_value=value,
            )
        )

    db.commit()
    db.refresh(territory)
    territory = _get_territory(db, territory.id, current_user)
    return _serialize_territory(territory)


@router.patch("/{territory_id:int}")
def patch_territory(
    territory_id: int,
    payload: TerritoryPatch,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    territory = _get_territory(db, territory_id, current_user)
    data = payload.model_dump(exclude_unset=True)
    if "name" in data:
        name = (data["name"] or "").strip()
        if not name:
            raise HTTPException(status_code=400, detail="name cannot be empty")
        territory.name = name
    if "team_id" in data and data["team_id"] is not None:
        _validate_team(db, current_user, data["team_id"])
        territory.team_id = data["team_id"]
    if "priority" in data and data["priority"] is not None:
        territory.priority = data["priority"]
    if "is_active" in data and data["is_active"] is not None:
        territory.is_active = data["is_active"]
    db.commit()
    db.refresh(territory)
    territory = _get_territory(db, territory.id, current_user)
    return _serialize_territory(territory)


@router.delete("/{territory_id:int}", status_code=status.HTTP_204_NO_CONTENT)
def delete_territory(
    territory_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    territory = _get_territory(db, territory_id, current_user)
    db.delete(territory)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{territory_id:int}/rules", status_code=status.HTTP_201_CREATED)
def add_territory_rule(
    territory_id: int,
    payload: TerritoryRuleIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    territory = _get_territory(db, territory_id, current_user)
    value = _validate_match_value(payload.match_field, payload.match_value)
    rule = TerritoryRule(
        company_id=current_user.company_id,
        territory_id=territory.id,
        match_field=payload.match_field,
        match_value=value,
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return _serialize_rule(rule)


@router.delete("/{territory_id:int}/rules/{rule_id:int}", status_code=status.HTTP_204_NO_CONTENT)
def delete_territory_rule(
    territory_id: int,
    rule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    territory = _get_territory(db, territory_id, current_user)
    rule = (
        apply_company_scope(db.query(TerritoryRule), TerritoryRule, current_user)
        .filter(TerritoryRule.id == rule_id, TerritoryRule.territory_id == territory.id)
        .first()
    )
    if rule is None:
        raise HTTPException(status_code=404, detail="Rule not found")
    ensure_company_access(rule, current_user)
    db.delete(rule)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
