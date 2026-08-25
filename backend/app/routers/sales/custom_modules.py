from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.core.user import User
from app.services.sales.custom_modules import (
    create_field,
    create_module,
    create_record,
    delete_module,
    delete_record,
    get_module,
    get_record,
    list_fields,
    list_modules,
    list_records,
    patch_module,
    patch_record,
    serialize_field,
    serialize_module,
    serialize_record,
)
from app.utils.dependencies import get_current_user, require_admin_or_md

router = APIRouter()


class ModuleIn(BaseModel):
    name: str
    slug: str


class ModulePatch(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None


class FieldIn(BaseModel):
    name: str
    field_key: str
    field_type: str
    options: Optional[List[str]] = None


class RecordIn(BaseModel):
    title: str
    values: Optional[dict] = None


class RecordPatch(BaseModel):
    title: Optional[str] = None
    values: Optional[dict] = None


def _company_id(user: User) -> int:
    if user.company_id is None:
        raise HTTPException(status_code=403, detail="User must belong to a company")
    return user.company_id


def _is_admin(user: User) -> bool:
    role = user.role.value if hasattr(user.role, "value") else str(user.role)
    return role in ("admin", "md")


@router.get("")
def list_mods(
    include_inactive: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cid = _company_id(current_user)
    if include_inactive and not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Admin or MD access required")
    rows = list_modules(db, cid, active_only=not include_inactive)
    return {"items": [serialize_module(m) for m in rows], "total": len(rows)}


@router.post("", status_code=201)
def post_module(
    payload: ModuleIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    cid = _company_id(current_user)
    mod = create_module(db, cid, name=payload.name, slug=payload.slug)
    return serialize_module(mod)


@router.get("/{module_id:int}")
def read_module(
    module_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cid = _company_id(current_user)
    return serialize_module(get_module(db, cid, module_id))


@router.patch("/{module_id:int}")
def update_module(
    module_id: int,
    payload: ModulePatch,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    cid = _company_id(current_user)
    mod = get_module(db, cid, module_id)
    return serialize_module(patch_module(db, mod, name=payload.name, is_active=payload.is_active))


@router.delete("/{module_id:int}", status_code=204)
def remove_module(
    module_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    cid = _company_id(current_user)
    delete_module(db, get_module(db, cid, module_id))
    return Response(status_code=204)


@router.get("/{module_id:int}/fields")
def read_fields(
    module_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cid = _company_id(current_user)
    mod = get_module(db, cid, module_id)
    rows = list_fields(db, mod.id)
    return {"items": [serialize_field(f) for f in rows], "total": len(rows)}


@router.post("/{module_id:int}/fields", status_code=201)
def post_field(
    module_id: int,
    payload: FieldIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    cid = _company_id(current_user)
    mod = get_module(db, cid, module_id)
    field = create_field(
        db, cid, mod,
        name=payload.name,
        field_key=payload.field_key,
        field_type=payload.field_type,
        options=payload.options,
    )
    return serialize_field(field)


@router.get("/{module_id:int}/records")
def read_records(
    module_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cid = _company_id(current_user)
    mod = get_module(db, cid, module_id)
    rows = list_records(db, mod.id)
    return {"items": [serialize_record(r) for r in rows], "total": len(rows)}


@router.post("/{module_id:int}/records", status_code=201)
def post_record(
    module_id: int,
    payload: RecordIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cid = _company_id(current_user)
    mod = get_module(db, cid, module_id)
    rec = create_record(
        db, cid, mod, title=payload.title, values=payload.values,
        created_by_id=current_user.id,
    )
    return serialize_record(rec)


@router.get("/{module_id:int}/records/{record_id:int}")
def read_record(
    module_id: int,
    record_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cid = _company_id(current_user)
    get_module(db, cid, module_id)
    return serialize_record(get_record(db, cid, module_id, record_id))


@router.patch("/{module_id:int}/records/{record_id:int}")
def update_record(
    module_id: int,
    record_id: int,
    payload: RecordPatch,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cid = _company_id(current_user)
    mod = get_module(db, cid, module_id)
    rec = get_record(db, cid, module_id, record_id)
    return serialize_record(patch_record(db, mod, rec, title=payload.title, values=payload.values))


@router.delete("/{module_id:int}/records/{record_id:int}", status_code=204)
def remove_record(
    module_id: int,
    record_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cid = _company_id(current_user)
    get_module(db, cid, module_id)
    rec = get_record(db, cid, module_id, record_id)
    delete_record(db, rec)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
