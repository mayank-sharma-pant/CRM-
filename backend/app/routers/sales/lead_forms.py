from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.core.team import Team
from app.models.core.user import User
from app.models.sales.lead_form import LeadForm
from app.services.sales.lead_form_seed import ensure_default_lead_form
from app.utils.dependencies import get_current_user, apply_company_scope

router = APIRouter()


class LeadFormPatch(BaseModel):
    headline: Optional[str] = None
    is_active: Optional[bool] = None
    default_team_id: Optional[int] = None


def _role(user: User) -> str:
    r = getattr(user, "role", None)
    return str(getattr(r, "value", r) or "")


def _serialize(form: LeadForm, teams: list) -> dict:
    return {
        "slug": form.slug,
        "name": form.name,
        "headline": form.headline,
        "is_active": form.is_active,
        "default_team_id": form.default_team_id,
        "default_source": form.default_source,
        "public_path": f"/f/{form.slug}",
        "widget_path": f"/w/{form.slug}",
        "embed_script_path": f"/api/public/widget/{form.slug}/embed.js",
        "teams": teams,
    }


@router.get("")
def get_lead_form(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.company_id is None:
        raise HTTPException(status_code=403, detail="User must be assigned to a company")
    form = ensure_default_lead_form(db, current_user.company_id)
    teams = []
    if _role(current_user) in ("admin", "md"):
        teams = [
            {"id": t.id, "name": t.name}
            for t in apply_company_scope(db.query(Team), Team, current_user).order_by(Team.name).all()
        ]
    return _serialize(form, teams)


@router.patch("")
def patch_lead_form(
    payload: LeadFormPatch,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if _role(current_user) not in ("admin", "md"):
        raise HTTPException(status_code=403, detail="Only admin or MD can update the website form")
    if current_user.company_id is None:
        raise HTTPException(status_code=403, detail="User must be assigned to a company")
    form = db.query(LeadForm).filter(LeadForm.company_id == current_user.company_id).first()
    if form is None:
        form = ensure_default_lead_form(db, current_user.company_id)
    data = payload.model_dump(exclude_unset=True)
    if "default_team_id" in data and data["default_team_id"] is not None:
        team = apply_company_scope(db.query(Team), Team, current_user).filter(
            Team.id == data["default_team_id"]
        ).first()
        if team is None:
            raise HTTPException(status_code=400, detail="default_team_id not found in your company")
    for field, value in data.items():
        setattr(form, field, value)
    db.commit()
    db.refresh(form)
    teams = [
        {"id": t.id, "name": t.name}
        for t in apply_company_scope(db.query(Team), Team, current_user).order_by(Team.name).all()
    ]
    return _serialize(form, teams)
