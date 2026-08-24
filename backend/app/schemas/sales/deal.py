from datetime import date
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel


class DealCreate(BaseModel):
    title: str
    amount: Decimal = Decimal("0")
    currency: str = "INR"
    pipeline_id: Optional[int] = None
    stage_id: Optional[int] = None
    probability: Optional[int] = None
    expected_close: Optional[date] = None
    lead_id: Optional[int] = None
    client_id: Optional[int] = None
    assigned_to_id: Optional[int] = None
    team_id: Optional[int] = None
    source: Optional[str] = None


class DealUpdate(BaseModel):
    title: Optional[str] = None
    amount: Optional[Decimal] = None
    currency: Optional[str] = None
    probability: Optional[int] = None
    expected_close: Optional[date] = None
    lead_id: Optional[int] = None
    client_id: Optional[int] = None
    assigned_to_id: Optional[int] = None
    team_id: Optional[int] = None
    source: Optional[str] = None


class DealStageUpdate(BaseModel):
    stage_id: int


class StageCreate(BaseModel):
    pipeline_id: int
    name: str
    position: int
    stage_type: str = "open"
    default_probability: int = 0


class StageUpdate(BaseModel):
    name: Optional[str] = None
    position: Optional[int] = None
    stage_type: Optional[str] = None
    default_probability: Optional[int] = None
