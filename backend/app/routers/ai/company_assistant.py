from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from datetime import datetime, timezone
from collections import defaultdict, deque
import time
import json
import re

import httpx

from app.database import get_db
from app.config import settings
from app.utils.dependencies import require_admin_or_md, apply_company_scope, is_platform_admin
from app.models.core.user import User
from app.models.core.team import Team
from app.models.core.team_membership import TeamMembership
from app.models.sales.audit import AuditLog
from app.models.sales.ai_conversation import AIConversation
from app.models.sales.lead import Lead
from app.models.finance.invoice import Invoice
from app.schemas.ai import AIChatRequest, AIChatResponse, AIExecutedAction


router = APIRouter()
_rate_buckets: dict[str, deque[float]] = defaultdict(deque)


def _extract_first_json_object(text: str) -> dict:
    """
    Best-effort extraction of a JSON object from model output.
    """
    # Find first {...} block (naive but effective with strict prompting)
    m = re.search(r"\{[\s\S]*\}", text)
    if not m:
        raise ValueError("No JSON object found in model output")
    return json.loads(m.group(0))


async def _gemini_plan(prompt: str) -> dict:
    if not settings.GEMINI_API_KEY:
        raise HTTPException(status_code=503, detail="GEMINI_API_KEY not configured")

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent"
    headers = {"x-goog-api-key": settings.GEMINI_API_KEY, "content-type": "application/json"}

    body = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 1024,
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
    return AIChatResponse(message=conv.ai_message or "Done.", executed_actions=executed)


def _create_team(db: Session, current_user: User, name: str) -> dict:
    existing = apply_company_scope(db.query(Team), Team, current_user).filter(Team.name == name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Team name already exists")
    t = Team(company_id=current_user.company_id, name=name)
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


@router.post("/company-assistant", response_model=AIChatResponse)
async def company_assistant(
    request: Request,
    body: AIChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    """
    MD / Company Admin AI endpoint. Auto-executes allowed actions (team management + performance queries).
    """
    _ensure_company_user(current_user)
    _enforce_rate_limit(current_user)

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

    system = """
You are the CRM Company Assistant.
Return ONLY valid JSON with this shape:
{
  "say": "message to show user",
  "actions": [
    {"action": "...", "params": {...}}
  ]
}

Allowed actions:
- "create_team": {"name": string}
- "delete_team": {"team_id": int}
- "add_team_member": {"team_id": int, "user_id": int}
- "remove_team_member": {"team_id": int, "user_id": int}
- "monthly_best_sales_exec": {"year": int, "month": int}

Rules:
- Only use allowed actions.
- If user asks for something else, leave actions empty and explain in "say".
"""

    conversation = AIConversation(
        company_id=current_user.company_id,
        user_id=current_user.id,
        idempotency_key=idempotency_key,
        status="processing",
        user_message=body.message.strip(),
        context_json=json.dumps(body.context) if body.context is not None else None,
    )
    db.add(conversation)
    db.commit()
    db.refresh(conversation)

    try:
        prompt = system + "\nUser: " + body.message.strip()
        plan = await _gemini_plan(prompt)

        say = str(plan.get("say", "")).strip() or "Done."
        actions = plan.get("actions", []) or []
        max_actions = max(1, int(settings.AI_MAX_ACTIONS_PER_REQUEST))
        executed: list[AIExecutedAction] = []

        for a in actions[:max_actions]:
            action = a.get("action")
            params = a.get("params") or {}
            if action not in {
                "create_team",
                "delete_team",
                "add_team_member",
                "remove_team_member",
                "monthly_best_sales_exec",
            }:
                continue

            if action == "create_team":
                result = _create_team(db, current_user, name=str(params.get("name", "")).strip())
            elif action == "delete_team":
                result = _delete_team(db, current_user, team_id=int(params["team_id"]))
            elif action == "add_team_member":
                result = _add_member(db, current_user, team_id=int(params["team_id"]), user_id=int(params["user_id"]))
            elif action == "remove_team_member":
                result = _remove_member(db, current_user, team_id=int(params["team_id"]), user_id=int(params["user_id"]))
            else:  # monthly_best_sales_exec
                result = _monthly_best_sales_exec(db, current_user, year=int(params["year"]), month=int(params["month"]))

            executed.append(AIExecutedAction(action=action, params=params, result=result))

        conversation.status = "completed"
        conversation.ai_message = say
        conversation.planned_actions_json = json.dumps(actions)
        conversation.executed_actions_json = _serialize_actions(executed)
        db.commit()
        return AIChatResponse(message=say, executed_actions=executed)
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

