"""SAML SSO start + ACS."""
from datetime import datetime, timezone
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, Form, HTTPException
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
from app.services.auth.saml import (
    SAMLError,
    authorization_url,
    load_enabled_config,
    parse_relay_state,
    parse_saml_response,
    resolve_saml_user,
    verify_claims,
)
from app.utils.security import create_access_token, crm_access_token

router = APIRouter(prefix="/saml", tags=["SAML"])


def _frontend(path_query: str) -> str:
    base = (settings.FRONTEND_URL or "").rstrip("/")
    if not path_query.startswith("/"):
        path_query = "/" + path_query
    return f"{base}{path_query}"


def _error_redirect(code: str) -> RedirectResponse:
    return RedirectResponse(url=_frontend(f"/login?oauth_error={code}"), status_code=302)


@router.get("/{company_code}/start")
def saml_start(company_code: str, db: Session = Depends(get_db)):
    try:
        _company, cfg = load_enabled_config(db, company_code)
    except SAMLError:
        raise HTTPException(status_code=404, detail="SAML not configured")
    url = authorization_url(company_code, cfg.idp_sso_url)
    return RedirectResponse(url=url, status_code=302)


@router.post("/{company_code}/acs")
def saml_acs(
    company_code: str,
    db: Session = Depends(get_db),
    SAMLResponse: str = Form(None),
    RelayState: str = Form(None),
):
    if not SAMLResponse or not RelayState:
        return _error_redirect("denied")
    try:
        company, cfg = load_enabled_config(db, company_code)
        req_id = parse_relay_state(RelayState, company_code)
        assertion = parse_saml_response(SAMLResponse)
        if assertion.in_response_to != req_id:
            raise SAMLError("denied")
        if cfg.idp_entity_id and assertion.issuer and assertion.issuer != cfg.idp_entity_id:
            raise SAMLError("denied")
        verify_claims(cfg.idp_certificate_pem, assertion.name_id, assertion.email, assertion.signature_b64)
        user = resolve_saml_user(db, company.id, assertion)
    except SAMLError as exc:
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
