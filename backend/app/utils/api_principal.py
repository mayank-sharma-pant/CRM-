from datetime import datetime, timezone
from typing import Optional

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.core.api_key import ApiKey
from app.models.core.company import Company
from app.models.core.enums import ApiKeyAccess
from app.services.sales.api_keys import (
    ApiPrincipal,
    TOKEN_PREFIX,
    assert_and_count_quota,
)
from app.utils.security import hash_refresh_token


def _company_usable(company: Optional[Company]) -> None:
    if company is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Company account is unavailable")
    company_status = str(company.status.value if hasattr(company.status, "value") else company.status).lower()
    if company_status not in ("active", "trial"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Company account is {company.status}",
        )
    if company_status == "trial" and company.trial_ends_at is not None:
        trial_ends_at = company.trial_ends_at
        if trial_ends_at.tzinfo is None:
            trial_ends_at = trial_ends_at.replace(tzinfo=timezone.utc)
        if trial_ends_at < datetime.now(timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Trial expired. Please upgrade to continue.",
            )


def get_api_principal(
    request: Request,
    db: Session = Depends(get_db),
) -> ApiPrincipal:
    auth = request.headers.get("Authorization") or ""
    if not auth.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = auth[len("Bearer "):].strip()
    if not token.startswith(TOKEN_PREFIX) or len(token) != len(TOKEN_PREFIX) + 64:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    key = db.query(ApiKey).filter(ApiKey.token_hash == hash_refresh_token(token)).first()
    if key is None or key.revoked_at is not None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    company = db.query(Company).filter(Company.id == key.company_id).first()
    _company_usable(company)
    key.last_used_at = datetime.now(timezone.utc)
    assert_and_count_quota(db, key.company_id)
    db.commit()
    return ApiPrincipal(company_id=key.company_id, key_id=key.id, access=key.access)


def require_api_write(principal: ApiPrincipal = Depends(get_api_principal)) -> ApiPrincipal:
    if principal.access != ApiKeyAccess.WRITE:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Write access required")
    return principal
