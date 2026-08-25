"""Company SAML IdP settings (admin/MD)."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.core.company import Company
from app.models.core.saml_config import SamlConfig
from app.models.core.user import User
from app.services.auth.saml import acs_url, sp_entity_id
from app.utils.dependencies import apply_company_scope, require_admin_or_md

router = APIRouter()


class SamlConfigWrite(BaseModel):
    idp_entity_id: Optional[str] = None
    idp_sso_url: Optional[str] = None
    idp_certificate_pem: Optional[str] = None
    enabled: Optional[bool] = None


def _serialize(company: Company, row: SamlConfig | None) -> dict:
    code = company.company_code or ""
    return {
        "company_code": code,
        "idp_entity_id": row.idp_entity_id if row else None,
        "idp_sso_url": row.idp_sso_url if row else None,
        "certificate_set": bool(row and row.idp_certificate_pem),
        "enabled": bool(row.enabled) if row else False,
        "acs_url": acs_url(code) if code else None,
        "sp_entity_id": sp_entity_id(code) if code else None,
        "login_path": f"/api/auth/saml/{code}/start" if code else None,
    }


@router.get("/config")
def get_saml_config(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    if current_user.company_id is None:
        raise HTTPException(status_code=403, detail="User must be assigned to a company")
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found")
    row = apply_company_scope(db.query(SamlConfig), SamlConfig, current_user).first()
    return _serialize(company, row)


@router.put("/config")
def put_saml_config(
    payload: SamlConfigWrite,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    if current_user.company_id is None:
        raise HTTPException(status_code=403, detail="User must be assigned to a company")
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found")
    row = apply_company_scope(db.query(SamlConfig), SamlConfig, current_user).first()
    entity = (payload.idp_entity_id or (row.idp_entity_id if row else "") or "").strip()
    sso = (payload.idp_sso_url or (row.idp_sso_url if row else "") or "").strip()
    pem = (payload.idp_certificate_pem or "").strip() or (row.idp_certificate_pem if row else "")
    enabled = payload.enabled if payload.enabled is not None else (row.enabled if row else False)
    if enabled and (not entity or not sso or not pem):
        raise HTTPException(status_code=400, detail="IdP entity ID, SSO URL, and certificate are required")
    if not sso.startswith("https://") and not sso.startswith("http://"):
        if sso:
            raise HTTPException(status_code=400, detail="IdP SSO URL must be http(s)")
    if row is None:
        if not entity or not sso or not pem:
            raise HTTPException(status_code=400, detail="IdP entity ID, SSO URL, and certificate are required")
        row = SamlConfig(
            company_id=current_user.company_id,
            idp_entity_id=entity,
            idp_sso_url=sso,
            idp_certificate_pem=pem,
            enabled=bool(enabled),
        )
        db.add(row)
    else:
        row.idp_entity_id = entity
        row.idp_sso_url = sso
        row.idp_certificate_pem = pem
        row.enabled = bool(enabled)
    db.commit()
    db.refresh(row)
    return _serialize(company, row)
