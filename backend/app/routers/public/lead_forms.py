from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.core.company import Company
from app.models.core.enums import CompanyStatus, LeadStatus
from app.models.sales.lead import Lead
from app.models.sales.lead_form import LeadForm
from app.services.sales.cadence import enroll_lead_in_default_cadence
from app.services.sales.territory import assign_lead_by_territory
from app.services.sales.workflow import run_workflows
from app.utils.rate_limit import public_form_limiter

router = APIRouter()


class PublicSubmit(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    company: Optional[str] = None
    service_type: Optional[str] = None
    notes: Optional[str] = None
    website: Optional[str] = None


def _status_value(company: Company) -> str:
    raw = company.status
    return str(getattr(raw, "value", raw) or "").lower()


def _company_accepts_public_leads(company: Company) -> bool:
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


def _public_form(db: Session, slug: str) -> LeadForm:
    form = db.query(LeadForm).filter(LeadForm.slug == slug).first()
    if form is None or not form.is_active:
        raise HTTPException(status_code=404, detail="Form not found")
    company = db.query(Company).filter(Company.id == form.company_id).first()
    if company is None or not _company_accepts_public_leads(company):
        raise HTTPException(status_code=404, detail="Form not found")
    return form


@router.get("/{slug}")
def get_public_form(slug: str, db: Session = Depends(get_db)):
    form = _public_form(db, slug)
    company = db.query(Company).filter(Company.id == form.company_id).first()
    return {
        "headline": form.headline,
        "company_name": company.name if company else None,
        "name": form.name,
    }


@router.post("/{slug}/submit", status_code=status.HTTP_201_CREATED)
def submit_public_form(slug: str, payload: PublicSubmit, request: Request, db: Session = Depends(get_db)):
    form = _public_form(db, slug)
    public_form_limiter.check(request, f"lead-form:{slug}", max_attempts=10, window_seconds=600)

    if (payload.website or "").strip():
        return {"ok": True}

    name = (payload.name or "").strip()
    phone = (payload.phone or "").strip() or None
    email = (payload.email or "").strip() or None
    if not name or not (phone or email):
        raise HTTPException(status_code=400, detail="name and phone or email are required")
    if len(name) > 255:
        raise HTTPException(status_code=400, detail="name must be at most 255 characters")

    lead = Lead(
        company_id=form.company_id,
        name=name,
        email=email,
        phone=phone,
        company=(payload.company or "").strip() or None,
        source=form.default_source or "Website",
        service_type=(payload.service_type or "").strip() or None,
        notes=(payload.notes or "").strip() or None,
        status=LeadStatus.ACTIVE,
        assigned_to_id=None,
        created_by_id=None,
        team_id=form.default_team_id,
    )
    db.add(lead)
    db.flush()
    assign_lead_by_territory(db, lead)
    db.flush()
    enroll_lead_in_default_cadence(db, lead)
    run_workflows(db, "lead_created", lead=lead)
    db.commit()
    return {"ok": True}
