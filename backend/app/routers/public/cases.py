from typing import Optional

from fastapi import APIRouter, Depends, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.core.company import Company
from app.services.sales.cases import ingest_web_case, public_form
from app.utils.rate_limit import public_form_limiter

router = APIRouter()


class PublicCaseIn(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    subject: Optional[str] = None
    body: Optional[str] = None
    website: Optional[str] = None


@router.get("/{slug}")
def get_public_case_form(slug: str, db: Session = Depends(get_db)):
    form = public_form(db, slug)
    company = db.query(Company).filter(Company.id == form.company_id).first()
    return {
        "company_name": company.name if company else None,
        "headline": "Request support",
    }


@router.post("/{slug}/submit", status_code=status.HTTP_201_CREATED)
def submit_public_case(slug: str, payload: PublicCaseIn, request: Request, db: Session = Depends(get_db)):
    form = public_form(db, slug)
    public_form_limiter.check(request, f"web-to-case:{slug}", max_attempts=10, window_seconds=600)
    if (payload.website or "").strip():
        return {"ok": True}
    ingest_web_case(
        db, form.company_id,
        name=payload.name or "",
        email=payload.email or "",
        subject=payload.subject or "",
        body=payload.body or "",
    )
    return {"ok": True}
