from pydantic import BaseModel, Field
from typing import Any, Optional, List, Dict


class AIChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=8000)
    # Optional UI context (selected team, month, etc.)
    context: Optional[Dict[str, Any]] = None


class AIExecutedAction(BaseModel):
    action: str
    params: Dict[str, Any] = {}
    result: Dict[str, Any] = {}


class AIChatResponse(BaseModel):
    message: str
    executed_actions: List[AIExecutedAction] = []

