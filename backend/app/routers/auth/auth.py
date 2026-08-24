from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from typing import Optional
from collections import defaultdict, deque
from time import time
import secrets
import logging

logger = logging.getLogger("uvicorn.error")

from app.database import get_db
from app.config import settings
from app.models.core.user import User
from app.models.core.company import Company
from app.models.core.otp import OTPCode
from app.schemas.admin import UserCreate, UserResponse, Token, LoginResponse, MeResponse, MessageResponse
from app.utils.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    decode_access_token,
    generate_refresh_token,
    hash_refresh_token,
)
from app.models.core.refresh_token import RefreshToken
from app.utils.dependencies import get_current_user
from app.utils.email_service import send_otp_email
from sqlalchemy import func as sa_func
from app.models.core.invite import Invite, InviteStatus
from app.models.core.team import Team
from app.models.core.team_membership import TeamMembership
from app.utils.validators import ensure_one_manager_per_team
from app.utils.notify import notify_platform_admins

router = APIRouter()

OTP_EXPIRY_MINUTES = 10


from app.utils.rate_limit import auth_limiter

_RATE_LIMITS = {
    "login": {"max_attempts": 10, "window_seconds": 300},        # 10 attempts / 5 minutes
    "signup": {"max_attempts": 5, "window_seconds": 3600},      # 5 attempts / hour
    "request_otp": {"max_attempts": 5, "window_seconds": 600},  # 5 OTPs / 10 minutes
    "verify_otp": {"max_attempts": 10, "window_seconds": 600},  # 10 OTP verifications / 10 minutes
    "forgot_pw": {"max_attempts": 5, "window_seconds": 600},    # 5 attempts / 10 minutes
}


def _set_auth_cookie(response: Response, token: str):
    """Utility to set the access_token cookie with secure defaults."""
    secure = settings.AUTH_COOKIE_SECURE if settings.AUTH_COOKIE_SECURE is not None else (settings.ENVIRONMENT == "production")
    samesite = (settings.AUTH_COOKIE_SAMESITE or "lax").strip().lower()
    if samesite not in ("lax", "strict", "none"):
        samesite = "lax"
    # If SameSite=None, Secure must be true (browser requirement).
    if samesite == "none":
        secure = True
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        expires=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite=samesite,
        secure=secure,
    )


def _refresh_cookie_kwargs() -> dict:
    secure = settings.AUTH_COOKIE_SECURE if settings.AUTH_COOKIE_SECURE is not None else (settings.ENVIRONMENT == "production")
    samesite = (settings.AUTH_COOKIE_SAMESITE or "lax").strip().lower()
    if samesite not in ("lax", "strict", "none"):
        samesite = "lax"
    if samesite == "none":
        secure = True
    return {"httponly": True, "samesite": samesite, "secure": secure}


def _set_refresh_cookie(response: Response, token: str):
    max_age = settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600
    response.set_cookie(
        key="refresh_token",
        value=token,
        max_age=max_age,
        expires=max_age,
        **_refresh_cookie_kwargs(),
    )


def _clear_refresh_cookie(response: Response):
    response.delete_cookie(key="refresh_token", **_refresh_cookie_kwargs())


def _issue_refresh_token(db: Session, user: User) -> str:
    """Create a new refresh-token row and return the raw token (shown once)."""
    raw, token_hash = generate_refresh_token()
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    db.add(RefreshToken(user_id=user.id, token_hash=token_hash, expires_at=expires_at))
    return raw


def _extract_refresh_token(request: Request, body_token: Optional[str]) -> Optional[str]:
    return (body_token or "").strip() or request.cookies.get("refresh_token")


class OTPRequest(BaseModel):
    email: EmailStr


class OTPLoginRequest(BaseModel):
    email: EmailStr
    otp_code: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


def _check_company_status(user: User, db: Session) -> None:
    """Block login if the user's company is not active. Platform admins bypass."""
    if user.company_id is None:
        return
    company = db.query(Company).filter(Company.id == user.company_id).first()
    if not company:
        raise HTTPException(status_code=403, detail="Company not found")
    if company.status == "pending":
        raise HTTPException(status_code=403, detail="Company account is pending approval")
    if company.status == "suspended":
        raise HTTPException(status_code=403, detail="Company account is suspended")
    if company.status == "rejected":
        raise HTTPException(status_code=403, detail="Company account has been rejected")
    if company.status == "trial" and company.trial_ends_at is not None:
        trial_ends_at = company.trial_ends_at
        if trial_ends_at.tzinfo is None:
            trial_ends_at = trial_ends_at.replace(tzinfo=timezone.utc)
        if trial_ends_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=403, detail="Trial expired — please upgrade")


@router.post("/signup", status_code=status.HTTP_201_CREATED)
def signup(request: Request, response: Response, user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user and create a company on an active trial."""
    # Rate limit by email to prevent abuse
    auth_limiter.check(request, f"signup:{user_data.email.lower()}", **_RATE_LIMITS["signup"])
    existing_user = db.query(User).filter(sa_func.lower(User.email) == user_data.email.lower()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    hashed_password = get_password_hash(user_data.password)

    # Company creator is always the company admin
    role = "admin"

    try:
        company_name = (user_data.company_name or "").strip() or f"{user_data.full_name}'s Company"
        from app.utils.helpers import generate_company_code
        company_code = generate_company_code(db)

        trial_ends_at = datetime.now(timezone.utc) + timedelta(days=settings.TRIAL_DAYS)
        new_company = Company(
            name=company_name,
            company_code=company_code,
            status="trial",
            trial_ends_at=trial_ends_at,
        )
        db.add(new_company)
        db.flush()

        db_user = User(
            email=user_data.email,
            full_name=user_data.full_name,
            hashed_password=hashed_password,
            role=role,
            company_id=new_company.id,
            phone=user_data.phone,
            status="active",
            employee_num=1,  # First user in a new company
        )

        db.add(db_user)

        from app.models.billing import Plan, Subscription
        starter = db.query(Plan).filter(Plan.name == "Starter").first()
        if starter:
            db.add(Subscription(
                company_id=new_company.id, plan_id=starter.id, provider="razorpay",
                status="trialing", trial_ends_at=trial_ends_at,
            ))

        db.commit()
        db_user_id = db_user.id # Store to use after commit
        db.refresh(db_user)
    except Exception:
        db.rollback()
        logger.exception("SIGNUP ERROR for email=%s", user_data.email)
        raise HTTPException(
            status_code=500,
            detail="Registration failed. Please try again."
        )

    try:
        notify_platform_admins(
            db,
            title=f"New Company: {new_company.name}",
            message=f"Signup by {db_user.full_name} ({db_user.email}). Status: Trial.",
            type="info",
            link="/platform/companies",
            category="admin",
        )
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("SIGNUP NOTIFY ERROR for email=%s", user_data.email)
        # The platform notification step is part of the signup workflow; fail with a sanitized error.
        raise HTTPException(status_code=500, detail="Registration failed. Please try again.")

    access_token = create_access_token(data={"sub": db_user.email, "role": db_user.role})
    _set_auth_cookie(response, access_token)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": db_user.id,
            "email": db_user.email,
            "full_name": db_user.full_name,
            "role": db_user.role,
            "company_id": db_user.company_id
        },
        "message": "Trial started."
    }


@router.post("/login", response_model=LoginResponse)
def login(request: Request, response: Response, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Login and get access token"""
    # Rate limit by email/username
    email = form_data.username.lower()
    auth_limiter.check(request, f"login:{email}", **_RATE_LIMITS["login"])
    user = db.query(User).filter(sa_func.lower(User.email) == form_data.username.lower()).first()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if user.status == "disabled":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is disabled")

    try:
        _check_company_status(user, db)
    except HTTPException:
        raise
    except Exception:
        logger.exception("LOGIN ERROR during company check for %s", email)
        raise HTTPException(status_code=500, detail="Login failed. Please try again.")

    user.last_active_at = datetime.now(timezone.utc)
    db.commit()

    access_token = create_access_token(data={"sub": user.email, "role": user.role})
    _set_auth_cookie(response, access_token)
    refresh_token = _issue_refresh_token(db, user)
    db.commit()
    _set_refresh_cookie(response, refresh_token)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "company_id": user.company_id
        }
    }


@router.post("/request-otp")
def request_otp(request: Request, payload: OTPRequest, db: Session = Depends(get_db)):
    """Generate OTP and store in DB (multi-worker safe). Logged in dev."""
    generic_response = {"message": "If this email is registered, an OTP has been sent."}
    # Rate limit OTP requests per email
    auth_limiter.check(request, f"request_otp:{payload.email.lower()}", **_RATE_LIMITS["request_otp"])
    user = db.query(User).filter(sa_func.lower(User.email) == payload.email.lower()).first()
    if not user:
        return generic_response
    if user.status == "disabled":
        return generic_response
    try:
        _check_company_status(user, db)
    except HTTPException:
        return generic_response

    otp_code = f"{secrets.randbelow(1000000):06d}"
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRY_MINUTES)

    normalized_email = payload.email.lower()
    db.query(OTPCode).filter(OTPCode.email == normalized_email).delete()
    db.add(OTPCode(email=normalized_email, code=otp_code, expires_at=expires_at))
    db.commit()

    sent = send_otp_email(payload.email, otp_code, OTP_EXPIRY_MINUTES)
    if not sent:
        logger.warning("[OTP] Email not sent for %s — SMTP not configured or failed", payload.email)
    return generic_response


@router.post("/login-otp", response_model=LoginResponse)
def login_otp(request: Request, response: Response, payload: OTPLoginRequest, db: Session = Depends(get_db)):
    # Rate limit OTP verification attempts per email
    auth_limiter.check(request, f"verify_otp:{payload.email.lower()}", **_RATE_LIMITS["verify_otp"])

    record = db.query(OTPCode).filter(OTPCode.email == payload.email.lower()).first()
    if not record:
        raise HTTPException(status_code=400, detail="OTP not requested or expired")

    now = datetime.now(timezone.utc)
    if now > record.expires_at:
        db.query(OTPCode).filter(OTPCode.email == payload.email.lower()).delete()
        db.commit()
        raise HTTPException(status_code=400, detail="OTP expired")

    if payload.otp_code.strip() != record.code:
        raise HTTPException(status_code=401, detail="Invalid OTP code")

    user = db.query(User).filter(sa_func.lower(User.email) == payload.email.lower()).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.status == "disabled":
        raise HTTPException(status_code=403, detail="User account is disabled")
    _check_company_status(user, db)

    user.last_active_at = datetime.now(timezone.utc)
    db.query(OTPCode).filter(OTPCode.email == payload.email.lower()).delete()
    db.commit()

    access_token = create_access_token(data={"sub": user.email, "role": user.role})
    _set_auth_cookie(response, access_token)
    refresh_token = _issue_refresh_token(db, user)
    db.commit()
    _set_refresh_cookie(response, refresh_token)
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "company_id": user.company_id,
        },
    }


class RefreshRequest(BaseModel):
    refresh_token: Optional[str] = None


@router.post("/refresh", response_model=LoginResponse)
def refresh(request: Request, response: Response, body: RefreshRequest | None = None, db: Session = Depends(get_db)):
    """Exchange a valid refresh token for a new access token, rotating the
    refresh token. Reusing an already-rotated token revokes the whole chain."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token"
    )
    raw = _extract_refresh_token(request, body.refresh_token if body else None)
    if not raw:
        raise credentials_exception

    record = db.query(RefreshToken).filter(RefreshToken.token_hash == hash_refresh_token(raw)).first()
    if record is None:
        raise credentials_exception

    # Reuse of a rotated/revoked token is a theft signal: kill every live token
    # for this user so a stolen token cannot outlive the legitimate session.
    if record.revoked:
        db.query(RefreshToken).filter(
            RefreshToken.user_id == record.user_id, RefreshToken.revoked == False  # noqa: E712
        ).update({"revoked": True})
        db.commit()
        raise credentials_exception

    expires_at = record.expires_at
    if expires_at.tzinfo is None:  # SQLite stores naive datetimes; treat as UTC
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at <= datetime.now(timezone.utc):
        raise credentials_exception

    user = db.query(User).filter(User.id == record.user_id).first()
    if user is None or not user.is_active or user.status == "disabled":
        raise credentials_exception

    record.revoked = True
    access_token = create_access_token(data={"sub": user.email, "role": user.role})
    new_refresh = _issue_refresh_token(db, user)
    db.commit()

    _set_auth_cookie(response, access_token)
    _set_refresh_cookie(response, new_refresh)
    return {
        "access_token": access_token,
        "refresh_token": new_refresh,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "company_id": user.company_id,
        },
    }


@router.post("/logout", response_model=MessageResponse)
def logout(request: Request, response: Response, body: RefreshRequest | None = None, db: Session = Depends(get_db)):
    """Revoke the presented refresh token and clear the auth cookies."""
    raw = _extract_refresh_token(request, body.refresh_token if body else None)
    if raw:
        db.query(RefreshToken).filter(
            RefreshToken.token_hash == hash_refresh_token(raw), RefreshToken.revoked == False  # noqa: E712
        ).update({"revoked": True})
        db.commit()

    secure = settings.AUTH_COOKIE_SECURE if settings.AUTH_COOKIE_SECURE is not None else (settings.ENVIRONMENT == "production")
    samesite = (settings.AUTH_COOKIE_SAMESITE or "lax").strip().lower()
    if samesite not in ("lax", "strict", "none"):
        samesite = "lax"
    if samesite == "none":
        secure = True
    response.delete_cookie(
        key="access_token",
        httponly=True,
        samesite=samesite,
        secure=secure,
    )
    _clear_refresh_cookie(response)
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=MeResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Get current user info"""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "status": current_user.status,
        "phone": current_user.phone,
        "team_id": current_user.team_id,
        "company_id": current_user.company_id,
        "created_at": current_user.created_at.isoformat() if current_user.created_at else None
    }


@router.post("/change-password", response_model=MessageResponse)
def change_password(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Allow the currently authenticated user to change their own password."""
    # Verify current password
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    if len(payload.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 8 characters long",
        )

    current_user.hashed_password = get_password_hash(payload.new_password)
    current_user.last_active_at = datetime.now(timezone.utc)
    db.commit()

    return {"message": "Password updated successfully"}


# ===============================
# Invite Acceptance
# ===============================


class AcceptInviteBody(BaseModel):
    password: str = ""


@router.post("/accept-invite/{token}")
def accept_invite(
    request: Request,
    response: Response,
    token: str,
    body: AcceptInviteBody,
    db: Session = Depends(get_db)
):
    """Accept an invite and create user account"""
    # Find invite by token
    invite = db.query(Invite).filter(Invite.token == token).first()
    if not invite:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid invite token"
        )
    
    # Check if already accepted
    if invite.status == InviteStatus.ACCEPTED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invite has already been accepted"
        )
    
    # Check if cancelled
    if invite.status == InviteStatus.CANCELLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invite has been cancelled"
        )
    
    # Check if expired (handle both tz-aware and naive datetimes for PostgreSQL compat)
    if invite.expires_at:
        now_utc = datetime.now(timezone.utc)
        exp = invite.expires_at if invite.expires_at.tzinfo else invite.expires_at.replace(tzinfo=timezone.utc)
        if now_utc > exp:
            invite.status = InviteStatus.EXPIRED
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invite has expired. Please request a new invite."
            )
    
    # Check if user with this email already exists
    existing_user = db.query(User).filter(User.email == invite.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )
    
    # Determine password: use provided password, or fall back to stored invite hash
    if body.password and len(body.password) >= 8:
        hashed_password = get_password_hash(body.password)
    elif invite.hashed_password:
        # Use the temporary password that was emailed to the user
        hashed_password = invite.hashed_password
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters"
        )
    
    # Ensure one-manager-per-team constraint
    if invite.team_id and invite.role == "manager":
        ensure_one_manager_per_team(db, invite.team_id)
        
    try:
        from app.utils.helpers import next_employee_num
        emp_num = next_employee_num(db, invite.company_id)

        new_user = User(
            email=invite.email,
            full_name=invite.full_name,
            phone=invite.phone,
            hashed_password=hashed_password,
            role=invite.role,
            company_id=invite.company_id,
            team_id=invite.team_id,
            manager_id=invite.manager_id,
            status="active",  # Invited users are auto-activated
            is_active=True,
            employee_num=emp_num,
        )
        
        db.add(new_user)
        db.flush()
        
        # Create TeamMembership for the new user for multi-team readiness
        if new_user.team_id:
            membership = TeamMembership(
                company_id=new_user.company_id,
                team_id=new_user.team_id,
                user_id=new_user.id
            )
            db.add(membership)
        
        # Mark invite as accepted
        invite.status = InviteStatus.ACCEPTED
        
        db.commit()
        db.refresh(new_user)
        
        # Create access token for immediate login
        access_token = create_access_token(data={"sub": new_user.email, "role": new_user.role})
        _set_auth_cookie(response, access_token)
        
        return {
            "message": "Account created successfully",
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": new_user.id,
                "email": new_user.email,
                "full_name": new_user.full_name,
                "role": new_user.role,
                "team_id": new_user.team_id
            }
        }
    except Exception:
        db.rollback()
        logger.exception("ACCEPT INVITE ERROR for token=%s", token)
        raise HTTPException(
            status_code=500,
            detail="Registration failed. Please try again."
        )


# ===============================
# Password Reset
# ===============================

class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp_code: str
    new_password: str


@router.post("/forgot-password")
def forgot_password(request: Request, payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Send an OTP to the user's email for password reset."""
    auth_limiter.check(request, f"forgot_pw:{payload.email.lower()}", **_RATE_LIMITS["forgot_pw"])

    user = db.query(User).filter(sa_func.lower(User.email) == payload.email.lower()).first()
    if not user:
        # Don't reveal whether the email exists
        return {"message": "If this email is registered, a reset code has been sent."}

    otp_code = f"{secrets.randbelow(1000000):06d}"
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRY_MINUTES)

    normalized_email = user.email.lower()
    db.query(OTPCode).filter(OTPCode.email == normalized_email).delete()
    db.add(OTPCode(email=normalized_email, code=otp_code, expires_at=expires_at))
    db.commit()

    from app.utils.email_service import send_email
    send_email(
        to_email=user.email,
        subject="Password Reset Code",
        html_content=f"""\
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
            <div style="background: #f8fafc; border-radius: 12px; padding: 32px; text-align: center; border: 1px solid #e2e8f0;">
                <h2 style="color: #1e293b; margin: 0 0 8px;">Password Reset</h2>
                <p style="color: #64748b; font-size: 14px; margin: 0 0 24px;">Use the code below to reset your password.</p>
                <div style="background: #ffffff; border: 2px dashed #f59e0b; border-radius: 8px; padding: 16px; margin: 0 0 24px;">
                    <span style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #1e293b;">{otp_code}</span>
                </div>
                <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                    This code expires in <strong>{OTP_EXPIRY_MINUTES} minutes</strong>.<br>
                    If you didn't request this, you can safely ignore this email.
                </p>
            </div>
        </div>
        """,
    )

    return {"message": "If this email is registered, a reset code has been sent."}


@router.post("/reset-password")
def reset_password(request: Request, payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Verify OTP and set a new password."""
    auth_limiter.check(request, f"reset_pw:{payload.email.lower()}", **_RATE_LIMITS["verify_otp"])

    user = db.query(User).filter(sa_func.lower(User.email) == payload.email.lower()).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid request")

    record = (
        db.query(OTPCode)
        .filter(OTPCode.email == user.email.lower())
        .order_by(OTPCode.created_at.desc())
        .first()
    )
    if not record:
        raise HTTPException(status_code=400, detail="No reset code found. Please request a new one.")

    now = datetime.now(timezone.utc)
    if record.expires_at and now > record.expires_at:
        db.delete(record)
        db.commit()
        raise HTTPException(status_code=400, detail="Reset code has expired. Please request a new one.")

    if payload.otp_code.strip() != record.code:
        raise HTTPException(status_code=400, detail="Invalid reset code")

    if len(payload.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    user.hashed_password = get_password_hash(payload.new_password)
    db.delete(record)
    db.commit()

    return {"message": "Password reset successfully. You can now log in with your new password."}
