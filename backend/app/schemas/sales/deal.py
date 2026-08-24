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
