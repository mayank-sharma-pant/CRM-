"""1-to-1 voice calls: the call log and its chat-history entry.

Audio flows browser-to-browser (WebRTC); the server only relays call setup
messages over the chat WebSocket and keeps this log. Authorization follows the
chat rules: only the two participants of a conversation in the same company.
Nothing about the media (SDP, ICE candidates, audio) is stored here.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.core.chat import ChatCall
from app.models.core.user import User
from app.services.chat import service
from app.services.chat.crypto import encrypt_body

LIVE = ("ringing", "active")
FINAL = ("completed", "missed", "declined", "cancelled", "busy", "unavailable", "failed", "interrupted")
CONNECTIONS = ("direct", "relay", "unknown")


def _is_usable(user: User | None) -> bool:
    return user is not None and bool(user.is_active) and getattr(user.status, "value", user.status) != "disabled"


def create_call(db: Session, caller: User, conversation_id: int) -> ChatCall:
    """Start a call log row (status ringing). 404 unless `caller` takes part in the conversation;
    409 if the other person is deactivated."""
    conv, _ = service._my_participation(db, caller, conversation_id)
    callee = service._other_participant(db, conv.id, caller)
    if not _is_usable(callee):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This user is deactivated")
    call = ChatCall(
        company_id=caller.company_id,
        conversation_id=conv.id,
        caller_id=caller.id,
        callee_id=callee.id,
        status="ringing",
        connection="unknown",
        started_at=datetime.now(timezone.utc),
    )
    db.add(call)
    db.commit()
    db.refresh(call)
    return call


def _locked(db: Session, call_id: int, company_id: int) -> ChatCall | None:
    return (
        db.query(ChatCall)
        .filter(ChatCall.id == call_id, ChatCall.company_id == company_id)
        .with_for_update()
        .first()
    )


def mark_active(db: Session, call_id: int, company_id: int) -> bool:
    """ringing → active. False if the call already moved on (e.g. cancelled meanwhile)."""
    call = _locked(db, call_id, company_id)
    if call is None or call.status != "ringing":
        db.rollback()
        return False
    call.status = "active"
    call.answered_at = datetime.now(timezone.utc)
    db.commit()
    return True


def set_connection(db: Session, call_id: int, company_id: int, user_id: int, connection: str) -> bool:
    """Record how the browsers connected; only a participant of the call may report it."""
    if connection not in CONNECTIONS:
        return False
    call = _locked(db, call_id, company_id)
    if call is None or user_id not in (call.caller_id, call.callee_id):
        db.rollback()
        return False
    call.connection = connection
    db.commit()
    return True


def finish_call(db: Session, call_id: int, company_id: int, final_status: str) -> dict | None:
    """End a call once: set the final status and duration and write its chat-history entry.

    Returns {"message": ..., "recipients": [...], "conversation_id": ...} for the call that was
    ended now, or None if it had already ended (duplicate hang-ups, races) — callers can call
    this freely.
    """
    if final_status not in FINAL:
        raise ValueError(f"not a final call status: {final_status}")
    call = _locked(db, call_id, company_id)
    if call is None or call.status in FINAL:
        db.rollback()
        return None
    now = datetime.now(timezone.utc)
    answered = call.answered_at
    if answered is not None and answered.tzinfo is None:
        answered = answered.replace(tzinfo=timezone.utc)
    call.status = final_status
    call.ended_at = now
    call.duration_s = max(0, int((now - answered).total_seconds())) if answered is not None else None
    ciphertext, key_id = encrypt_body("")
    msg = service.append_message(
        db, call.company_id, call.conversation_id, call.caller_id, ciphertext, key_id, str(uuid.uuid4()), now
    )
    call.message_id = msg.id
    db.commit()
    db.refresh(msg)
    db.refresh(call)
    return {
        "message": service._message_out(msg, None, None, call),
        "recipients": [call.caller_id, call.callee_id],
        "conversation_id": call.conversation_id,
    }


def stale_candidates(db: Session, older_than: timedelta) -> list[tuple[int, int]]:
    """(call_id, company_id) of calls still ringing/active after `older_than` — candidates for
    cleanup if their live state is gone (e.g. the worker holding them restarted)."""
    cutoff = datetime.now(timezone.utc) - older_than
    rows = (
        db.query(ChatCall.id, ChatCall.company_id)
        .filter(ChatCall.status.in_(LIVE), ChatCall.started_at < cutoff)
        .order_by(ChatCall.id)
        .limit(500)
        .all()
    )
    db.rollback()
    return [(call_id, company_id) for call_id, company_id in rows]
