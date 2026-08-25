from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func as sa_func
from typing import Optional
from datetime import datetime, timezone

from app.database import get_db
from app.models.core.user import User
from app.models.core.company import Company
from app.models.core.mfa_recovery_code import MfaRecoveryCode
from app.utils.dependencies import get_current_user, oauth2_scheme
from app.utils.security import verify_password, decode_access_token
from app.utils import totp
from app.utils.totp_crypto import (
    encrypt_secret, decrypt_secret, generate_recovery_codes, hash_recovery_code,
)
from app.utils.audit import log_activity
from app.utils.rate_limit import auth_limiter

router = APIRouter(prefix="/2fa", tags=["2fa"])


async def get_enrolling_user(
    x_setup_token: Optional[str] = Header(default=None),
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Accepts either a real session (aud="crm") or a forced-enrollment
    challenge token (aud="mfa_setup") for the 2FA setup/confirm endpoints."""
    if token:
        payload = decode_access_token(token, audience="crm")
        if payload and payload.get("sub"):
            user = db.query(User).filter(sa_func.lower(User.email) == payload["sub"].lower()).first()
            if user and user.is_active and user.status.value != "disabled":
                return user
    if x_setup_token:
        payload = decode_access_token(x_setup_token, audience="mfa_setup")
        if payload and payload.get("sub"):
            user = db.query(User).filter(sa_func.lower(User.email) == payload["sub"].lower()).first()
            if user and user.is_active and user.status.value != "disabled":
                return user
    raise HTTPException(status_code=401, detail="Not authenticated")


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
def setup(db: Session = Depends(get_db), user: User = Depends(get_enrolling_user)):
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
def confirm(request: Request, body: CodeBody, db: Session = Depends(get_db), user: User = Depends(get_enrolling_user)):
    auth_limiter.check(request, f"2fa_confirm:{user.id}", max_attempts=10, window_seconds=600)
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
def disable(request: Request, body: PasswordBody, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    auth_limiter.check(request, f"2fa_disable:{user.id}", max_attempts=10, window_seconds=600)
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
def regenerate(request: Request, body: PasswordBody, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    auth_limiter.check(request, f"2fa_regenerate:{user.id}", max_attempts=10, window_seconds=600)
    if not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Password is incorrect")
    if not user.totp_enabled:
        raise HTTPException(status_code=400, detail="2FA is not enabled")
    codes = _issue_recovery_codes(db, user)
    db.commit()
    return {"recovery_codes": codes}


class VerifyBody(BaseModel):
    mfa_token: str
    code: str


@router.post("/verify")
def verify(body: VerifyBody, request: Request, response: Response, db: Session = Depends(get_db)):
    from app.routers.auth.auth import _issue_refresh_token, _set_auth_cookie, _set_refresh_cookie
    from app.utils.security import decode_access_token, create_access_token
    from app.utils.rate_limit import auth_limiter

    payload = decode_access_token(body.mfa_token, audience="mfa")
    if not payload or not payload.get("sub"):
        raise HTTPException(status_code=401, detail="Invalid or expired challenge")
    email = payload["sub"].lower()
    auth_limiter.check(request, f"verify_2fa:{email}", max_attempts=10, window_seconds=600)

    user = db.query(User).filter(sa_func.lower(User.email) == email).first()
    if not user or not user.totp_enabled or not user.totp_secret:
        raise HTTPException(status_code=401, detail="Invalid or expired challenge")

    ok = totp.verify_totp(decrypt_secret(user.totp_secret), body.code)
    if not ok:
        row = db.query(MfaRecoveryCode).filter(
            MfaRecoveryCode.user_id == user.id,
            MfaRecoveryCode.code_hash == hash_recovery_code(body.code),
            MfaRecoveryCode.used_at.is_(None),
        ).first()
        if row:
            row.used_at = datetime.now(timezone.utc)
            ok = True
    if not ok:
        db.commit()
        raise HTTPException(status_code=401, detail="Invalid code")

    user.last_active_at = datetime.now(timezone.utc)
    access_token = create_access_token(data={"sub": user.email, "role": user.role})
    _set_auth_cookie(response, access_token)
    refresh_token = _issue_refresh_token(db, user)
    db.commit()
    _set_refresh_cookie(response, refresh_token)
    return {
        "access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer",
        "user": {"id": user.id, "email": user.email, "full_name": user.full_name,
                 "role": user.role, "company_id": user.company_id},
    }
