from pydantic import BaseModel, Field
from typing import Any, Optional, List, Dict


class AIRequestParams(BaseModel):
    model: Optional[str] = Field(default=None, min_length=1, max_length=80)
    temperature: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    max_output_tokens: Optional[int] = Field(default=None, ge=128, le=4096)
    max_actions: Optional[int] = Field(default=None, ge=1, le=20)


class AIResolvedParams(BaseModel):
    model: str
    temperature: float
    max_output_tokens: int
    max_actions: int


class AIChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=8000)
    # Optional UI context (selected team, month, etc.)
    context: Optional[Dict[str, Any]] = None
    # Optional per-request parameter overrides (validated server-side).
    ai_params: Optional[AIRequestParams] = None
    dry_run: bool = False


class AIExecutedAction(BaseModel):
    action: str
    params: Dict[str, Any] = {}
    result: Dict[str, Any] = {}


class AIChatResponse(BaseModel):
    message: str
    executed_actions: List[AIExecutedAction] = []
    used_params: Optional[AIResolvedParams] = None
    # Optional model chain-of-thought (also persisted for idempotent replays).
    reasoning: Optional[str] = None
    dry_run: bool = False


class AIParamsResponse(BaseModel):
    can_override: bool
    allowed_models: List[str] = []
    params: AIResolvedParams

