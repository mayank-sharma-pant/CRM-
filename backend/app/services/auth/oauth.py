"""Google / Microsoft OAuth helpers."""

from __future__ import annotations

import secrets
from dataclasses import dataclass
from datetime import timedelta
from typing import Optional
from urllib.parse import urlencode

import httpx
from sqlalchemy import func as sa_func
from sqlalchemy.orm import Session

from app.config import settings
from app.models.core.oauth_identity import OAuthIdentity
from app.models.core.user import User
from app.utils.security import create_access_token, decode_access_token

PROVIDERS = frozenset({"google", "microsoft"})

GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO = "https://openidconnect.googleapis.com/v1/userinfo"

MICROSOFT_AUTH = "https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize"
MICROSOFT_TOKEN = "https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token"
MICROSOFT_USERINFO = "https://graph.microsoft.com/oidc/userinfo"


@dataclass(frozen=True)
class OAuthProfile:
    provider: str
    subject: str
    email: str


class OAuthError(Exception):
    def __init__(self, code: str):
        self.code = code
        super().__init__(code)


def provider_enabled(provider: str) -> bool:
    if provider == "google":
        return bool(settings.GOOGLE_OAUTH_CLIENT_ID and settings.GOOGLE_OAUTH_CLIENT_SECRET)
    if provider == "microsoft":
        return bool(settings.MICROSOFT_OAUTH_CLIENT_ID and settings.MICROSOFT_OAUTH_CLIENT_SECRET)
    return False


def providers_status() -> dict[str, bool]:
    return {
        "google": provider_enabled("google"),
        "microsoft": provider_enabled("microsoft"),
    }


def redirect_uri(provider: str) -> str:
    base = (settings.PUBLIC_API_URL or "").rstrip("/")
    return f"{base}/api/auth/oauth/{provider}/callback"


def make_state(provider: str) -> str:
    return create_access_token(
        data={"provider": provider, "nonce": secrets.token_urlsafe(16)},
        expires_delta=timedelta(minutes=10),
        audience="oauth_state",
    )


def parse_state(state: str, expected_provider: str) -> None:
    payload = decode_access_token(state, audience="oauth_state")
    if payload is None:
        raise OAuthError("denied")
    if payload.get("provider") != expected_provider:
        raise OAuthError("denied")


def authorization_url(provider: str) -> str:
    if provider not in PROVIDERS:
        raise OAuthError("provider")
    if not provider_enabled(provider):
        raise OAuthError("provider")

    state = make_state(provider)
    if provider == "google":
        params = {
            "client_id": settings.GOOGLE_OAUTH_CLIENT_ID,
            "redirect_uri": redirect_uri(provider),
            "response_type": "code",
            "scope": "openid email profile",
            "state": state,
            "access_type": "online",
            "prompt": "select_account",
        }
        return f"{GOOGLE_AUTH}?{urlencode(params)}"

    tenant = settings.MICROSOFT_OAUTH_TENANT or "common"
    params = {
        "client_id": settings.MICROSOFT_OAUTH_CLIENT_ID,
        "redirect_uri": redirect_uri(provider),
        "response_type": "code",
        "scope": "openid email profile User.Read",
        "state": state,
        "response_mode": "query",
    }
    return f"{MICROSOFT_AUTH.format(tenant=tenant)}?{urlencode(params)}"


def _token_and_profile_google(code: str) -> OAuthProfile:
    with httpx.Client(timeout=20.0) as client:
        token_res = client.post(
            GOOGLE_TOKEN,
            data={
                "code": code,
                "client_id": settings.GOOGLE_OAUTH_CLIENT_ID,
                "client_secret": settings.GOOGLE_OAUTH_CLIENT_SECRET,
                "redirect_uri": redirect_uri("google"),
                "grant_type": "authorization_code",
            },
        )
        if token_res.status_code >= 400:
            raise OAuthError("denied")
        access = token_res.json().get("access_token")
        if not access:
            raise OAuthError("denied")
        info = client.get(
            GOOGLE_USERINFO,
            headers={"Authorization": f"Bearer {access}"},
        )
        if info.status_code >= 400:
            raise OAuthError("denied")
        data = info.json()

    email = (data.get("email") or "").strip().lower()
    subject = str(data.get("sub") or "").strip()
    if not email or not subject:
        raise OAuthError("denied")
    if data.get("email_verified") is False:
        raise OAuthError("denied")
    return OAuthProfile(provider="google", subject=subject, email=email)


def _token_and_profile_microsoft(code: str) -> OAuthProfile:
    tenant = settings.MICROSOFT_OAUTH_TENANT or "common"
    with httpx.Client(timeout=20.0) as client:
        token_res = client.post(
            MICROSOFT_TOKEN.format(tenant=tenant),
            data={
                "code": code,
                "client_id": settings.MICROSOFT_OAUTH_CLIENT_ID,
                "client_secret": settings.MICROSOFT_OAUTH_CLIENT_SECRET,
                "redirect_uri": redirect_uri("microsoft"),
                "grant_type": "authorization_code",
            },
        )
        if token_res.status_code >= 400:
            raise OAuthError("denied")
        access = token_res.json().get("access_token")
        if not access:
            raise OAuthError("denied")
        info = client.get(
            MICROSOFT_USERINFO,
            headers={"Authorization": f"Bearer {access}"},
        )
        if info.status_code >= 400:
            # Fallback: decode id_token email claims if userinfo fails
            raise OAuthError("denied")
        data = info.json()

    email = (data.get("email") or data.get("preferred_username") or "").strip().lower()
    subject = str(data.get("sub") or "").strip()
    if not email or not subject:
        raise OAuthError("denied")
    return OAuthProfile(provider="microsoft", subject=subject, email=email)


def fetch_profile(provider: str, code: str) -> OAuthProfile:
    if provider == "google":
        return _token_and_profile_google(code)
    if provider == "microsoft":
        return _token_and_profile_microsoft(code)
    raise OAuthError("provider")


def resolve_user(db: Session, profile: OAuthProfile) -> User:
    identity = (
        db.query(OAuthIdentity)
        .filter(
            OAuthIdentity.provider == profile.provider,
            OAuthIdentity.subject == profile.subject,
        )
        .first()
    )
    if identity is not None:
        user = db.query(User).filter(User.id == identity.user_id).first()
        if user is None:
            raise OAuthError("no_account")
        if identity.email != profile.email:
            identity.email = profile.email
            db.commit()
        return user

    user = db.query(User).filter(sa_func.lower(User.email) == profile.email).first()
    if user is None:
        raise OAuthError("no_account")

    db.add(
        OAuthIdentity(
            user_id=user.id,
            provider=profile.provider,
            subject=profile.subject,
            email=profile.email,
        )
    )
    db.commit()
    return user
