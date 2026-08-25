import secrets
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.core.company import Company
from app.models.core.enums import CompanyStatus
from app.models.sales.client import Client
from app.models.sales.support_case import SupportCase, WebToCaseForm

STATUSES = frozenset({"open", "pending", "closed"})
SOURCES = frozenset({"crm", "web"})


def serialize_case(row: SupportCase) -> dict:
    return {
        "id": row.id,
        "client_id": row.client_id,
        "subject": row.subject,
        "body": row.body,
        "status": row.status,
        "requester_name": row.requester_name,
        "requester_email": row.requester_email,
        "source": row.source,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }


def serialize_form(row: WebToCaseForm) -> dict:
    return {
        "slug": row.slug,
        "is_active": row.is_active,
        "public_path": f"/c/{row.slug}",
    }


def get_case(db: Session, company_id: int, case_id: int) -> SupportCase:
    row = (
        db.query(SupportCase)
        .filter(SupportCase.company_id == company_id, SupportCase.id == case_id)
        .first()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Case not found")
    return row


def list_cases(db: Session, company_id: int, *, client_id: int | None = None, status: str | None = None):
    q = db.query(SupportCase).filter(SupportCase.company_id == company_id)
    if client_id is not None:
        q = q.filter(SupportCase.client_id == client_id)
    if status:
        q = q.filter(SupportCase.status == status)
    return q.order_by(SupportCase.id.desc()).all()


def _match_client(db: Session, company_id: int, email: str | None):
    if not email:
        return None
    return (
        db.query(Client)
        .filter(
            Client.company_id == company_id,
            func.lower(Client.email) == email.lower(),
        )
        .first()
    )


def create_case(
    db: Session,
    company_id: int,
    *,
    subject: str,
    body: str,
    client_id: int | None,
    requester_name: str | None,
    requester_email: str | None,
    source: str,
) -> SupportCase:
    subject = (subject or "").strip()
    body = (body or "").strip()
    if not subject or len(subject) > 200:
        raise HTTPException(status_code=400, detail="subject is required (max 200 characters)")
    if not body or len(body) > 20000:
        raise HTTPException(status_code=400, detail="body is required")
    if source not in SOURCES:
        raise HTTPException(status_code=400, detail="invalid source")
    name = (requester_name or "").strip() or None
    email = (requester_email or "").strip() or None
    linked = None
    if client_id is not None:
        linked = (
            db.query(Client)
            .filter(Client.company_id == company_id, Client.id == client_id)
            .first()
        )
        if linked is None:
            raise HTTPException(status_code=400, detail="client_id not found in your company")
        email = email or (linked.email or "").strip() or None
        name = name or linked.name
    row = SupportCase(
        company_id=company_id,
        client_id=linked.id if linked else None,
        subject=subject,
        body=body,
        status="open",
        requester_name=name,
        requester_email=email,
        source=source,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def patch_case(db: Session, row: SupportCase, *, status: str) -> SupportCase:
    if status not in STATUSES:
        raise HTTPException(status_code=400, detail="status must be open, pending, or closed")
    row.status = status
    row.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(row)
    return row


def delete_case(db: Session, row: SupportCase) -> None:
    db.delete(row)
    db.commit()


def ensure_form(db: Session, company_id: int) -> WebToCaseForm:
    row = db.query(WebToCaseForm).filter(WebToCaseForm.company_id == company_id).first()
    if row:
        return row
    row = WebToCaseForm(
        company_id=company_id,
        slug=secrets.token_urlsafe(16),
        is_active=True,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def patch_form(db: Session, row: WebToCaseForm, *, is_active: bool | None) -> WebToCaseForm:
    if is_active is not None:
        row.is_active = is_active
        db.commit()
        db.refresh(row)
    return row


def ingest_web_case(db: Session, company_id: int, *, name: str, email: str, subject: str, body: str):
    name = (name or "").strip()
    email = (email or "").strip()
    subject = (subject or "").strip()
    body = (body or "").strip()
    if not name or not email or not subject or not body:
        raise HTTPException(status_code=400, detail="name, email, subject, and body are required")
    client = _match_client(db, company_id, email)
    return create_case(
        db, company_id,
        subject=subject, body=body,
        client_id=client.id if client else None,
        requester_name=name, requester_email=email, source="web",
    )


def _status_value(company: Company) -> str:
    raw = company.status
    return str(getattr(raw, "value", raw) or "").lower()


def company_accepts_public(company: Company) -> bool:
    value = _status_value(company)
    if value not in (CompanyStatus.ACTIVE.value, CompanyStatus.TRIAL.value):
        return False
    if value == CompanyStatus.TRIAL.value and company.trial_ends_at is not None:
        end = company.trial_ends_at
        if end.tzinfo is None:
            end = end.replace(tzinfo=timezone.utc)
        if end < datetime.now(timezone.utc):
            return False
    return True


def public_form(db: Session, slug: str) -> WebToCaseForm:
    form = db.query(WebToCaseForm).filter(WebToCaseForm.slug == slug).first()
    if form is None or not form.is_active:
        raise HTTPException(status_code=404, detail="Form not found")
    company = db.query(Company).filter(Company.id == form.company_id).first()
    if company is None or not company_accepts_public(company):
        raise HTTPException(status_code=404, detail="Form not found")
    return form
