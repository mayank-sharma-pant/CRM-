import json
import re
from datetime import datetime

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.sales.custom_field import CustomFieldDef, CustomFieldValue

ENTITY_TYPES = {"lead", "deal", "client"}
FIELD_TYPES = {"text", "number", "date", "picklist"}
_KEY_RE = re.compile(r"^[a-z][a-z0-9_]{0,49}$")


def serialize_def(field: CustomFieldDef) -> dict:
    return {
        "id": field.id,
        "entity_type": field.entity_type,
        "name": field.name,
        "field_key": field.field_key,
        "field_type": field.field_type,
        "options": field.options,
        "is_active": field.is_active,
    }


def list_defs(db: Session, company_id: int, entity_type: str | None = None, active_only: bool = False):
    query = db.query(CustomFieldDef).filter(CustomFieldDef.company_id == company_id)
    if entity_type:
        query = query.filter(CustomFieldDef.entity_type == entity_type)
    if active_only:
        query = query.filter(CustomFieldDef.is_active == True)
    return query.order_by(CustomFieldDef.id.asc()).all()


def create_def(db: Session, company_id: int, *, entity_type: str, name: str, field_key: str, field_type: str, options=None) -> CustomFieldDef:
    entity_type = (entity_type or "").strip().lower()
    field_type = (field_type or "").strip().lower()
    field_key = (field_key or "").strip().lower()
    name = (name or "").strip()
    if entity_type not in ENTITY_TYPES:
        raise HTTPException(status_code=400, detail="entity_type must be lead, deal, or client")
    if field_type not in FIELD_TYPES:
        raise HTTPException(status_code=400, detail="field_type must be text, number, date, or picklist")
    if not name or len(name) > 100:
        raise HTTPException(status_code=400, detail="name is required")
    if not _KEY_RE.match(field_key):
        raise HTTPException(status_code=400, detail="field_key must be a lowercase slug")
    if field_type == "picklist":
        if not options or not isinstance(options, list) or not all(isinstance(o, str) and o.strip() for o in options):
            raise HTTPException(status_code=400, detail="picklist fields require options")
    dup = (
        db.query(CustomFieldDef)
        .filter(
            CustomFieldDef.company_id == company_id,
            CustomFieldDef.entity_type == entity_type,
            CustomFieldDef.field_key == field_key,
        )
        .first()
    )
    if dup:
        raise HTTPException(status_code=400, detail="field_key already exists for this entity")
    field = CustomFieldDef(
        company_id=company_id,
        entity_type=entity_type,
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


def get_values_map(db: Session, company_id: int, entity_type: str, entity_id: int) -> dict:
    rows = (
        db.query(CustomFieldDef, CustomFieldValue)
        .outerjoin(
            CustomFieldValue,
            (CustomFieldValue.field_def_id == CustomFieldDef.id)
            & (CustomFieldValue.entity_id == entity_id),
        )
        .filter(
            CustomFieldDef.company_id == company_id,
            CustomFieldDef.entity_type == entity_type,
            CustomFieldDef.is_active == True,
        )
        .all()
    )
    out = {}
    for field, value_row in rows:
        out[field.field_key] = value_row.value if value_row is not None else None
    return out


def set_values(db: Session, company_id: int, entity_type: str, entity_id: int, values: dict) -> None:
    if not isinstance(values, dict):
        raise HTTPException(status_code=400, detail="custom_fields must be an object")
    defs = {
        f.field_key: f
        for f in list_defs(db, company_id, entity_type, active_only=True)
    }
    for key, raw in values.items():
        field = defs.get(key)
        if field is None:
            raise HTTPException(status_code=400, detail=f"Unknown custom field: {key}")
        stored = _normalize_value(field, raw)
        row = (
            db.query(CustomFieldValue)
            .filter(CustomFieldValue.field_def_id == field.id, CustomFieldValue.entity_id == entity_id)
            .first()
        )
        if row is None:
            db.add(
                CustomFieldValue(
                    company_id=company_id,
                    field_def_id=field.id,
                    entity_id=entity_id,
                    value=stored,
                )
            )
        else:
            row.value = stored


def _normalize_value(field: CustomFieldDef, raw) -> str | None:
    if raw is None:
        return None
    text = str(raw).strip()
    if text == "":
        return None
    if field.field_type == "number":
        try:
            float(text)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"{field.field_key} must be a number")
        return text
    if field.field_type == "date":
        try:
            datetime.strptime(text, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail=f"{field.field_key} must be YYYY-MM-DD")
        return text
    if field.field_type == "picklist":
        options = field.options or []
        if text not in options:
            raise HTTPException(status_code=400, detail=f"{field.field_key} must be one of: {', '.join(options)}")
        return text
    return text
