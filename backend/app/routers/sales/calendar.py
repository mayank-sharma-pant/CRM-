"""Calendar OAuth connect / disconnect."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.core.user import User
from app.models.sales.calendar import CalendarConnection
from app.services.auth.oauth import OAuthError, PROVIDERS, provider_enabled
from app.services.sales.calendar_sync import (
    calendar_authorization_url,
    delete_user_calendar,
    exchange_calendar_code,
    parse_calendar_state,
    serialize_calendar,
    upsert_calendar_connection,
)
from app.utils.dependencies import apply_company_scope, get_current_user

router = APIRouter()


def _frontend(path_query: str) -> str:
    base = (settings.FRONTEND_URL or "").rstrip("/")
    if not path_query.startswith("/"):
        path_query = "/" + path_query
    return f"{base}{path_query}"


def _error_redirect(code: str) -> RedirectResponse:
    return RedirectResponse(url=_frontend(f"/settings/calendar?calendar_error={code}"), status_code=302)


@router.get("")
def calendar_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.company_id is None:
        raise HTTPException(status_code=403, detail="User must belong to a company")
    row = apply_company_scope(
        db.query(CalendarConnection), CalendarConnection, current_user
    ).filter(CalendarConnection.user_id == current_user.id).first()
    return serialize_calendar(row)


@router.delete("", status_code=204)
def calendar_disconnect(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.company_id is None:
        raise HTTPException(status_code=403, detail="User must belong to a company")
    delete_user_calendar(db, current_user.id)
    return None


@router.get("/oauth/{provider}/start")
def calendar_oauth_start(
    provider: str,
    current_user: User = Depends(get_current_user),
):
    provider = (provider or "").lower().strip()
    if current_user.company_id is None:
        raise HTTPException(status_code=403, detail="User must belong to a company")
    if provider not in PROVIDERS:
        raise HTTPException(status_code=400, detail="Unknown OAuth provider")
    if not provider_enabled(provider):
        raise HTTPException(status_code=503, detail="OAuth provider not configured")
    try:
        url = calendar_authorization_url(provider, current_user.id)
    except OAuthError:
        raise HTTPException(status_code=503, detail="OAuth provider not configured")
    return RedirectResponse(url=url, status_code=302)


@router.get("/oauth/{provider}/callback")
def calendar_oauth_callback(
    provider: str,
    db: Session = Depends(get_db),
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
):
    provider = (provider or "").lower().strip()
    if provider not in PROVIDERS:
        return _error_redirect("provider")
    if error or not code or not state:
        return _error_redirect("denied")
    try:
        user_id = parse_calendar_state(state, provider)
        tokens = exchange_calendar_code(provider, code)
    except OAuthError as exc:
        return _error_redirect(exc.code)

    user = db.query(User).filter(User.id == user_id).first()
    if user is None or user.company_id is None:
        return _error_redirect("denied")

    upsert_calendar_connection(
        db,
        user_id=user.id,
        company_id=user.company_id,
        provider=provider,
        tokens=tokens,
    )
    return RedirectResponse(url=_frontend("/settings/calendar?calendar=success"), status_code=302)
