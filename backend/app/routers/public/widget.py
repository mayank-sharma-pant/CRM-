from typing import Optional

from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.core.company import Company
from app.routers.public.lead_forms import _public_form, ingest_public_lead
from app.utils.rate_limit import public_form_limiter

WIDGET_SOURCE = "Website widget"

router = APIRouter()


class WidgetSubmit(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    message: Optional[str] = None
    website: Optional[str] = None


@router.get("/{slug}/embed.js")
def widget_embed_js(slug: str, db: Session = Depends(get_db)):
    _public_form(db, slug)
    path = f"/w/{slug}"
    js = (
        "(function(){"
        "var script=document.currentScript;"
        "var origin=(script&&script.src)?script.src.split('/api/public/widget/')[0]:'';"
        "var iframe=document.createElement('iframe');"
        f"iframe.src=origin+{path!r};"
        "iframe.title='Contact';"
        "iframe.setAttribute('aria-label','Contact widget');"
        "iframe.style.cssText='position:fixed;right:16px;bottom:16px;width:360px;height:480px;border:0;z-index:2147483647;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.18);background:#fff;';"
        "document.body.appendChild(iframe);"
        "})();"
    )
    return Response(content=js, media_type="application/javascript")


@router.get("/{slug}")
def get_widget(slug: str, db: Session = Depends(get_db)):
    form = _public_form(db, slug)
    company = db.query(Company).filter(Company.id == form.company_id).first()
    return {
        "headline": form.headline,
        "company_name": company.name if company else None,
        "name": form.name,
    }


@router.post("/{slug}", status_code=status.HTTP_201_CREATED)
def submit_widget(slug: str, payload: WidgetSubmit, request: Request, db: Session = Depends(get_db)):
    form = _public_form(db, slug)
    public_form_limiter.check(request, f"widget:{slug}", max_attempts=10, window_seconds=600)
    return ingest_public_lead(
        db,
        form,
        name=payload.name,
        phone=payload.phone,
        email=payload.email,
        notes=payload.message,
        source=WIDGET_SOURCE,
        website=payload.website,
    )
