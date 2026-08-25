from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.database import get_db
from app.models.core.user import User
from app.models.core.company import Company
from app.models.core.mfa_recovery_code import MfaRecoveryCode
from app.utils.dependencies import get_current_user
from app.utils.security import verify_password
from app.utils import totp
from app.utils.totp_crypto import (
    encrypt_secret, decrypt_secret, generate_recovery_codes, hash_recovery_code,
)
from app.utils.audit import log_activity

router = APIRouter(prefix="/2fa", tags=["2fa"])


class CodeBody(BaseModel):
    code: str


class PasswordBody(BaseModel):
    password: str


def _company_requires_2fa(db: Session, user: User) -> bool:
    if user.company_id is None:
        return False
    company = db.query(Company).filter(Company.id == user.company_id).first()
    return bool(company and company.require_2fa)


def _issue_recovery_codes(db: Session, user: User) -> list[str]:
    db.query(MfaRecoveryCode).filter(MfaRecoveryCode.user_id == user.id).delete()
    codes = generate_recovery_codes()
    for c in codes:
        db.add(MfaRecoveryCode(user_id=user.id, code_hash=hash_recovery_code(c)))
    return codes


@router.post("/setup")
def setup(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.totp_enabled:
        raise HTTPException(status_code=400, detail="2FA is already enabled")
    secret = totp.generate_secret()
    user.totp_secret = encrypt_secret(secret)
    db.commit()
    return {
        "secret": secret,
        "otpauth_uri": totp.provisioning_uri(secret, user.email),
    }


@router.post("/confirm")
def confirm(body: CodeBody, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.totp_enabled:
        raise HTTPException(status_code=400, detail="2FA is already enabled")
    if not user.totp_secret:
        raise HTTPException(status_code=400, detail="Start setup first")
    secret = decrypt_secret(user.totp_secret)
    if not totp.verify_totp(secret, body.code):
        raise HTTPException(status_code=400, detail="Invalid code")
    user.totp_enabled = True
    user.totp_confirmed_at = datetime.now(timezone.utc)
    codes = _issue_recovery_codes(db, user)
    log_activity(db, user=user, action="2fa:enabled", entity_type="user", entity_id=user.id)
    db.commit()
    return {"recovery_codes": codes}


@router.get("/status")
def status(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    remaining = db.query(MfaRecoveryCode).filter(
        MfaRecoveryCode.user_id == user.id, MfaRecoveryCode.used_at.is_(None)
    ).count()
    return {
        "enabled": bool(user.totp_enabled),
        "confirmed_at": user.totp_confirmed_at.isoformat() if user.totp_confirmed_at else None,
        "recovery_codes_remaining": remaining,
    }


@router.post("/disable")
def disable(body: PasswordBody, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Password is incorrect")
    if _company_requires_2fa(db, user):
        raise HTTPException(status_code=403, detail="Your company requires 2FA; it cannot be disabled")
    user.totp_enabled = False
    user.totp_secret = None
    user.totp_confirmed_at = None
    db.query(MfaRecoveryCode).filter(MfaRecoveryCode.user_id == user.id).delete()
    log_activity(db, user=user, action="2fa:disabled", entity_type="user", entity_id=user.id)
    db.commit()
    return {"message": "2FA disabled"}


@router.post("/recovery-codes/regenerate")
def regenerate(body: PasswordBody, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Password is incorrect")
    if not user.totp_enabled:
        raise HTTPException(status_code=400, detail="2FA is not enabled")
    codes = _issue_recovery_codes(db, user)
    db.commit()
    return {"recovery_codes": codes}
