from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from app.models.core.enums import UserRole, UserStatus


class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: UserRole = UserRole.SALES
    team: Optional[str] = None
    phone: Optional[str] = None


from pydantic import Field

class UserCreate(UserBase):
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters long")
    company_name: Optional[str] = None


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    team: Optional[str] = None


class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    email: Optional[str] = None


class LoginUserInfo(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    company_id: Optional[int] = None


class LoginResponse(BaseModel):
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    user: Optional[LoginUserInfo] = None
    mfa_required: Optional[bool] = None
    mfa_token: Optional[str] = None
    mfa_setup_required: Optional[bool] = None
    setup_token: Optional[str] = None


class MeResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: UserRole
    status: UserStatus
    phone: Optional[str] = None
    team_id: Optional[int] = None
    company_id: Optional[int] = None
    created_at: Optional[str] = None


class MessageResponse(BaseModel):
    message: str
