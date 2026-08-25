"""GDPR/DPDP export, erase, and retention."""
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.core.company_settings import CompanySettings
from app.models.core.user import User
from app.models.sales.client import Client
from app.models.sales.lead import Lead
from app.models.sales.note import Note
from app.models.sales.privacy_request import PrivacyRequest
from app.utils.dependencies import apply_company_scope

REDACTED = "Redacted"


def _log(db: Session, user: User, action: str, subject_type: str, subject_id: int | None) -> None:
    db.add(PrivacyRequest(
        company_id=user.company_id,
        actor_user_id=user.id,
        action=action,
        subject_type=subject_type,
        subject_id=subject_id,
    ))


def _get_lead(db: Session, user: User, lead_id: int) -> Lead:
    row = apply_company_scope(db.query(Lead), Lead, user).filter(Lead.id == lead_id).first()
    if row is None:
        raise HTTPException(status_code=404, detail="Lead not found")
    return row


def _get_client(db: Session, user: User, client_id: int) -> Client:
    row = apply_company_scope(db.query(Client), Client, user).filter(Client.id == client_id).first()
    if row is None:
        raise HTTPException(status_code=404, detail="Client not found")
    return row


def _notes_for(db: Session, user: User, *, lead_id=None, client_id=None) -> list[Note]:
    q = apply_company_scope(db.query(Note), Note, user)
    if lead_id is not None:
        q = q.filter(Note.lead_id == lead_id)
    else:
        q = q.filter(Note.client_id == client_id)
    return q.all()


def export_lead(db: Session, user: User, lead_id: int) -> dict:
    lead = _get_lead(db, user, lead_id)
    notes = _notes_for(db, user, lead_id=lead.id)
    _log(db, user, "export", "lead", lead.id)
    db.commit()
    return {
        "subject_type": "lead",
        "id": lead.id,
        "name": lead.name,
        "email": lead.email,
        "phone": lead.phone,
        "company": lead.company,
        "website": lead.website,
        "industry": lead.industry,
        "linkedin_url": lead.linkedin_url,
        "score": lead.score,
        "notes_field": lead.notes,
        "notes": [n.content for n in notes],
        "created_at": lead.created_at.isoformat() if lead.created_at else None,
    }


def export_client(db: Session, user: User, client_id: int) -> dict:
    person = _get_client(db, user, client_id)
    notes = _notes_for(db, user, client_id=person.id)
    _log(db, user, "export", "client", person.id)
    db.commit()
    return {
        "subject_type": "client",
        "id": person.id,
        "name": person.name,
        "email": person.email,
        "phone": person.phone,
        "company": person.company,
        "address": person.address,
        "gstin": person.gstin,
        "notes": [n.content for n in notes],
        "created_at": person.created_at.isoformat() if person.created_at else None,
    }


def export_me(db: Session, user: User) -> dict:
    _log(db, user, "export", "user", user.id)
    db.commit()
    return {
        "subject_type": "user",
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": getattr(getattr(user, "role", None), "value", user.role),
        "company_id": user.company_id,
    }


def _blank_notes(notes: list[Note]) -> None:
    for note in notes:
        note.content = ""


def erase_lead(db: Session, user: User, lead_id: int) -> dict:
    lead = _get_lead(db, user, lead_id)
    lead.name = REDACTED
    lead.email = None
    lead.phone = None
    lead.company = None
    lead.website = None
    lead.industry = None
    lead.linkedin_url = None
    lead.enriched_at = None
    lead.enrichment_source = None
    lead.score = None
    lead.score_updated_at = None
    lead.notes = None
    _blank_notes(_notes_for(db, user, lead_id=lead.id))
    _log(db, user, "erase", "lead", lead.id)
    db.commit()
    return {"ok": True, "id": lead.id}


def erase_client(db: Session, user: User, client_id: int) -> dict:
    person = _get_client(db, user, client_id)
    person.name = REDACTED
    person.email = None
    person.phone = None
    person.address = None
    person.gstin = None
    _blank_notes(_notes_for(db, user, client_id=person.id))
    _log(db, user, "erase", "client", person.id)
    db.commit()
    return {"ok": True, "id": person.id}


def _aware(dt):
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def apply_retention(db: Session, user: User) -> dict:
    settings = (
        apply_company_scope(db.query(CompanySettings), CompanySettings, user)
        .filter(CompanySettings.company_id == user.company_id)
        .first()
    )
    days = int(settings.retention_days) if settings and settings.retention_days else 0
    if days <= 0:
        return {"erased": 0, "retention_days": days}
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    leads = (
        apply_company_scope(db.query(Lead), Lead, user)
        .filter(Lead.deleted_at.isnot(None), Lead.name != REDACTED)
        .all()
    )
    count = 0
    for lead in leads:
        if _aware(lead.deleted_at) <= cutoff:
            erase_lead(db, user, lead.id)
            count += 1
    return {"erased": count, "retention_days": days}


def get_or_create_settings(db: Session, user: User) -> CompanySettings:
    row = (
        apply_company_scope(db.query(CompanySettings), CompanySettings, user)
        .filter(CompanySettings.company_id == user.company_id)
        .first()
    )
    if row is None:
        row = CompanySettings(company_id=user.company_id, company_name="Company")
        db.add(row)
        db.commit()
        db.refresh(row)
    return row
