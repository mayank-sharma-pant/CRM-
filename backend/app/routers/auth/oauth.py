"""OAuth SSO routes (Google / Microsoft)."""

from datetime import datetime, timezone
from typing import Optional
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.routers.auth.auth import (
    _check_company_status,
    _issue_refresh_token,
    _mfa_challenge_or_none,
    _set_auth_cookie,
    _set_refresh_cookie,
)
from app.services.auth.oauth import (
    PROVIDERS,
    OAuthError,
    authorization_url,
    fetch_profile,
    parse_state,
    provider_enabled,
    providers_status,
    resolve_user,
)
from app.utils.security import create_access_token, crm_access_token

router = APIRouter(prefix="/oauth", tags=["OAuth"])


def _frontend(path_query: str) -> str:
    base = (settings.FRONTEND_URL or "").rstrip("/")
    if not path_query.startswith("/"):
        path_query = "/" + path_query
    return f"{base}{path_query}"


def _error_redirect(code: str) -> RedirectResponse:
    return RedirectResponse(
        url=_frontend(f"/login?oauth_error={code}"),
        status_code=302,
    )


@router.get("/providers")
def list_oauth_providers():
    return providers_status()


@router.get("/{provider}/start")
def oauth_start(provider: str):
    provider = (provider or "").lower().strip()
    if provider not in PROVIDERS:
        raise HTTPException(status_code=400, detail="Unknown OAuth provider")
    if not provider_enabled(provider):
        raise HTTPException(status_code=503, detail="OAuth provider not configured")
    try:
        url = authorization_url(provider)
    except OAuthError as exc:
        raise HTTPException(status_code=503, detail="OAuth provider not configured") from exc
    return RedirectResponse(url=url, status_code=302)


@router.get("/{provider}/callback")
def oauth_callback(
    provider: str,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
):
    provider = (provider or "").lower().strip()
    if provider not in PROVIDERS:
        return _error_redirect("provider")
    if error:
        return _error_redirect("denied")
    if not code or not state:
        return _error_redirect("denied")

    try:
        parse_state(state, provider)
        profile = fetch_profile(provider, code)
        user = resolve_user(db, profile)
    except OAuthError as exc:
        return _error_redirect(exc.code)

    if user.status == "disabled" or not user.is_active:
        return _error_redirect("disabled")

    try:
        _check_company_status(user, db)
    except HTTPException:
        return _error_redirect("company")

    user.last_active_at = datetime.now(timezone.utc)
    db.commit()

    challenge = _mfa_challenge_or_none(db, user)
    if challenge is not None:
        if challenge.get("mfa_required"):
            q = urlencode({"mfa_required": "1", "mfa_token": challenge["mfa_token"]})
            return RedirectResponse(url=_frontend(f"/login?{q}"), status_code=302)
        if challenge.get("mfa_setup_required"):
            q = urlencode({"mfa_setup_required": "1", "setup_token": challenge["setup_token"]})
            return RedirectResponse(url=_frontend(f"/login?{q}"), status_code=302)

    access_token = crm_access_token(user)
    refresh_token = _issue_refresh_token(db, user)
    db.commit()

    redirect = RedirectResponse(url=_frontend("/login?oauth=success"), status_code=302)
    _set_auth_cookie(redirect, access_token)
    _set_refresh_cookie(redirect, refresh_token)
    return redirect
