from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.models.enums import TransferRequestStatus

class TransferRequestBase(BaseModel):
    user_id: int
    target_team_id: int
    reason: Optional[str] = None

class TransferRequestCreate(TransferRequestBase):
    pass

class TransferRequestUpdate(BaseModel):
    status: TransferRequestStatus
    admin_comment: Optional[str] = None

class UserMin(BaseModel):
    id: int
    full_name: str
    email: str

    class Config:
        from_attributes = True

class TeamMin(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True

class TransferRequestResponse(BaseModel):
    id: int
    company_id: int
    user_id: int
    requested_by_id: int
    current_team_id: Optional[int]
    target_team_id: int
    reason: Optional[str]
    status: TransferRequestStatus
    admin_comment: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    
    # Nested info for display
    target_user: Optional[UserMin] = None
    requested_by: Optional[UserMin] = None
    current_team: Optional[TeamMin] = None
    target_team: Optional[TeamMin] = None

    class Config:
        from_attributes = True

class TransferRequestList(BaseModel):
    requests: List[TransferRequestResponse]
    total: int
