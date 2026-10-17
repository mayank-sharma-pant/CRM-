"""Team chat WebSocket: wss://api.perioxia.com/api/chat/ws

Handshake: exact Origin allowlist → accept → first frame must be
{"type": "auth", "ticket": "..."} within AUTH_TIMEOUT. Tickets are single-use
(see realtime.Hub.consume_ticket). The socket closes at the JWT's expiry and
re-checks the account every RECHECK_SECONDS.
"""
import asyncio
import json
import logging
import time

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from fastapi import HTTPException
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from app.config import settings
from app.database import get_db
from app.services.chat import service
from app.services.chat.crypto import chat_crypto_configured
from app.services.chat.realtime import Connection, hub
from app.tenancy import bind_tenant, reset_tenant

logger = logging.getLogger("app.chat.ws")
router = APIRouter()

AUTH_TIMEOUT = 10.0
MAX_FRAME_CHARS = 4096
PING_SECONDS = 25.0
RECHECK_SECONDS = 60.0
TYPING_MIN_INTERVAL = 2.0
PARTICIPANT_CACHE_SECONDS = 60.0

CLOSE_POLICY = 1008
CLOSE_TOO_BIG = 1009
CLOSE_UNAVAILABLE = 1013
CLOSE_UNAUTHORIZED = 4401
CLOSE_FORBIDDEN = 4403
CLOSE_AUTH_TIMEOUT = 4408
CLOSE_SLOW_CONSUMER = 4429


def allowed_origins() -> set[str]:
    raw = settings.CHAT_WS_ALLOWED_ORIGINS or settings.CORS_ORIGINS or ""
    return {o.strip().rstrip("/") for o in raw.split(",") if o.strip()}


def _load_account(db: Session, user_id: int, token_version: int):
    try:
        user = service.account_is_usable(db, user_id, token_version)
        return (user.id, user.company_id) if user is not None else None
    finally:
        db.rollback()  # end the transaction so the pooled connection is released


def _participants(db: Session, user_id: int, company_id: int, conversation_id: int) -> list[int]:
    bind_tenant(company_id=company_id, db=db)
    try:
        me = service.account_is_usable(db, user_id)
        if me is None:
            return []
        return service.participant_user_ids(db, me, conversation_id)
    except HTTPException:
        return []
    finally:
        db.rollback()  # end the transaction so the pooled connection is released
        reset_tenant()


@router.websocket("/ws")
async def chat_ws(websocket: WebSocket, db: Session = Depends(get_db)):
    if not settings.CHAT_ENABLED or not chat_crypto_configured():
        await websocket.close(code=CLOSE_UNAVAILABLE)
        return
    origin = (websocket.headers.get("origin") or "").rstrip("/")
    if not origin or origin not in allowed_origins():
        await websocket.close(code=CLOSE_POLICY)
        return

    await websocket.accept()
    try:
        raw = await asyncio.wait_for(websocket.receive_text(), AUTH_TIMEOUT)
    except asyncio.TimeoutError:
        await websocket.close(code=CLOSE_AUTH_TIMEOUT)
        return
    except (WebSocketDisconnect, RuntimeError, KeyError):
        return
    if len(raw) > MAX_FRAME_CHARS:
        await websocket.close(code=CLOSE_TOO_BIG)
        return
    try:
        frame = json.loads(raw)
    except ValueError:
        frame = None
    if not isinstance(frame, dict) or frame.get("type") != "auth":
        await websocket.close(code=CLOSE_UNAUTHORIZED)
        return

    ticket = await hub.consume_ticket(frame.get("ticket"))
    if not ticket or int(ticket.get("exp", 0)) <= time.time():
        await websocket.close(code=CLOSE_UNAUTHORIZED)
        return
    account = await run_in_threadpool(_load_account, db, int(ticket["user_id"]), int(ticket["token_version"]))
    if account is None or account[1] != ticket.get("company_id"):
        await websocket.close(code=CLOSE_FORBIDDEN)
        return

    user_id, company_id = account
    token_version = int(ticket["token_version"])
    expires_at = int(ticket["exp"])
    conn = Connection(user_id, company_id)
    hub.register(conn)
    await hub.touch_presence(user_id)
    conn.offer(json.dumps({"type": "ready", "user_id": user_id}))

    allowed_conversations: dict[int, tuple[float, list[int]]] = {}
    last_typing: dict[int, float] = {}
    close_code = {"value": 1000}

    async def sender() -> None:
        while True:
            payload = await conn.queue.get()
            if conn.overflowed:
                close_code["value"] = CLOSE_SLOW_CONSUMER
                return
            await websocket.send_text(payload)

    async def receiver() -> None:
        while True:
            text = await websocket.receive_text()
            if len(text) > MAX_FRAME_CHARS:
                close_code["value"] = CLOSE_TOO_BIG
                return
            try:
                msg = json.loads(text)
            except ValueError:
                continue
            if not isinstance(msg, dict) or msg.get("type") != "typing":
                continue
            conv_id = msg.get("conversation_id")
            if not isinstance(conv_id, int) or conv_id <= 0:
                continue
            now = time.monotonic()
            if now - last_typing.get(conv_id, 0.0) < TYPING_MIN_INTERVAL:
                continue
            last_typing[conv_id] = now
            cached = allowed_conversations.get(conv_id)
            if cached is None or cached[0] < now:
                ids = await run_in_threadpool(_participants, db, user_id, company_id, conv_id)
                cached = (now + PARTICIPANT_CACHE_SECONDS, ids)
                allowed_conversations[conv_id] = cached
            recipients = [uid for uid in cached[1] if uid != user_id]
            if user_id in cached[1] and recipients:
                await hub.publish(recipients, {"type": "typing", "conversation_id": conv_id, "user_id": user_id})

    async def watchdog() -> None:
        next_recheck = time.monotonic() + RECHECK_SECONDS
        while True:
            remaining = expires_at - time.time()
            if remaining <= 0:
                close_code["value"] = CLOSE_UNAUTHORIZED
                return
            await asyncio.sleep(min(PING_SECONDS, remaining))
            if expires_at - time.time() <= 0:
                close_code["value"] = CLOSE_UNAUTHORIZED
                return
            conn.offer(json.dumps({"type": "ping"}))
            await hub.touch_presence(user_id)
            if time.monotonic() >= next_recheck:
                next_recheck = time.monotonic() + RECHECK_SECONDS
                if await run_in_threadpool(_load_account, db, user_id, token_version) is None:
                    close_code["value"] = CLOSE_FORBIDDEN
                    return
                allowed_conversations.clear()

    tasks = [asyncio.create_task(t()) for t in (sender, receiver, watchdog)]
    try:
        done, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
        for task in pending:
            task.cancel()
        for task in pending:
            try:
                await task
            except (asyncio.CancelledError, Exception):
                pass
        for task in done:
            exc = task.exception()
            if exc is not None and not isinstance(exc, (WebSocketDisconnect, RuntimeError, KeyError)):
                logger.warning("Chat socket task failed: %s", type(exc).__name__)
    finally:
        hub.unregister(conn)
        try:
            await websocket.close(code=close_code["value"])
        except Exception:
            pass
