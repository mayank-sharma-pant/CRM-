import json
import re
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.sales.custom_module import CustomModule, CustomModuleField, CustomModuleRecord
from app.services.sales.custom_fields import FIELD_TYPES, _normalize_value

MAX_MODULES = 10
MAX_FIELDS = 20
_KEY_RE = re.compile(r"^[a-z][a-z0-9_]{0,49}$")
RESERVED_SLUGS = frozenset({
    "lead", "leads", "deal", "deals", "client", "clients",
    "account", "accounts", "invoice", "invoices", "user", "users",
    "module", "modules", "company", "companies", "team", "teams",
    "quote", "quotes", "product", "products", "task", "tasks",
})


def _now():
    return datetime.now(timezone.utc)


def serialize_module(mod: CustomModule) -> dict:
    return {
        "id": mod.id,
        "name": mod.name,
        "slug": mod.slug,
        "is_active": mod.is_active,
    }


def serialize_field(field: CustomModuleField) -> dict:
    return {
        "id": field.id,
        "module_id": field.module_id,
        "name": field.name,
        "field_key": field.field_key,
        "field_type": field.field_type,
        "options": field.options,
        "is_active": field.is_active,
    }


def serialize_record(rec: CustomModuleRecord) -> dict:
    try:
        values = json.loads(rec.values_json or "{}")
    except json.JSONDecodeError:
        values = {}
    if not isinstance(values, dict):
        values = {}
    return {
        "id": rec.id,
        "module_id": rec.module_id,
        "title": rec.title,
        "values": values,
        "created_at": rec.created_at.isoformat() if rec.created_at else None,
        "updated_at": rec.updated_at.isoformat() if rec.updated_at else None,
    }


def list_modules(db: Session, company_id: int, *, active_only: bool = True):
    q = db.query(CustomModule).filter(CustomModule.company_id == company_id)
    if active_only:
        q = q.filter(CustomModule.is_active == True)  # noqa: E712
    return q.order_by(CustomModule.id.asc()).all()


def get_module(db: Session, company_id: int, module_id: int) -> CustomModule:
    row = (
        db.query(CustomModule)
        .filter(CustomModule.company_id == company_id, CustomModule.id == module_id)
        .first()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Module not found")
    return row


def get_module_by_slug(db: Session, company_id: int, slug: str) -> CustomModule:
    row = (
        db.query(CustomModule)
        .filter(CustomModule.company_id == company_id, CustomModule.slug == slug)
        .first()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Module not found")
    return row


def create_module(db: Session, company_id: int, *, name: str, slug: str) -> CustomModule:
    name = (name or "").strip()
    slug = (slug or "").strip().lower()
    if not name or len(name) > 100:
        raise HTTPException(status_code=400, detail="name is required")
    if not _KEY_RE.match(slug):
        raise HTTPException(status_code=400, detail="slug must be a lowercase slug")
    if slug in RESERVED_SLUGS:
        raise HTTPException(status_code=400, detail="slug is reserved")
    count = db.query(CustomModule).filter(CustomModule.company_id == company_id).count()
    if count >= MAX_MODULES:
        raise HTTPException(status_code=400, detail="Module limit reached")
    dup = (
        db.query(CustomModule)
        .filter(CustomModule.company_id == company_id, CustomModule.slug == slug)
        .first()
    )
    if dup:
        raise HTTPException(status_code=400, detail="slug already exists")
    mod = CustomModule(company_id=company_id, name=name, slug=slug, is_active=True)
    db.add(mod)
    db.commit()
    db.refresh(mod)
    return mod


def patch_module(db: Session, mod: CustomModule, *, name: str | None = None, is_active: bool | None = None) -> CustomModule:
    if name is not None:
        name = name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="name is required")
        mod.name = name
    if is_active is not None:
        mod.is_active = is_active
    db.commit()
    db.refresh(mod)
    return mod


def delete_module(db: Session, mod: CustomModule) -> None:
    db.delete(mod)
    db.commit()


def list_fields(db: Session, module_id: int, *, active_only: bool = False):
    q = db.query(CustomModuleField).filter(CustomModuleField.module_id == module_id)
    if active_only:
        q = q.filter(CustomModuleField.is_active == True)  # noqa: E712
    return q.order_by(CustomModuleField.id.asc()).all()


def create_field(
    db: Session,
    company_id: int,
    mod: CustomModule,
    *,
    name: str,
    field_key: str,
    field_type: str,
    options=None,
) -> CustomModuleField:
    name = (name or "").strip()
    field_key = (field_key or "").strip().lower()
    field_type = (field_type or "").strip().lower()
    if not name or len(name) > 100:
        raise HTTPException(status_code=400, detail="name is required")
    if not _KEY_RE.match(field_key):
        raise HTTPException(status_code=400, detail="field_key must be a lowercase slug")
    if field_type not in FIELD_TYPES:
        raise HTTPException(status_code=400, detail="field_type must be text, number, date, or picklist")
    if field_type == "picklist":
        if not options or not isinstance(options, list) or not all(isinstance(o, str) and o.strip() for o in options):
            raise HTTPException(status_code=400, detail="picklist fields require options")
    count = db.query(CustomModuleField).filter(CustomModuleField.module_id == mod.id).count()
    if count >= MAX_FIELDS:
        raise HTTPException(status_code=400, detail="Field limit reached")
    dup = (
        db.query(CustomModuleField)
        .filter(CustomModuleField.module_id == mod.id, CustomModuleField.field_key == field_key)
        .first()
    )
    if dup:
        raise HTTPException(status_code=400, detail="field_key already exists")
    field = CustomModuleField(
        company_id=company_id,
        module_id=mod.id,
        name=name,
        field_key=field_key,
        field_type=field_type,
        options_json=json.dumps(options) if options else None,
        is_active=True,
    )
    db.add(field)
    db.commit()
    db.refresh(field)
    return field


def _encode_values(db: Session, mod: CustomModule, values) -> str:
    if values is None:
        values = {}
    if not isinstance(values, dict):
        raise HTTPException(status_code=400, detail="values must be an object")
    defs = {f.field_key: f for f in list_fields(db, mod.id, active_only=True)}
    out = {}
    for key, raw in values.items():
        field = defs.get(key)
        if field is None:
            raise HTTPException(status_code=400, detail=f"Unknown custom field: {key}")
        out[key] = _normalize_value(field, raw)
    return json.dumps(out)


def create_record(
    db: Session,
    company_id: int,
    mod: CustomModule,
    *,
    title: str,
    values=None,
    created_by_id: int | None = None,
) -> CustomModuleRecord:
    if not mod.is_active:
        raise HTTPException(status_code=400, detail="Module is inactive")
    title = (title or "").strip()
    if not title or len(title) > 200:
        raise HTTPException(status_code=400, detail="title is required")
    rec = CustomModuleRecord(
        company_id=company_id,
        module_id=mod.id,
        title=title,
        values_json=_encode_values(db, mod, values),
        created_by_id=created_by_id,
        created_at=_now(),
        updated_at=_now(),
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return rec


def list_records(db: Session, module_id: int):
    return (
        db.query(CustomModuleRecord)
        .filter(CustomModuleRecord.module_id == module_id)
        .order_by(CustomModuleRecord.id.desc())
        .all()
    )


def get_record(db: Session, company_id: int, module_id: int, record_id: int) -> CustomModuleRecord:
    rec = (
        db.query(CustomModuleRecord)
        .filter(
            CustomModuleRecord.company_id == company_id,
            CustomModuleRecord.module_id == module_id,
            CustomModuleRecord.id == record_id,
        )
        .first()
    )
    if rec is None:
        raise HTTPException(status_code=404, detail="Record not found")
    return rec


def patch_record(db: Session, mod: CustomModule, rec: CustomModuleRecord, *, title=None, values=None) -> CustomModuleRecord:
    if not mod.is_active:
        raise HTTPException(status_code=400, detail="Module is inactive")
    if title is not None:
        title = title.strip()
        if not title:
            raise HTTPException(status_code=400, detail="title is required")
        rec.title = title
    if values is not None:
        rec.values_json = _encode_values(db, mod, values)
    rec.updated_at = _now()
    db.commit()
    db.refresh(rec)
    return rec


def delete_record(db: Session, rec: CustomModuleRecord) -> None:
    db.delete(rec)
    db.commit()
