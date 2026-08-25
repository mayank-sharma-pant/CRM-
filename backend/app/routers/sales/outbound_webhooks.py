from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.core.user import User
from app.models.sales.webhook_endpoint import WebhookEndpoint
from app.services.sales.outbound_webhooks import (
    MAX_ENDPOINTS,
    generate_secret,
    normalize_events,
    retry_due_deliveries,
    validate_url,
)
from app.utils.dependencies import apply_company_scope, ensure_company_access, require_admin_or_md
from app.utils.totp_crypto import encrypt_secret

router = APIRouter()


class EndpointCreate(BaseModel):
    url: str
    events: Optional[list[str]] = None


def serialize(row: WebhookEndpoint, secret: str | None = None) -> dict:
    body = {
        "id": row.id,
        "url": row.url,
        "events": row.events,
        "is_active": row.is_active,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }
    if secret is not None:
        body["secret"] = secret
    return body


def get_or_404(db: Session, current_user: User, endpoint_id: int) -> WebhookEndpoint:
    row = (
        apply_company_scope(db.query(WebhookEndpoint), WebhookEndpoint, current_user)
        .filter(WebhookEndpoint.id == endpoint_id, WebhookEndpoint.is_active.is_(True))
        .first()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Webhook endpoint not found")
    ensure_company_access(row, current_user)
    return row


@router.get("/endpoints")
def list_endpoints(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    if current_user.company_id is None:
        raise HTTPException(status_code=403, detail="User must belong to a company")
    rows = (
        apply_company_scope(db.query(WebhookEndpoint), WebhookEndpoint, current_user)
        .filter(WebhookEndpoint.is_active.is_(True))
        .order_by(WebhookEndpoint.id.desc())
        .all()
    )
    return {"items": [serialize(r) for r in rows], "total": len(rows)}


@router.post("/endpoints", status_code=status.HTTP_201_CREATED)
def create_endpoint(
    payload: EndpointCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    if current_user.company_id is None:
        raise HTTPException(status_code=403, detail="User must belong to a company")
    live = (
        apply_company_scope(db.query(WebhookEndpoint), WebhookEndpoint, current_user)
        .filter(WebhookEndpoint.is_active.is_(True))
        .count()
    )
    if live >= MAX_ENDPOINTS:
        raise HTTPException(status_code=400, detail="Maximum of 5 webhook endpoints reached")
    url = validate_url(payload.url)
    secret = generate_secret()
    row = WebhookEndpoint(
        company_id=current_user.company_id,
        url=url,
        secret_encrypted=encrypt_secret(secret),
        events=normalize_events(payload.events),
        is_active=True,
        created_by_id=current_user.id,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return serialize(row, secret=secret)


@router.get("/endpoints/{endpoint_id:int}")
def get_endpoint(
    endpoint_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    return serialize(get_or_404(db, current_user, endpoint_id))


@router.delete("/endpoints/{endpoint_id:int}", status_code=status.HTTP_204_NO_CONTENT)
def delete_endpoint(
    endpoint_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    row = get_or_404(db, current_user, endpoint_id)
    row.is_active = False
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/retry")
def retry_webhooks(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    if current_user.company_id is None:
        raise HTTPException(status_code=403, detail="User must belong to a company")
    retried = retry_due_deliveries(db, company_id=current_user.company_id)
    return {"retried": retried}
