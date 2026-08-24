from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.core.user import User
from app.models.sales.custom_field import CustomFieldDef
from app.services.sales.custom_fields import create_def, list_defs, serialize_def
from app.utils.dependencies import apply_company_scope, ensure_company_access, get_current_user, require_admin_or_md

router = APIRouter()


class CustomFieldCreate(BaseModel):
    entity_type: str
    name: str
    field_key: str
    field_type: str
    options: Optional[List[str]] = None


class CustomFieldPatch(BaseModel):
    name: Optional[str] = None
    options: Optional[List[str]] = None
    is_active: Optional[bool] = None


@router.get("")
def list_custom_fields(
    entity_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.company_id is None:
        raise HTTPException(status_code=403, detail="User must belong to a company")
    rows = list_defs(db, current_user.company_id, entity_type=entity_type)
    return {"items": [serialize_def(r) for r in rows], "total": len(rows)}


@router.post("", status_code=201)
def create_custom_field(
    payload: CustomFieldCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    if current_user.company_id is None:
        raise HTTPException(status_code=403, detail="User must belong to a company")
    field = create_def(
        db,
        current_user.company_id,
        entity_type=payload.entity_type,
        name=payload.name,
        field_key=payload.field_key,
        field_type=payload.field_type,
        options=payload.options,
    )
    return serialize_def(field)


@router.patch("/{field_id:int}")
def patch_custom_field(
    field_id: int,
    payload: CustomFieldPatch,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    field = apply_company_scope(db.query(CustomFieldDef), CustomFieldDef, current_user).filter(
        CustomFieldDef.id == field_id
    ).first()
    if field is None:
        raise HTTPException(status_code=404, detail="Custom field not found")
    ensure_company_access(field, current_user)
    data = payload.model_dump(exclude_unset=True)
    if "name" in data and data["name"]:
        field.name = data["name"].strip()
    if "is_active" in data and data["is_active"] is not None:
        field.is_active = data["is_active"]
    if "options" in data:
        import json
        field.options_json = json.dumps(data["options"]) if data["options"] is not None else None
    db.commit()
    db.refresh(field)
    return serialize_def(field)
