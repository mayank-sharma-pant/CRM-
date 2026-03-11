from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from collections import defaultdict, deque
from time import time
import secrets
import logging

logger = logging.getLogger("uvicorn.error")

from app.database import get_db
from app.models.user import User
from app.models.company import Company
from app.models.otp import OTPCode
from app.schemas.user import UserCreate, UserResponse, Token, LoginResponse, MeResponse, MessageResponse
from app.utils.security import verify_password, get_password_hash, create_access_token, decode_access_token
from app.utils.dependencies import get_current_user
from app.utils.email_service import send_otp_email
from sqlalchemy import func as sa_func

router = APIRouter()

OTP_EXPIRY_MINUTES = 10


class _RateLimitConfig(BaseModel):
    max_attempts: int
    window_seconds: int


_rate_limit_buckets: dict[str, deque] = defaultdict(deque)

_RATE_LIMITS = {
    "login_email": _RateLimitConfig(max_attempts=10, window_seconds=300),       # 10 attempts / 5 minutes
    "signup_email": _RateLimitConfig(max_attempts=5, window_seconds=3600),     # 5 attempts / hour
    "request_otp_email": _RateLimitConfig(max_attempts=5, window_seconds=600), # 5 OTPs / 10 minutes
    "login_otp_email": _RateLimitConfig(max_attempts=10, window_seconds=600),  # 10 OTP verifications / 10 minutes
}


def _check_rate_limit(bucket_key: str, cfg: _RateLimitConfig) -> None:
    """Simple in-memory sliding-window rate limiter by bucket key."""
    now = time()
    bucket = _rate_limit_buckets[bucket_key]
    cutoff = now - cfg.window_seconds
    while bucket and bucket[0] < cutoff:
        bucket.popleft()
    if len(bucket) >= cfg.max_attempts:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many attempts. Please try again later.",
        )
    bucket.append(now)


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


@router.post("/signup", status_code=status.HTTP_201_CREATED)
def signup(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user and create a company (pending approval)."""
    # Rate limit by email to prevent abuse
    key = f"signup_email:{user_data.email.lower()}"
    _check_rate_limit(key, _RATE_LIMITS["signup_email"])
    existing_user = db.query(User).filter(sa_func.lower(User.email) == user_data.email.lower()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    hashed_password = get_password_hash(user_data.password)

    # Company creator is always the company admin
    role = "admin"

    company_name = (user_data.company_name or "").strip() or f"{user_data.full_name}'s Company"
    new_company = Company(
        name=company_name,
        status="pending",
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
        status="pending",
    )

    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    return {
        "id": db_user.id,
        "email": db_user.email,
        "full_name": db_user.full_name,
        "role": db_user.role,
        "company_id": db_user.company_id,
        "message": "User registered successfully. Company is pending approval."
    }


@router.post("/login", response_model=LoginResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Login and get access token"""
    # Rate limit by email/username
    email = form_data.username.lower()
    key = f"login_email:{email}"
    _check_rate_limit(key, _RATE_LIMITS["login_email"])
    user = db.query(User).filter(sa_func.lower(User.email) == form_data.username.lower()).first()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if user.status == "disabled":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is disabled")

    _check_company_status(user, db)

    user.last_active_at = datetime.now(timezone.utc)
    db.commit()

    access_token = create_access_token(data={"sub": user.email, "role": user.role})

    return {
        "access_token": access_token,
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
def request_otp(payload: OTPRequest, db: Session = Depends(get_db)):
    """Generate OTP and store in DB (multi-worker safe). Logged in dev."""
    # Rate limit OTP requests per email
    key = f"request_otp_email:{payload.email.lower()}"
    _check_rate_limit(key, _RATE_LIMITS["request_otp_email"])
    user = db.query(User).filter(sa_func.lower(User.email) == payload.email.lower()).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.status == "disabled":
        raise HTTPException(status_code=403, detail="User account is disabled")
    _check_company_status(user, db)

    otp_code = f"{secrets.randbelow(1000000):06d}"
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRY_MINUTES)

    db.query(OTPCode).filter(OTPCode.email == payload.email).delete()
    db.add(OTPCode(email=payload.email, code=otp_code, expires_at=expires_at))
    db.commit()

    sent = send_otp_email(payload.email, otp_code, OTP_EXPIRY_MINUTES)
    if not sent:
        logger.warning("[OTP] Email not sent for %s — SMTP not configured or failed", payload.email)
    return {"message": "OTP sent successfully"}


@router.post("/login-otp", response_model=LoginResponse)
def login_otp(payload: OTPLoginRequest, db: Session = Depends(get_db)):
    # Rate limit OTP verification attempts per email
    key = f"login_otp_email:{payload.email.lower()}"
    _check_rate_limit(key, _RATE_LIMITS["login_otp_email"])

    record = db.query(OTPCode).filter(OTPCode.email == payload.email).first()
    if not record:
        raise HTTPException(status_code=400, detail="OTP not requested or expired")

    now = datetime.now(timezone.utc)
    if now > record.expires_at:
        db.query(OTPCode).filter(OTPCode.email == payload.email).delete()
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
    db.query(OTPCode).filter(OTPCode.email == payload.email).delete()
    db.commit()

    access_token = create_access_token(data={"sub": user.email, "role": user.role})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "company_id": user.company_id,
        },
    }


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


@router.post("/logout", response_model=MessageResponse)
def logout():
    """Logout endpoint (client should clear token)"""
    return {"message": "Logged out successfully"}


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

from app.models.invite import Invite, InviteStatus
from app.models.team import Team


class AcceptInviteBody(BaseModel):
    password: str = ""


@router.post("/accept-invite/{token}")
def accept_invite(
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
        is_active=True
    )
    
    db.add(new_user)
    
    # Mark invite as accepted
    invite.status = InviteStatus.ACCEPTED
    
    db.commit()
    db.refresh(new_user)
    
    # Create access token for immediate login
    access_token = create_access_token(data={"sub": new_user.email, "role": new_user.role})
    
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
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Send an OTP to the user's email for password reset."""
    key = f"forgot_pw:{payload.email.lower()}"
    _check_rate_limit(key, _RATE_LIMITS["request_otp_email"])

    user = db.query(User).filter(sa_func.lower(User.email) == payload.email.lower()).first()
    if not user:
        # Don't reveal whether the email exists
        return {"message": "If this email is registered, a reset code has been sent."}

    otp_code = f"{secrets.randbelow(1000000):06d}"
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRY_MINUTES)

    db.query(OTPCode).filter(OTPCode.email == user.email).delete()
    db.add(OTPCode(email=user.email, code=otp_code, expires_at=expires_at))
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
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Verify OTP and set a new password."""
    key = f"reset_pw:{payload.email.lower()}"
    _check_rate_limit(key, _RATE_LIMITS["login_otp_email"])

    user = db.query(User).filter(sa_func.lower(User.email) == payload.email.lower()).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid request")

    record = (
        db.query(OTPCode)
        .filter(OTPCode.email == user.email)
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
