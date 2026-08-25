from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.core.api_key import ApiKey
from app.models.core.enums import ApiKeyAccess
from app.models.core.user import User
from app.services.sales.api_keys import MAX_LIVE_KEYS, generate_api_token, live_key_count
from app.utils.dependencies import require_admin_or_md

router = APIRouter()


class ApiKeyCreate(BaseModel):
    name: str
    access: ApiKeyAccess


def _serialize(key: ApiKey, token: str | None = None) -> dict:
    body = {
        "id": key.id,
        "name": key.name,
        "prefix": key.prefix,
        "access": key.access.value if hasattr(key.access, "value") else key.access,
        "created_at": key.created_at.isoformat() if key.created_at else None,
        "last_used_at": key.last_used_at.isoformat() if key.last_used_at else None,
    }
    if token is not None:
        body["token"] = token
    return body


@router.get("")
def list_api_keys(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    if current_user.company_id is None:
        raise HTTPException(status_code=403, detail="User must be assigned to a company")
    keys = (
        db.query(ApiKey)
        .filter(ApiKey.company_id == current_user.company_id, ApiKey.revoked_at.is_(None))
        .order_by(ApiKey.created_at.desc())
        .all()
    )
    return {"items": [_serialize(k) for k in keys]}


@router.post("", status_code=status.HTTP_201_CREATED)
def create_api_key(
    body: ApiKeyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    if current_user.company_id is None:
        raise HTTPException(status_code=403, detail="User must be assigned to a company")
    name = (body.name or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="name is required")
    if len(name) > 80:
        raise HTTPException(status_code=400, detail="name must be at most 80 characters")
    if live_key_count(db, current_user.company_id) >= MAX_LIVE_KEYS:
        raise HTTPException(status_code=400, detail="Maximum of 10 live API keys reached")
    token, prefix, token_hash = generate_api_token()
    key = ApiKey(
        company_id=current_user.company_id,
        name=name,
        prefix=prefix,
        token_hash=token_hash,
        access=body.access,
        created_by_id=current_user.id,
    )
    db.add(key)
    db.commit()
    db.refresh(key)
    return _serialize(key, token=token)


@router.delete("/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_api_key(
    key_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    if current_user.company_id is None:
        raise HTTPException(status_code=403, detail="User must be assigned to a company")
    key = (
        db.query(ApiKey)
        .filter(
            ApiKey.id == key_id,
            ApiKey.company_id == current_user.company_id,
            ApiKey.revoked_at.is_(None),
        )
        .first()
    )
    if key is None:
        raise HTTPException(status_code=404, detail="Not found")
    key.revoked_at = datetime.now(timezone.utc)
    db.commit()
    return None
