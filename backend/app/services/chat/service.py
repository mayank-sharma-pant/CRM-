"""Team chat: 1-to-1 conversations inside one company.

Authorization lives here, not in RLS: every conversation access goes through
`_my_participation`, which requires the caller to be a participant in their own
company. Anything else is a 404, including for admins, MDs and platform admins.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.core.chat import ChatConversation, ChatMessage, ChatParticipant
from app.models.core.company import Company
from app.models.core.team import Team
from app.models.core.user import User
from app.services.chat.crypto import ChatDecryptError, decrypt_body, encrypt_body

MAX_BODY_CHARS = 4000
PREVIEW_CHARS = 120
PAGE_MAX = 50
CONVERSATION_PAGE_MAX = 100
DIRECTORY_MAX = 50


def _not_found() -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")


def _role(user: User) -> str:
    return getattr(user.role, "value", user.role)


def require_company_member(user: User) -> None:
    if user.company_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Chat is available to company users only")


def account_is_usable(db: Session, user_id: int, token_version: int | None = None) -> User | None:
    """Same account checks as get_current_user (app/utils/dependencies.py), for WebSockets."""
    user = db.query(User).filter(User.id == user_id).first()
    if user is None or not user.is_active or getattr(user.status, "value", user.status) == "disabled":
        return None
    if token_version is not None and int(user.token_version or 0) != int(token_version):
        return None
    if user.company_id is None:
        return None
    company = db.query(Company).filter(Company.id == user.company_id).first()
    if company is None:
        return None
    company_status = str(getattr(company.status, "value", company.status)).lower()
    if company_status not in ("active", "trial"):
        return None
    if company_status == "trial" and company.trial_ends_at is not None:
        ends = company.trial_ends_at
        if ends.tzinfo is None:
            ends = ends.replace(tzinfo=timezone.utc)
        if ends < datetime.now(timezone.utc):
            return None
    return user


def _my_participation(db: Session, me: User, conversation_id: int) -> tuple[ChatConversation, ChatParticipant]:
    row = (
        db.query(ChatConversation, ChatParticipant)
        .join(ChatParticipant, ChatParticipant.conversation_id == ChatConversation.id)
        .filter(
            ChatConversation.id == conversation_id,
            ChatConversation.company_id == me.company_id,
            ChatParticipant.user_id == me.id,
            ChatParticipant.company_id == me.company_id,
        )
        .first()
    )
    if row is None:
        raise _not_found()
    return row


def participant_user_ids(db: Session, me: User, conversation_id: int) -> list[int]:
    _my_participation(db, me, conversation_id)
    rows = db.query(ChatParticipant.user_id).filter(
        ChatParticipant.conversation_id == conversation_id,
        ChatParticipant.company_id == me.company_id,
    )
    return [r[0] for r in rows]


def _other_participant(db: Session, conversation_id: int, me: User) -> User | None:
    return (
        db.query(User)
        .join(ChatParticipant, ChatParticipant.user_id == User.id)
        .filter(
            ChatParticipant.conversation_id == conversation_id,
            ChatParticipant.user_id != me.id,
            User.company_id == me.company_id,
        )
        .first()
    )


def _user_card(user: User | None, team_names: dict[int, str]) -> dict | None:
    if user is None:
        return None
    return {
        "id": user.id,
        "full_name": user.full_name,
        "role": _role(user),
        "team": team_names.get(user.team_id) if user.team_id else None,
        "is_active": bool(user.is_active) and getattr(user.status, "value", user.status) != "disabled",
    }


def _team_names(db: Session, company_id: int, team_ids: set[int]) -> dict[int, str]:
    if not team_ids:
        return {}
    rows = db.query(Team.id, Team.name).filter(Team.company_id == company_id, Team.id.in_(team_ids))
    return {tid: name for tid, name in rows}


def _safe_decrypt(token: str) -> str | None:
    try:
        return decrypt_body(token)
    except ChatDecryptError:
        return None


def _message_out(msg: ChatMessage) -> dict:
    body = _safe_decrypt(msg.body_enc)
    return {
        "id": msg.id,
        "conversation_id": msg.conversation_id,
        "seq": msg.seq,
        "sender_id": msg.sender_id,
        "body": body,
        "unavailable": body is None,
        "client_msg_id": msg.client_msg_id,
        "created_at": msg.created_at.isoformat() if msg.created_at else None,
    }


def directory(db: Session, me: User, q: str | None, limit: int) -> list[dict]:
    limit = max(1, min(int(limit), DIRECTORY_MAX))
    query = db.query(User).filter(
        User.company_id == me.company_id,
        User.id != me.id,
        User.is_active == True,  # noqa: E712
    )
    term = (q or "").strip()
    if term:
        query = query.filter(User.full_name.ilike(f"%{term[:100]}%"))
    users = query.order_by(User.full_name, User.id).limit(limit).all()
    teams = _team_names(db, me.company_id, {u.team_id for u in users if u.team_id})
    return [_user_card(u, teams) for u in users]


def get_or_create_direct(db: Session, me: User, other_user_id: int) -> dict:
    if other_user_id == me.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You can't start a chat with yourself")
    other = (
        db.query(User)
        .filter(User.id == other_user_id, User.company_id == me.company_id)
        .first()
    )
    if other is None or not other.is_active or getattr(other.status, "value", other.status) == "disabled":
        raise _not_found()

    low, high = sorted((me.id, other.id))
    key = f"{low}:{high}"

    def _existing() -> ChatConversation | None:
        return (
            db.query(ChatConversation)
            .filter(ChatConversation.company_id == me.company_id, ChatConversation.direct_key == key)
            .first()
        )

    conv = _existing()
    if conv is None:
        try:
            conv = ChatConversation(company_id=me.company_id, kind="direct", direct_key=key, last_seq=0)
            db.add(conv)
            db.flush()
            db.add_all([
                ChatParticipant(company_id=me.company_id, conversation_id=conv.id, user_id=low, last_read_seq=0),
                ChatParticipant(company_id=me.company_id, conversation_id=conv.id, user_id=high, last_read_seq=0),
            ])
            db.commit()
        except IntegrityError:
            db.rollback()
            conv = _existing()
            if conv is None:
                raise
    return conversation_summary(db, me, conv.id)


def _summaries(db: Session, me: User, conversation_ids: list[int]) -> list[dict]:
    """Batch-load summaries (fixed number of queries) for conversations `me` participates in."""
    if not conversation_ids:
        return []
    mine = {
        conv.id: (conv, part)
        for conv, part in db.query(ChatConversation, ChatParticipant)
        .join(ChatParticipant, ChatParticipant.conversation_id == ChatConversation.id)
        .filter(
            ChatConversation.id.in_(conversation_ids),
            ChatConversation.company_id == me.company_id,
            ChatParticipant.user_id == me.id,
            ChatParticipant.company_id == me.company_id,
        )
    }
    others = {
        part.conversation_id: (part, user)
        for part, user in db.query(ChatParticipant, User)
        .join(User, User.id == ChatParticipant.user_id)
        .filter(
            ChatParticipant.conversation_id.in_(list(mine)),
            ChatParticipant.user_id != me.id,
            User.company_id == me.company_id,
        )
    }
    last_messages = {
        msg.conversation_id: msg
        for msg in db.query(ChatMessage)
        .join(
            ChatConversation,
            (ChatMessage.conversation_id == ChatConversation.id) & (ChatMessage.seq == ChatConversation.last_seq),
        )
        .filter(ChatConversation.id.in_(list(mine)))
    }
    teams = _team_names(db, me.company_id, {u.team_id for _, u in others.values() if u.team_id})

    out = []
    for cid in conversation_ids:
        if cid not in mine:
            continue
        conv, part = mine[cid]
        other_part, other_user = others.get(cid, (None, None))
        last = None
        msg = last_messages.get(cid)
        if msg is not None:
            body = _safe_decrypt(msg.body_enc)
            last = {
                "seq": msg.seq,
                "sender_id": msg.sender_id,
                "preview": body[:PREVIEW_CHARS] if body is not None else None,
                "created_at": msg.created_at.isoformat() if msg.created_at else None,
            }
        out.append({
            "id": conv.id,
            "kind": conv.kind,
            "other_user": _user_card(other_user, teams),
            "last_seq": conv.last_seq,
            "last_read_seq": part.last_read_seq,
            "other_last_read_seq": other_part.last_read_seq if other_part else 0,
            "unread": max(0, conv.last_seq - part.last_read_seq),
            "last_message": last,
            "last_message_at": conv.last_message_at.isoformat() if conv.last_message_at else None,
        })
    return out


def conversation_summary(db: Session, me: User, conversation_id: int) -> dict:
    _my_participation(db, me, conversation_id)
    return _summaries(db, me, [conversation_id])[0]


def list_conversations(db: Session, me: User, skip: int, limit: int) -> dict:
    limit = max(1, min(int(limit), CONVERSATION_PAGE_MAX))
    skip = max(0, int(skip))
    base = (
        db.query(ChatConversation.id)
        .join(ChatParticipant, ChatParticipant.conversation_id == ChatConversation.id)
        .filter(
            ChatConversation.company_id == me.company_id,
            ChatParticipant.user_id == me.id,
            ChatParticipant.company_id == me.company_id,
        )
    )
    total = base.count()
    ids = [
        r[0]
        for r in base.order_by(
            ChatConversation.last_message_at.is_(None),
            ChatConversation.last_message_at.desc(),
            ChatConversation.id.desc(),
        )
        .offset(skip)
        .limit(limit)
    ]
    return {"items": _summaries(db, me, ids), "total": total, "skip": skip, "limit": limit}


def get_messages(
    db: Session,
    me: User,
    conversation_id: int,
    before_seq: int | None,
    after_seq: int | None,
    limit: int,
) -> dict:
    conv, _ = _my_participation(db, me, conversation_id)
    limit = max(1, min(int(limit), PAGE_MAX))
    query = db.query(ChatMessage).filter(ChatMessage.conversation_id == conv.id)
    if after_seq is not None:
        rows = query.filter(ChatMessage.seq > after_seq).order_by(ChatMessage.seq.asc()).limit(limit).all()
    else:
        if before_seq is not None:
            query = query.filter(ChatMessage.seq < before_seq)
        rows = list(reversed(query.order_by(ChatMessage.seq.desc()).limit(limit).all()))
    return {
        "conversation_id": conv.id,
        "last_seq": conv.last_seq,
        "items": [_message_out(m) for m in rows],
        "has_more_before": bool(rows) and rows[0].seq > 1,
    }


def validate_body(raw) -> str:
    if not isinstance(raw, str):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Message must be text")
    body = raw.strip()
    if not body:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Message is empty")
    if len(body) > MAX_BODY_CHARS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Message is longer than {MAX_BODY_CHARS} characters",
        )
    return body


def validate_client_msg_id(raw) -> str:
    try:
        return str(uuid.UUID(str(raw)))
    except (ValueError, TypeError, AttributeError):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="client_msg_id must be a UUID")


def _existing_by_client_id(db: Session, me: User, client_msg_id: str) -> ChatMessage | None:
    return (
        db.query(ChatMessage)
        .filter(ChatMessage.sender_id == me.id, ChatMessage.client_msg_id == client_msg_id)
        .first()
    )


def send_message(db: Session, me: User, conversation_id: int, body: str, client_msg_id: str) -> tuple[dict, bool]:
    """Returns (message, created). A retry with the same client_msg_id returns the original."""
    conv, _ = _my_participation(db, me, conversation_id)

    existing = _existing_by_client_id(db, me, client_msg_id)
    if existing is not None:
        if existing.conversation_id != conv.id:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="client_msg_id already used")
        return _message_out(existing), False

    other = _other_participant(db, conv.id, me)
    if other is None or not other.is_active or getattr(other.status, "value", other.status) == "disabled":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This user is deactivated")

    ciphertext, key_id = encrypt_body(body)
    now = datetime.now(timezone.utc)
    try:
        # Row lock on the conversation orders concurrent sends; seq is gap-free per conversation.
        seq = db.execute(
            update(ChatConversation)
            .where(ChatConversation.id == conv.id)
            .values(last_seq=ChatConversation.last_seq + 1, last_message_at=now)
            .returning(ChatConversation.last_seq)
        ).scalar_one()
        msg = ChatMessage(
            company_id=me.company_id,
            conversation_id=conv.id,
            seq=seq,
            sender_id=me.id,
            body_enc=ciphertext,
            key_id=key_id,
            client_msg_id=client_msg_id,
            created_at=now,
        )
        db.add(msg)
        db.execute(
            update(ChatParticipant)
            .where(
                ChatParticipant.conversation_id == conv.id,
                ChatParticipant.user_id == me.id,
                ChatParticipant.last_read_seq < seq,
            )
            .values(last_read_seq=seq)
        )
        db.commit()
    except IntegrityError:
        db.rollback()
        existing = _existing_by_client_id(db, me, client_msg_id)
        if existing is not None and existing.conversation_id == conv.id:
            return _message_out(existing), False
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Message could not be saved, please retry")
    db.refresh(msg)
    return _message_out(msg), True


def mark_read(db: Session, me: User, conversation_id: int, seq: int) -> dict:
    conv, mine = _my_participation(db, me, conversation_id)
    target = max(0, min(int(seq), conv.last_seq))
    db.execute(
        update(ChatParticipant)
        .where(ChatParticipant.id == mine.id, ChatParticipant.last_read_seq < target)
        .values(last_read_seq=target)
    )
    db.commit()
    current = db.query(ChatParticipant.last_read_seq).filter(ChatParticipant.id == mine.id).scalar()
    return {"conversation_id": conv.id, "last_read_seq": current, "advanced": current == target and target > 0}


def unread_total(db: Session, me: User) -> int:
    total = (
        db.query(func.coalesce(func.sum(ChatConversation.last_seq - ChatParticipant.last_read_seq), 0))
        .join(ChatParticipant, ChatParticipant.conversation_id == ChatConversation.id)
        .filter(
            ChatConversation.company_id == me.company_id,
            ChatParticipant.user_id == me.id,
            ChatParticipant.company_id == me.company_id,
            ChatConversation.last_seq > ChatParticipant.last_read_seq,
        )
        .scalar()
    )
    return int(total or 0)


def sync_state(db: Session, me: User) -> dict:
    """Small reconcile payload: every conversation's last_seq and my read position."""
    rows = (
        db.query(ChatConversation.id, ChatConversation.last_seq, ChatParticipant.last_read_seq)
        .join(ChatParticipant, ChatParticipant.conversation_id == ChatConversation.id)
        .filter(
            ChatConversation.company_id == me.company_id,
            ChatParticipant.user_id == me.id,
            ChatParticipant.company_id == me.company_id,
        )
        .order_by(ChatConversation.id)
        .limit(1000)
        .all()
    )
    conversations = [{"id": cid, "last_seq": last, "last_read_seq": read} for cid, last, read in rows]
    return {
        "conversations": conversations,
        "unread_total": sum(max(0, c["last_seq"] - c["last_read_seq"]) for c in conversations),
    }


def same_company_user_ids(db: Session, me: User, user_ids: list[int]) -> list[int]:
    if not user_ids:
        return []
    rows = db.query(User.id).filter(User.company_id == me.company_id, User.id.in_(user_ids[:200]))
    return [r[0] for r in rows]


def export_sent_messages(db: Session, user: User) -> list[dict]:
    if user.company_id is None:
        return []
    rows = (
        db.query(ChatMessage)
        .filter(ChatMessage.sender_id == user.id, ChatMessage.company_id == user.company_id)
        .order_by(ChatMessage.conversation_id, ChatMessage.seq)
        .all()
    )
    return [_message_out(m) for m in rows]
