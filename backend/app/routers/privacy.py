from pydantic import BaseModel, Field
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.core.user import User
from app.services.privacy.dsr import (
    apply_retention,
    erase_client,
    erase_lead,
    export_client,
    export_lead,
    export_me,
    get_or_create_settings,
)
from app.utils.dependencies import get_current_user, require_admin_or_md

router = APIRouter()


class RetentionWrite(BaseModel):
    retention_days: Optional[int] = Field(None, ge=0, le=3650)


@router.get("/me")
def privacy_me(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return export_me(db, current_user)


@router.get("/export/leads/{lead_id}")
def privacy_export_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    return export_lead(db, current_user, lead_id)


@router.get("/export/clients/{client_id}")
def privacy_export_client(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    return export_client(db, current_user, client_id)


@router.post("/erase/leads/{lead_id}")
def privacy_erase_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    return erase_lead(db, current_user, lead_id)


@router.post("/erase/clients/{client_id}")
def privacy_erase_client(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    return erase_client(db, current_user, client_id)


@router.get("/retention")
def get_retention(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    row = get_or_create_settings(db, current_user)
    return {"retention_days": row.retention_days or 0}


@router.put("/retention")
def put_retention(
    payload: RetentionWrite,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    row = get_or_create_settings(db, current_user)
    row.retention_days = payload.retention_days if payload.retention_days is not None else 0
    db.commit()
    db.refresh(row)
    return {"retention_days": row.retention_days or 0}


@router.post("/retention/apply")
def run_retention(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    return apply_retention(db, current_user)
