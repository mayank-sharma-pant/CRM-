from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timezone, date, timedelta
from calendar import monthrange
from collections import defaultdict, deque
import time
import json
import re

import httpx

from app.database import get_db
from app.config import settings
from app.utils.dependencies import get_current_user, apply_company_scope, is_platform_admin
from app.models.core.user import User
from app.models.core.team import Team
from app.models.core.team_membership import TeamMembership
from app.models.sales.audit import AuditLog
from app.models.sales.ai_conversation import AIConversation
from app.models.sales.lead import Lead
from app.models.sales.task import Task
from app.models.finance.invoice import Invoice
from app.models.finance.ledger import LedgerEntry
from app.routers.finance.ledgers import ALL_LEDGERS
from app.schemas.ai import AIChatRequest, AIChatResponse, AIExecutedAction, AIParamsResponse, AIRequestParams, AIResolvedParams


router = APIRouter()
_rate_buckets: dict[str, deque[float]] = defaultdict(deque)
COMMAND_ROLES = {"md", "manager"}
AI_PARAM_OVERRIDE_ROLES = {"admin", "md", "manager"}
READ_ONLY_ACTIONS = {"monthly_best_sales_exec", "revenue_summary", "business_snapshot"}
COMMAND_ACTIONS = {
    "create_team",
    "delete_team",
    "add_team_member",
    "remove_team_member",
    "create_ledger_entry",
}
ALLOWED_GEMINI_MODELS = {
    "gemini-2.0-flash",
    "gemini-2.5-flash",
    "gemini-2.5-pro",
}


def _extract_first_json_object(text: str) -> dict:
    """
    Best-effort extraction of a JSON object from model output.
    """
    # Find first {...} block (naive but effective with strict prompting)
    m = re.search(r"\{[\s\S]*\}", text)
    if not m:
        raise ValueError("No JSON object found in model output")
    return json.loads(m.group(0))


def _server_default_ai_params() -> AIResolvedParams:
    model = (settings.GEMINI_MODEL or "gemini-2.5-flash").strip() or "gemini-2.5-flash"
    try:
        max_actions = max(1, int(settings.AI_MAX_ACTIONS_PER_REQUEST))
    except (TypeError, ValueError):
        max_actions = 5
    return AIResolvedParams(
        model=model,
        temperature=0.2,
        max_output_tokens=1024,
        max_actions=max_actions,
    )


def _resolve_ai_params(current_user: User, requested: AIRequestParams | None) -> AIResolvedParams:
    resolved = _server_default_ai_params()
    if requested is None:
        return resolved

    has_override = any(
        value is not None
        for value in [
            requested.model,
            requested.temperature,
            requested.max_output_tokens,
            requested.max_actions,
        ]
    )
    if has_override and current_user.role not in AI_PARAM_OVERRIDE_ROLES:
        raise HTTPException(status_code=403, detail="You are not allowed to override AI parameters")

    if requested.model is not None:
        model = requested.model.strip()
        if model not in ALLOWED_GEMINI_MODELS:
            allowed = ", ".join(sorted(ALLOWED_GEMINI_MODELS))
            raise HTTPException(status_code=400, detail=f"Unsupported model '{model}'. Allowed: {allowed}")
        resolved.model = model

    if requested.temperature is not None:
        resolved.temperature = float(requested.temperature)

    if requested.max_output_tokens is not None:
        resolved.max_output_tokens = int(requested.max_output_tokens)

    if requested.max_actions is not None:
        requested_max_actions = int(requested.max_actions)
        if requested_max_actions > resolved.max_actions:
            raise HTTPException(
                status_code=400,
                detail=f"'max_actions' cannot exceed server limit ({resolved.max_actions})",
            )
        resolved.max_actions = requested_max_actions

    return resolved


async def _gemini_plan(prompt: str, ai_params: AIResolvedParams) -> dict:
    if not settings.GEMINI_API_KEY:
        raise HTTPException(status_code=503, detail="GEMINI_API_KEY not configured")

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{ai_params.model}:generateContent"
    headers = {"x-goog-api-key": settings.GEMINI_API_KEY, "content-type": "application/json"}

    body = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": ai_params.temperature,
            "maxOutputTokens": ai_params.max_output_tokens,
        },
    }

    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.post(url, headers=headers, json=body)
        if r.status_code >= 400:
            raise HTTPException(status_code=502, detail=f"Gemini error: {r.status_code}")
        data = r.json()

    try:
        text = data["candidates"][0]["content"]["parts"][0]["text"]
    except Exception:
        raise HTTPException(status_code=502, detail="Unexpected Gemini response format")

    try:
        return _extract_first_json_object(text)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI output was not valid JSON: {e}")


def _audit(db: Session, user: User, action: str, entity_type: str, entity_id: str | None, entity_name: str | None, before: dict | None, after: dict | None):
    db.add(
        AuditLog(
            company_id=user.company_id,
            admin_id=user.id,
            admin_name=user.full_name,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            entity_name=entity_name,
            before_value=json.dumps(before) if before is not None else None,
            after_value=json.dumps(after) if after is not None else None,
        )
    )


def _ensure_company_user(user: User):
    if is_platform_admin(user) or user.company_id is None:
        raise HTTPException(status_code=403, detail="Company context required")


def _allowed_actions_for_role(role: str) -> set[str]:
    allowed = set(READ_ONLY_ACTIONS)
    if role in COMMAND_ROLES:
        allowed.update(COMMAND_ACTIONS)
    return allowed


class ActionValidationError(ValueError):
    pass


def _require_non_empty_str(params: dict, key: str) -> str:
    value = params.get(key)
    if value is None:
        raise ActionValidationError(f"Missing required field '{key}'")
    text = str(value).strip()
    if not text:
        raise ActionValidationError(f"'{key}' cannot be empty")
    return text


def _require_int(params: dict, key: str, *, min_value: int | None = None, max_value: int | None = None) -> int:
    if key not in params:
        raise ActionValidationError(f"Missing required field '{key}'")
    try:
        value = int(params[key])
    except (TypeError, ValueError):
        raise ActionValidationError(f"'{key}' must be an integer")
    if min_value is not None and value < min_value:
        raise ActionValidationError(f"'{key}' must be >= {min_value}")
    if max_value is not None and value > max_value:
        raise ActionValidationError(f"'{key}' must be <= {max_value}")
    return value


def _build_system_prompt(role: str, allowed_actions: set[str]) -> str:
    action_specs = {
        "create_team": '{"action":"create_team","params":{"name": string}}',
        "delete_team": '{"action":"delete_team","params":{"team_id": int}}',
        "add_team_member": '{"action":"add_team_member","params":{"team_id": int, "user_id": int}}',
        "remove_team_member": '{"action":"remove_team_member","params":{"team_id": int, "user_id": int}}',
        "create_ledger_entry": '{"action":"create_ledger_entry","params":{"ledger_slug": string, "data": object}}',
        "monthly_best_sales_exec": '{"action":"monthly_best_sales_exec","params":{"year": int, "month": int}}',
        "revenue_summary": '{"action":"revenue_summary","params":{"period":"day|month|year","year": int?, "month": int?, "day": int?}}',
        "business_snapshot": '{"action":"business_snapshot","params":{}}',
    }
    allowed_specs = "\n".join(f"- {action_specs[a]}" for a in sorted(allowed_actions))
    return f"""
You are the CRM Company Assistant for role '{role}'.
Return ONLY valid JSON with this exact shape:
{{
  "say": "short response to user",
  "actions": [
    {{"action": "...", "params": {{...}}}}
  ]
}}

You may ONLY use these actions:
{allowed_specs}

Rules:
- Never output actions outside the allowed list.
- If the user asks for disallowed changes, keep actions empty and explain in "say".
- Use business_snapshot/revenue_summary for "what is going on" and revenue questions.
"""


def _normalize_action(action: str, params: dict) -> dict:
    now_utc = datetime.now(timezone.utc)
    today = now_utc.date()

    if action == "create_team":
        name = _require_non_empty_str(params, "name")
        if len(name) > 100:
            raise ActionValidationError("'name' must be <= 100 characters")
        return {"name": name}

    if action == "delete_team":
        return {"team_id": _require_int(params, "team_id", min_value=1)}

    if action in {"add_team_member", "remove_team_member"}:
        return {
            "team_id": _require_int(params, "team_id", min_value=1),
            "user_id": _require_int(params, "user_id", min_value=1),
        }

    if action == "create_ledger_entry":
        slug = _require_non_empty_str(params, "ledger_slug").lower().replace("-", "_")
        if slug not in ALL_LEDGERS:
            raise ActionValidationError(f"Unknown ledger_slug '{slug}'")
        data = params.get("data")
        if not isinstance(data, dict) or not data:
            raise ActionValidationError("'data' must be a non-empty object")
        return {"ledger_slug": slug, "data": data}

    if action == "monthly_best_sales_exec":
        try:
            year = int(params.get("year", today.year))
            month = int(params.get("month", today.month))
        except (TypeError, ValueError):
            raise ActionValidationError("'year' and 'month' must be integers")
        if year < 2000 or year > 2100:
            raise ActionValidationError("'year' must be between 2000 and 2100")
        if month < 1 or month > 12:
            raise ActionValidationError("'month' must be between 1 and 12")
        return {"year": year, "month": month}

    if action == "revenue_summary":
        period = str(params.get("period", "month")).strip().lower()
        if period not in {"day", "month", "year"}:
            raise ActionValidationError("'period' must be day, month, or year")
        try:
            year = int(params.get("year", today.year))
            month = int(params.get("month", today.month))
            day = int(params.get("day", today.day))
        except (TypeError, ValueError):
            raise ActionValidationError("'year', 'month', and 'day' must be integers")
        if year < 2000 or year > 2100:
            raise ActionValidationError("'year' must be between 2000 and 2100")
        if month < 1 or month > 12:
            raise ActionValidationError("'month' must be between 1 and 12")
        max_day = monthrange(year, month)[1]
        if day < 1 or day > max_day:
            raise ActionValidationError(f"'day' must be between 1 and {max_day} for {year}-{month:02d}")
        return {"period": period, "year": year, "month": month, "day": day}

    if action == "business_snapshot":
        return {}

    raise ActionValidationError(f"Unknown action '{action}'")


def _rate_limit_key(user: User) -> str:
    return f"{user.company_id}:{user.id}"


def _enforce_rate_limit(user: User):
    limit = max(1, int(settings.AI_RATE_LIMIT_PER_MINUTE))
    now = time.monotonic()
    bucket = _rate_buckets[_rate_limit_key(user)]
    while bucket and (now - bucket[0]) > 60:
        bucket.popleft()
    if len(bucket) >= limit:
        raise HTTPException(status_code=429, detail="AI rate limit exceeded. Please retry shortly.")
    bucket.append(now)


def _parse_json_list(raw: str | None) -> list[dict]:
    if not raw:
        return []
    try:
        parsed = json.loads(raw)
    except Exception:
        return []
    return parsed if isinstance(parsed, list) else []


def _serialize_actions(actions: list[AIExecutedAction]) -> str:
    return json.dumps([a.model_dump() for a in actions])


def _conversation_to_response(conv: AIConversation) -> AIChatResponse:
    executed = [AIExecutedAction(**item) for item in _parse_json_list(conv.executed_actions_json)]
    used_params = None
    if conv.context_json:
        try:
            parsed = json.loads(conv.context_json)
            if isinstance(parsed, dict) and isinstance(parsed.get("used_params"), dict):
                used_params = AIResolvedParams(**parsed["used_params"])
        except Exception:
            used_params = None
    return AIChatResponse(message=conv.ai_message or "Done.", executed_actions=executed, used_params=used_params)


def _create_team(db: Session, current_user: User, name: str) -> dict:
    normalized = (name or "").strip()
    if not normalized:
        raise HTTPException(status_code=400, detail="Team name is required")
    if len(normalized) > 100:
        raise HTTPException(status_code=400, detail="Team name must be <= 100 characters")

    existing = (
        apply_company_scope(db.query(Team), Team, current_user)
        .filter(func.lower(Team.name) == normalized.lower())
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Team name already exists")
    t = Team(company_id=current_user.company_id, name=normalized)
    db.add(t)
    db.flush()
    _audit(db, current_user, "ai_team_created", "team", str(t.id), t.name, None, {"name": t.name})
    db.commit()
    db.refresh(t)
    return {"id": t.id, "name": t.name}


def _delete_team(db: Session, current_user: User, team_id: int) -> dict:
    team = apply_company_scope(db.query(Team), Team, current_user).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    member_count = apply_company_scope(db.query(TeamMembership), TeamMembership, current_user).filter(TeamMembership.team_id == team_id).count()
    apply_company_scope(db.query(TeamMembership), TeamMembership, current_user).filter(TeamMembership.team_id == team_id).delete(synchronize_session="fetch")
    apply_company_scope(db.query(User), User, current_user).filter(User.team_id == team_id).update({"team_id": None}, synchronize_session="fetch")

    _audit(db, current_user, "ai_team_deleted", "team", str(team.id), team.name, {"member_count": member_count}, None)
    db.delete(team)
    db.commit()
    return {"id": team_id, "name": team.name, "member_count": member_count}


def _add_member(db: Session, current_user: User, team_id: int, user_id: int) -> dict:
    team = apply_company_scope(db.query(Team), Team, current_user).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    target = apply_company_scope(db.query(User), User, current_user).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    existing = apply_company_scope(db.query(TeamMembership), TeamMembership, current_user).filter(
        TeamMembership.team_id == team_id, TeamMembership.user_id == user_id
    ).first()
    if existing:
        return {"message": "already_member", "team_id": team_id, "user_id": user_id}

    db.add(TeamMembership(company_id=current_user.company_id, team_id=team_id, user_id=user_id))
    if target.team_id is None:
        target.team_id = team_id
    _audit(db, current_user, "ai_team_member_added", "team", str(team_id), team.name, None, {"user_id": user_id})
    db.commit()
    return {"team_id": team_id, "user_id": user_id}


def _remove_member(db: Session, current_user: User, team_id: int, user_id: int) -> dict:
    team = apply_company_scope(db.query(Team), Team, current_user).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    target = apply_company_scope(db.query(User), User, current_user).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    membership = apply_company_scope(db.query(TeamMembership), TeamMembership, current_user).filter(
        TeamMembership.team_id == team_id, TeamMembership.user_id == user_id
    ).first()
    if not membership:
        return {"message": "not_a_member", "team_id": team_id, "user_id": user_id}

    before_primary = target.team_id
    db.delete(membership)
    if target.team_id == team_id:
        next_membership = apply_company_scope(db.query(TeamMembership), TeamMembership, current_user).filter(
            TeamMembership.user_id == user_id
        ).order_by(TeamMembership.id.desc()).first()
        target.team_id = next_membership.team_id if next_membership else None

    _audit(
        db,
        current_user,
        "ai_team_member_removed",
        "team",
        str(team_id),
        team.name,
        {"user_id": user_id, "primary_team_id": before_primary},
        {"user_id": user_id, "primary_team_id": target.team_id},
    )
    db.commit()
    return {"team_id": team_id, "user_id": user_id}


def _create_ledger_entry(db: Session, current_user: User, ledger_slug: str, data: dict) -> dict:
    if current_user.role not in COMMAND_ROLES:
        raise HTTPException(status_code=403, detail="You are not allowed to create ledger entries via AI")
    if current_user.company_id is None:
        raise HTTPException(status_code=403, detail="Company context required")
    if ledger_slug not in ALL_LEDGERS:
        raise HTTPException(status_code=400, detail=f"Unknown ledger '{ledger_slug}'")

    entry = LedgerEntry(
        company_id=current_user.company_id,
        ledger_slug=ledger_slug,
        data=data,
        created_by=current_user.id,
    )
    db.add(entry)
    db.flush()
    _audit(
        db,
        current_user,
        "ai_ledger_entry_created",
        "ledger",
        str(entry.id),
        ledger_slug,
        None,
        {"ledger_slug": ledger_slug, "data": data},
    )
    db.commit()
    db.refresh(entry)
    return {
        "id": entry.id,
        "ledger_slug": entry.ledger_slug,
        "data": entry.data or {},
    }


def _revenue_summary(db: Session, current_user: User, period: str, year: int, month: int, day: int) -> dict:
    inv_q = apply_company_scope(db.query(Invoice), Invoice, current_user)

    if period == "day":
        start_date = date(year, month, day)
        end_date = start_date + timedelta(days=1)
        period_label = start_date.isoformat()
    elif period == "month":
        start_date = date(year, month, 1)
        end_date = date(year + 1, 1, 1) if month == 12 else date(year, month + 1, 1)
        period_label = f"{year}-{month:02d}"
    else:
        start_date = date(year, 1, 1)
        end_date = date(year + 1, 1, 1)
        period_label = str(year)

    scoped = inv_q.filter(Invoice.issued_date.isnot(None), Invoice.issued_date >= start_date, Invoice.issued_date < end_date)
    total_invoices = scoped.count()
    billed = float(scoped.with_entities(func.sum(Invoice.total)).scalar() or 0.0)
    paid = float(scoped.filter(Invoice.status == "Paid").with_entities(func.sum(Invoice.total)).scalar() or 0.0)
    pending = float(scoped.filter(Invoice.status.in_(["Pending", "Overdue"])).with_entities(func.sum(Invoice.total)).scalar() or 0.0)
    overdue = float(scoped.filter(Invoice.status == "Overdue").with_entities(func.sum(Invoice.total)).scalar() or 0.0)

    return {
        "period": period,
        "period_label": period_label,
        "invoice_count": total_invoices,
        "billed_revenue": round(billed, 2),
        "paid_revenue": round(paid, 2),
        "pending_revenue": round(pending, 2),
        "overdue_revenue": round(overdue, 2),
    }


def _business_snapshot(db: Session, current_user: User) -> dict:
    lead_q = apply_company_scope(db.query(Lead), Lead, current_user)
    inv_q = apply_company_scope(db.query(Invoice), Invoice, current_user)
    task_q = apply_company_scope(db.query(Task), Task, current_user)

    total_leads = lead_q.count()
    converted_leads = lead_q.filter(Lead.status == "Converted").count()
    lost_leads = lead_q.filter(Lead.status == "Lost").count()
    open_tasks = task_q.filter(Task.status != "Completed").count()
    completed_tasks = task_q.filter(Task.status == "Completed").count()
    total_invoices = inv_q.count()
    pending_invoices = inv_q.filter(Invoice.status.in_(["Pending", "Overdue"])).count()

    billed_total = float(inv_q.with_entities(func.sum(Invoice.total)).scalar() or 0.0)
    paid_total = float(inv_q.filter(Invoice.status == "Paid").with_entities(func.sum(Invoice.total)).scalar() or 0.0)
    overdue_total = float(inv_q.filter(Invoice.status == "Overdue").with_entities(func.sum(Invoice.total)).scalar() or 0.0)

    return {
        "leads": {
            "total": total_leads,
            "converted": converted_leads,
            "lost": lost_leads,
            "active": max(0, total_leads - converted_leads - lost_leads),
        },
        "tasks": {
            "open": open_tasks,
            "completed": completed_tasks,
        },
        "invoices": {
            "total": total_invoices,
            "pending": pending_invoices,
            "billed_revenue": round(billed_total, 2),
            "paid_revenue": round(paid_total, 2),
            "overdue_revenue": round(overdue_total, 2),
        },
    }


def _monthly_best_sales_exec(db: Session, current_user: User, year: int, month: int) -> dict:
    # Reuse the same definition as /md/performance/monthly (finance source of truth).
    start = datetime(year, month, 1, tzinfo=timezone.utc)
    if month == 12:
        end = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        end = datetime(year, month + 1, 1, tzinfo=timezone.utc)

    sales_users = apply_company_scope(db.query(User), User, current_user).filter(User.role == "sales").all()
    sales_ids = [u.id for u in sales_users]
    if not sales_ids:
        return {"top_sales_exec": None}

    inv_q = apply_company_scope(db.query(Invoice.created_by_id, func.sum(Invoice.total)), Invoice, current_user)
    inv_q = inv_q.filter(
        Invoice.created_by_id.in_(sales_ids),
        Invoice.status == "Paid",
        Invoice.paid_date.isnot(None),
        Invoice.paid_date >= start.date(),
        Invoice.paid_date < end.date(),
    ).group_by(Invoice.created_by_id)
    revenue_map = {uid: float(total or 0) for uid, total in inv_q.all()}

    conv_q = apply_company_scope(db.query(Lead.assigned_to_id, func.count(Lead.id)), Lead, current_user)
    conv_q = conv_q.filter(
        Lead.assigned_to_id.in_(sales_ids),
        Lead.status == "Converted",
        Lead.converted_at.isnot(None),
        Lead.converted_at >= start,
        Lead.converted_at < end,
    ).group_by(Lead.assigned_to_id)
    conv_map = {uid: int(cnt or 0) for uid, cnt in conv_q.all()}

    rows = []
    for u in sales_users:
        rows.append(
            {
                "user_id": u.id,
                "name": u.full_name,
                "email": u.email,
                "revenue": revenue_map.get(u.id, 0.0),
                "converted_leads": conv_map.get(u.id, 0),
            }
        )
    rows.sort(key=lambda x: (x["revenue"], x["converted_leads"]), reverse=True)
    return {"top_sales_exec": rows[0] if rows else None}


@router.get("/company-assistant/params", response_model=AIParamsResponse)
def get_company_assistant_params(current_user: User = Depends(get_current_user)):
    _ensure_company_user(current_user)
    return AIParamsResponse(
        can_override=current_user.role in AI_PARAM_OVERRIDE_ROLES,
        allowed_models=sorted(ALLOWED_GEMINI_MODELS),
        params=_server_default_ai_params(),
    )


@router.post("/company-assistant", response_model=AIChatResponse)
async def company_assistant(
    request: Request,
    body: AIChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Company-scoped AI endpoint.
    MD/Manager can execute operational actions; other company roles get read-only AI insights.
    """
    _ensure_company_user(current_user)
    _enforce_rate_limit(current_user)
    allowed_actions = _allowed_actions_for_role(current_user.role)
    ai_params = _resolve_ai_params(current_user, body.ai_params)

    idempotency_key = (request.headers.get("Idempotency-Key") or "").strip() or None
    if idempotency_key and len(idempotency_key) > 128:
        raise HTTPException(status_code=400, detail="Idempotency-Key too long")
    if idempotency_key:
        existing = (
            db.query(AIConversation)
            .filter(
                AIConversation.company_id == current_user.company_id,
                AIConversation.user_id == current_user.id,
                AIConversation.idempotency_key == idempotency_key,
            )
            .first()
        )
        if existing:
            if existing.status == "completed":
                return _conversation_to_response(existing)
            if existing.status == "processing":
                raise HTTPException(status_code=409, detail="Duplicate request is still processing")

    system = _build_system_prompt(current_user.role, allowed_actions)

    conversation = AIConversation(
        company_id=current_user.company_id,
        user_id=current_user.id,
        idempotency_key=idempotency_key,
        status="processing",
        user_message=body.message.strip(),
        context_json=json.dumps(
            {
                "context": body.context,
                "used_params": ai_params.model_dump(),
            }
        ),
    )
    db.add(conversation)
    db.commit()
    db.refresh(conversation)

    try:
        prompt = system + "\nUser: " + body.message.strip()
        plan = await _gemini_plan(prompt, ai_params)
        if not isinstance(plan, dict):
            raise HTTPException(status_code=502, detail="AI output was not a JSON object")

        say = str(plan.get("say", "")).strip() or "Done."
        actions = plan.get("actions", []) or []
        if not isinstance(actions, list):
            actions = []
        executed: list[AIExecutedAction] = []

        for a in actions[: ai_params.max_actions]:
            if not isinstance(a, dict):
                executed.append(
                    AIExecutedAction(
                        action="invalid_action",
                        params={},
                        result={"status": "error", "error": "Action payload must be an object"},
                    )
                )
                continue
            action = str(a.get("action", "")).strip()
            params = a.get("params") or {}
            if not isinstance(params, dict):
                executed.append(
                    AIExecutedAction(
                        action=action or "invalid_action",
                        params={},
                        result={"status": "error", "error": "Action params must be an object"},
                    )
                )
                continue
            if not action:
                continue

            if action not in allowed_actions:
                executed.append(
                    AIExecutedAction(
                        action=action,
                        params=params,
                        result={"status": "skipped", "reason": "action_not_allowed_for_role"},
                    )
                )
                continue

            try:
                normalized = _normalize_action(action, params)
            except ActionValidationError as exc:
                executed.append(
                    AIExecutedAction(
                        action=action,
                        params=params,
                        result={"status": "error", "error": str(exc)},
                    )
                )
                continue

            if action == "create_team":
                result = _create_team(db, current_user, name=normalized["name"])
            elif action == "delete_team":
                result = _delete_team(db, current_user, team_id=normalized["team_id"])
            elif action == "add_team_member":
                result = _add_member(
                    db,
                    current_user,
                    team_id=normalized["team_id"],
                    user_id=normalized["user_id"],
                )
            elif action == "remove_team_member":
                result = _remove_member(
                    db,
                    current_user,
                    team_id=normalized["team_id"],
                    user_id=normalized["user_id"],
                )
            elif action == "monthly_best_sales_exec":
                result = _monthly_best_sales_exec(
                    db,
                    current_user,
                    year=normalized["year"],
                    month=normalized["month"],
                )
            elif action == "create_ledger_entry":
                result = _create_ledger_entry(
                    db,
                    current_user,
                    ledger_slug=normalized["ledger_slug"],
                    data=normalized["data"],
                )
            elif action == "revenue_summary":
                result = _revenue_summary(
                    db,
                    current_user,
                    period=normalized["period"],
                    year=normalized["year"],
                    month=normalized["month"],
                    day=normalized["day"],
                )
            elif action == "business_snapshot":
                result = _business_snapshot(db, current_user)
            else:
                executed.append(
                    AIExecutedAction(
                        action=action,
                        params=params,
                        result={"status": "skipped", "reason": "unsupported_action"},
                    )
                )
                continue

            executed.append(AIExecutedAction(action=action, params=normalized, result=result))

        conversation.status = "completed"
        conversation.ai_message = say
        conversation.planned_actions_json = json.dumps(actions)
        conversation.executed_actions_json = _serialize_actions(executed)
        db.commit()
        return AIChatResponse(message=say, executed_actions=executed, used_params=ai_params)
    except HTTPException as exc:
        conversation.status = "failed"
        conversation.error_detail = str(exc.detail)
        db.commit()
        raise
    except Exception as exc:
        conversation.status = "failed"
        conversation.error_detail = str(exc)
        db.commit()
        raise

