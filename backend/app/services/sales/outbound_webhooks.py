import hashlib
import hmac
import json
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from urllib.parse import urlparse

import httpx
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.sales.webhook_endpoint import WebhookDelivery, WebhookEndpoint
from app.utils.totp_crypto import decrypt_secret, encrypt_secret

ALLOWED_EVENTS = frozenset({"lead.created", "deal.stage_changed", "invoice.paid"})
MAX_ENDPOINTS = 5
MAX_ATTEMPTS = 3
POST_TIMEOUT = 2.0
SECRET_PREFIX = "whsec_"


def generate_secret() -> str:
    return SECRET_PREFIX + secrets.token_hex(24)


def canonical_json(payload: dict) -> bytes:
    return json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")


def sign_body(secret: str, body: bytes) -> str:
    digest = hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()
    return f"sha256={digest}"


def validate_url(url: str) -> str:
    raw = (url or "").strip()
    parsed = urlparse(raw)
    if parsed.scheme not in ("https", "http") or not parsed.netloc:
        raise HTTPException(status_code=400, detail="url must be an http(s) URL")
    if parsed.scheme == "http" and parsed.hostname not in ("localhost", "127.0.0.1"):
        raise HTTPException(status_code=400, detail="http URLs are only allowed for localhost")
    return raw


def normalize_events(raw) -> list[str] | None:
    if raw is None:
        return None
    if not isinstance(raw, list) or not raw:
        return None
    events = []
    for item in raw:
        name = str(item).strip()
        if name not in ALLOWED_EVENTS:
            raise HTTPException(status_code=400, detail=f"unknown event: {name}")
        if name not in events:
            events.append(name)
    return events


def endpoint_matches(endpoint: WebhookEndpoint, event: str) -> bool:
    if not endpoint.is_active:
        return False
    subscribed = endpoint.events
    if not subscribed:
        return True
    return event in subscribed


def post_signed(url: str, headers: dict, content: bytes, timeout: float):
    return httpx.post(url, headers=headers, content=content, timeout=timeout)


def _attempt(endpoint: WebhookEndpoint, payload: dict) -> tuple[bool, str | None]:
    secret = decrypt_secret(endpoint.secret_encrypted)
    body = canonical_json(payload)
    headers = {
        "Content-Type": "application/json",
        "X-Perioxia-Event": payload["event"],
        "X-Perioxia-Delivery": payload["id"],
        "X-Perioxia-Signature": sign_body(secret, body),
    }
    try:
        resp = post_signed(endpoint.url, headers, body, POST_TIMEOUT)
        if 200 <= resp.status_code < 300:
            return True, None
        return False, f"http {resp.status_code}"
    except Exception as exc:
        return False, str(exc)[:500]


def emit_event(db: Session, company_id: int | None, event: str, data: dict) -> None:
    if not company_id or event not in ALLOWED_EVENTS:
        return
    endpoints = (
        db.query(WebhookEndpoint)
        .filter(WebhookEndpoint.company_id == company_id, WebhookEndpoint.is_active.is_(True))
        .all()
    )
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    for endpoint in endpoints:
        if not endpoint_matches(endpoint, event):
            continue
        delivery_key = str(uuid.uuid4())
        payload = {
            "id": delivery_key,
            "event": event,
            "created_at": now.isoformat(),
            "data": data,
        }
        ok, err = _attempt(endpoint, payload)
        db.add(WebhookDelivery(
            company_id=company_id,
            endpoint_id=endpoint.id,
            event=event,
            delivery_key=delivery_key,
            payload=payload,
            attempts=1,
            last_error=None if ok else err,
            next_retry_at=None if ok else now,
            delivered_at=now if ok else None,
        ))
    db.commit()


def retry_due_deliveries(db: Session, company_id: int | None = None) -> int:
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    query = db.query(WebhookDelivery).filter(
        WebhookDelivery.delivered_at.is_(None),
        WebhookDelivery.attempts < MAX_ATTEMPTS,
        WebhookDelivery.next_retry_at.isnot(None),
        WebhookDelivery.next_retry_at <= now,
    )
    if company_id is not None:
        query = query.filter(WebhookDelivery.company_id == company_id)
    rows = query.all()
    retried = 0
    for row in rows:
        endpoint = db.query(WebhookEndpoint).filter(WebhookEndpoint.id == row.endpoint_id).first()
        if endpoint is None or not endpoint.is_active:
            continue
        retried += 1
        ok, err = _attempt(endpoint, row.payload)
        row.attempts += 1
        row.last_error = None if ok else err
        if ok:
            row.delivered_at = now
            row.next_retry_at = None
        else:
            row.next_retry_at = now + timedelta(seconds=60 * row.attempts)
    db.commit()
    return retried
