"""E-invoice (NIC/IRP) connection settings."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.core.company_settings import CompanySettings
from app.models.core.user import User
from app.services.finance.einvoice_settings import apply_connection_update, serialize_connection
from app.utils.dependencies import get_current_user, require_admin_or_md

router = APIRouter()


class ConnectionWrite(BaseModel):
    base_url: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    client_id: Optional[str] = None
    client_secret: Optional[str] = None


def _company_id(user: User) -> int:
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


@router.get("/connection")
def get_connection(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    company_id = _company_id(current_user)
    row = db.query(CompanySettings).filter(CompanySettings.company_id == company_id).first()
    return serialize_connection(row)


@router.put("/connection")
def put_connection(
    payload: ConnectionWrite,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    company_id = _company_id(current_user)
    row = _settings(db, company_id)
    try:
        apply_connection_update(
            row,
            base_url=payload.base_url,
            username=payload.username,
            password=payload.password,
            client_id=payload.client_id,
            client_secret=payload.client_secret,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    db.commit()
    db.refresh(row)
    return serialize_connection(row)
