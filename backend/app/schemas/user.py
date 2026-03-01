from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: str = "sales"
    team: Optional[str] = None
    phone: Optional[str] = None


class UserCreate(UserBase):
    password: str
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


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: LoginUserInfo


class MeResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    status: str
    phone: Optional[str] = None
    team_id: Optional[int] = None
    company_id: Optional[int] = None
    created_at: Optional[str] = None


class MessageResponse(BaseModel):
    message: str
