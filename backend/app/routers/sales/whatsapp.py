import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.core.company_settings import CompanySettings
from app.models.core.user import User
from app.models.sales.client import Client
from app.models.sales.lead import Lead
from app.models.sales.whatsapp import WhatsAppMessage, WhatsAppTemplate
from app.services.sales.whatsapp import destination_msisdn, params_for_record, post_gupshup_template
from app.utils.dependencies import (
    apply_company_scope,
    ensure_company_access,
    get_current_user,
    require_admin_or_md,
)
from app.utils.helpers import normalize_phone

router = APIRouter()


class TemplateWrite(BaseModel):
    name: str
    provider_template_id: str
    language: Optional[str] = "en"
    body: Optional[str] = None
    variable_keys: Optional[list[str]] = None


class ConnectionWrite(BaseModel):
    api_key: Optional[str] = None
    source: Optional[str] = None


class SendWrite(BaseModel):
    template_id: int
    lead_id: Optional[int] = None
    client_id: Optional[int] = None
    params: Optional[list[str]] = None


def _company_user(user: User) -> int:
    if user.company_id is None:
        raise HTTPException(status_code=403, detail="User must belong to a company")
    return user.company_id


def _settings(db: Session, company_id: int) -> CompanySettings:
    row = db.query(CompanySettings).filter(CompanySettings.company_id == company_id).first()
    if row is None:
        row = CompanySettings(company_id=company_id, company_name="Company")
        db.add(row)
        db.flush()
    return row


def _parse_keys(raw) -> list[str]:
    if not raw:
        return []
    if isinstance(raw, list):
        return [str(x) for x in raw]
    try:
        data = json.loads(raw)
    except (TypeError, json.JSONDecodeError):
        return []
    if not isinstance(data, list):
        return []
    return [str(x) for x in data]


def _serialize_template(row: WhatsAppTemplate) -> dict:
    return {
        "id": row.id,
        "name": row.name,
        "language": row.language,
        "provider_template_id": row.provider_template_id,
        "body": row.body,
        "variable_keys": _parse_keys(row.variable_keys),
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


def _serialize_message(row: WhatsAppMessage) -> dict:
    return {
        "id": row.id,
        "template_id": row.template_id,
        "lead_id": row.lead_id,
        "client_id": row.client_id,
        "to_phone": row.to_phone,
        "status": row.status,
        "error": row.error,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


def _get_template(db: Session, user: User, template_id: int) -> WhatsAppTemplate:
    row = apply_company_scope(db.query(WhatsAppTemplate), WhatsAppTemplate, user).filter(
        WhatsAppTemplate.id == template_id
    ).first()
    if row is None:
        raise HTTPException(status_code=404, detail="Not found")
    ensure_company_access(row, user)
    return row


@router.get("/connection")
def get_connection(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    company_id = _company_user(current_user)
    settings = db.query(CompanySettings).filter(CompanySettings.company_id == company_id).first()
    key = getattr(settings, "whatsapp_api_key", None) if settings else None
    source = getattr(settings, "whatsapp_source", None) if settings else None
    return {
        "configured": bool(key and source),
        "source": source,
    }


@router.put("/connection")
def put_connection(
    body: ConnectionWrite,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    company_id = _company_user(current_user)
    settings = _settings(db, company_id)
    if body.api_key is not None:
        cleaned = (body.api_key or "").strip()
        settings.whatsapp_api_key = cleaned or None
    if body.source is not None:
        settings.whatsapp_source = normalize_phone(body.source)
    db.commit()
    return {
        "configured": bool(settings.whatsapp_api_key and settings.whatsapp_source),
        "source": settings.whatsapp_source,
    }


@router.get("/templates")
def list_templates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _company_user(current_user)
    rows = (
        apply_company_scope(db.query(WhatsAppTemplate), WhatsAppTemplate, current_user)
        .order_by(WhatsAppTemplate.id.desc())
        .all()
    )
    return {"items": [_serialize_template(r) for r in rows], "total": len(rows)}


@router.post("/templates", status_code=status.HTTP_201_CREATED)
def create_template(
    body: TemplateWrite,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    company_id = _company_user(current_user)
    name = (body.name or "").strip()
    provider_id = (body.provider_template_id or "").strip()
    if not name or len(name) > 100:
        raise HTTPException(status_code=400, detail="name is required (max 100 characters)")
    if not provider_id or len(provider_id) > 120:
        raise HTTPException(status_code=400, detail="provider_template_id is required")
    row = WhatsAppTemplate(
        company_id=company_id,
        name=name,
        language=(body.language or "en").strip() or "en",
        provider_template_id=provider_id,
        body=(body.body or "").strip() or None,
        variable_keys=json.dumps(body.variable_keys or []),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _serialize_template(row)


@router.get("/templates/{template_id}")
def get_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return _serialize_template(_get_template(db, current_user, template_id))


@router.delete("/templates/{template_id}")
def delete_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    row = _get_template(db, current_user, template_id)
    db.delete(row)
    db.commit()
    return {"ok": True}


@router.get("/messages")
def list_messages(
    lead_id: Optional[int] = Query(None),
    client_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _company_user(current_user)
    query = apply_company_scope(db.query(WhatsAppMessage), WhatsAppMessage, current_user)
    if lead_id is not None:
        query = query.filter(WhatsAppMessage.lead_id == lead_id)
    if client_id is not None:
        query = query.filter(WhatsAppMessage.client_id == client_id)
    rows = query.order_by(WhatsAppMessage.id.desc()).limit(100).all()
    return {"items": [_serialize_message(r) for r in rows], "total": len(rows)}


@router.post("/send", status_code=status.HTTP_201_CREATED)
def send_template(
    body: SendWrite,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    company_id = _company_user(current_user)
    template = _get_template(db, current_user, body.template_id)
    if body.lead_id is None and body.client_id is None:
        raise HTTPException(status_code=400, detail="lead_id or client_id is required")

    record = None
    phone = None
    lead_id = None
    client_id = None
    if body.lead_id is not None:
        record = apply_company_scope(db.query(Lead), Lead, current_user).filter(Lead.id == body.lead_id).first()
        if record is None:
            raise HTTPException(status_code=404, detail="Not found")
        ensure_company_access(record, current_user)
        phone = record.phone
        lead_id = record.id
    if body.client_id is not None:
        record = apply_company_scope(db.query(Client), Client, current_user).filter(Client.id == body.client_id).first()
        if record is None:
            raise HTTPException(status_code=404, detail="Not found")
        ensure_company_access(record, current_user)
        phone = record.phone
        client_id = record.id

    settings = db.query(CompanySettings).filter(CompanySettings.company_id == company_id).first()
    api_key = getattr(settings, "whatsapp_api_key", None) if settings else None
    source = getattr(settings, "whatsapp_source", None) if settings else None
    if not api_key or not source:
        raise HTTPException(status_code=400, detail="WhatsApp is not configured for this company")

    try:
        destination = destination_msisdn(phone)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    keys = _parse_keys(template.variable_keys)
    params = body.params if body.params is not None else params_for_record(keys, record)
    ok, snippet = post_gupshup_template(
        api_key=api_key,
        source=source,
        destination=destination,
        template_id=template.provider_template_id,
        params=params,
    )
    row = WhatsAppMessage(
        company_id=company_id,
        template_id=template.id,
        lead_id=lead_id,
        client_id=client_id,
        to_phone=destination,
        status="sent" if ok else "failed",
        error=None if ok else snippet,
        sent_by_id=current_user.id,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _serialize_message(row)
