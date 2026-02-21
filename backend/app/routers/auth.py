from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from sqlalchemy.orm import Session
from datetime import datetime

from app.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse, Token
from app.utils.security import verify_password, get_password_hash, create_access_token, decode_access_token

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    """Get current user from JWT token"""
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    email = payload.get("sub")
    if email is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )
    
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    return user


@router.post("/signup", status_code=status.HTTP_201_CREATED)
def signup(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user"""
    # Check if user exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user (assign default company for non-admin; admin may have company_id=NULL)
    hashed_password = get_password_hash(user_data.password)
    role = user_data.role or "sales"
    company_id = None if role == "admin" else 1  # Default company for company users
    db_user = User(
        email=user_data.email,
        full_name=user_data.full_name,
        hashed_password=hashed_password,
        role=role,
        company_id=company_id,
        phone=user_data.phone,
        status="pending"
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return {
        "id": db_user.id,
        "email": db_user.email,
        "full_name": db_user.full_name,
        "role": db_user.role,
        "message": "User registered successfully"
    }


@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Login and get access token"""
    # Find user by email
    user = db.query(User).filter(User.email == form_data.username).first()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if user.status == "disabled":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled"
        )
    
    # Update last active timestamp
    user.last_active_at = datetime.now()
    db.commit()
    
    # Create access token
    access_token = create_access_token(data={"sub": user.email, "role": user.role})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role
        }
    }


@router.get("/me")
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


@router.post("/logout")
def logout():
    """Logout endpoint (client should clear token)"""
    return {"message": "Logged out successfully"}


# ===============================
# Invite Acceptance
# ===============================

from app.models.invite import Invite, InviteStatus
from app.models.team import Team


@router.post("/accept-invite/{token}")
def accept_invite(
    token: str,
    password: str,
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
    
    # Check if expired
    if invite.expires_at and datetime.now() > invite.expires_at:
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
    
    # Validate password strength
    if len(password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters"
        )
    
    # Create user from invite (use invite's company_id)
    hashed_password = get_password_hash(password)
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

