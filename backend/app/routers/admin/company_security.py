from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.core.user import User
from app.models.core.company import Company
from app.utils.dependencies import get_current_user
from app.utils.audit import log_activity

router = APIRouter(prefix="/company", tags=["company-security"])


class SecurityBody(BaseModel):
    require_2fa: bool


@router.get("/security")
def get_security(db: Session = Depends(get_db),
                  user: User = Depends(get_current_user)):
    if user.role.value != "admin" or user.company_id is None:
        raise HTTPException(status_code=403, detail="Only company admins can view this")
    company = db.query(Company).filter(Company.id == user.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return {"require_2fa": company.require_2fa}


@router.patch("/security")
def set_security(body: SecurityBody, db: Session = Depends(get_db),
                  user: User = Depends(get_current_user)):
    if user.role.value != "admin" or user.company_id is None:
        raise HTTPException(status_code=403, detail="Only company admins can change this")
    company = db.query(Company).filter(Company.id == user.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    company.require_2fa = body.require_2fa
    log_activity(db, user=user, action="company:require_2fa_changed",
                 entity_type="company", entity_id=company.id)
    db.commit()
    return {"require_2fa": company.require_2fa}
