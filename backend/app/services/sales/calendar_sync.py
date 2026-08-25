"""Per-user Google / Microsoft calendar: OAuth and CRM→calendar push."""
from __future__ import annotations

import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Optional
from urllib.parse import urlencode

import httpx
from sqlalchemy.orm import Session

from app.config import settings
from app.models.core.user import User
from app.models.sales.calendar import CalendarConnection
from app.models.sales.meeting import Meeting
from app.services.auth.oauth import (
    GOOGLE_AUTH,
    GOOGLE_TOKEN,
    GOOGLE_USERINFO,
    MICROSOFT_AUTH,
    MICROSOFT_TOKEN,
    PROVIDERS,
    OAuthError,
    provider_enabled,
    providers_status,
)
from app.services.sales.mailbox import GRAPH_ME, normalize_email
from app.utils.security import create_access_token, decode_access_token
from app.utils.totp_crypto import decrypt_secret, encrypt_secret

GOOGLE_CAL_SCOPE = "https://www.googleapis.com/auth/calendar.events openid email"
MICROSOFT_CAL_SCOPES = "Calendars.ReadWrite offline_access openid email"
GOOGLE_EVENTS = "https://www.googleapis.com/calendar/v3/calendars/primary/events"
GRAPH_EVENTS = "https://graph.microsoft.com/v1.0/me/events"


@dataclass(frozen=True)
class CalendarTokens:
    refresh_token: str
    access_token: str
    expires_in: int
    email: str


def calendar_redirect_uri(provider: str) -> str:
    base = (settings.PUBLIC_API_URL or "").rstrip("/")
    return f"{base}/api/calendar/oauth/{provider}/callback"


def make_calendar_state(provider: str, user_id: int) -> str:
    return create_access_token(
        data={"provider": provider, "nonce": secrets.token_urlsafe(16), "user_id": user_id},
        expires_delta=timedelta(minutes=10),
        audience="calendar_oauth_state",
    )


def parse_calendar_state(state: str, expected_provider: str) -> int:
    payload = decode_access_token(state, audience="calendar_oauth_state")
    if payload is None:
        raise OAuthError("denied")
    if payload.get("provider") != expected_provider:
        raise OAuthError("denied")
    user_id = payload.get("user_id")
    if not user_id:
        raise OAuthError("denied")
    return int(user_id)


def calendar_authorization_url(provider: str, user_id: int) -> str:
    if provider not in PROVIDERS:
        raise OAuthError("provider")
    if not provider_enabled(provider):
        raise OAuthError("provider")
    state = make_calendar_state(provider, user_id)
    if provider == "google":
        params = {
            "client_id": settings.GOOGLE_OAUTH_CLIENT_ID,
            "redirect_uri": calendar_redirect_uri(provider),
            "response_type": "code",
            "scope": GOOGLE_CAL_SCOPE,
            "state": state,
            "access_type": "offline",
            "prompt": "consent",
        }
        return f"{GOOGLE_AUTH}?{urlencode(params)}"
    tenant = settings.MICROSOFT_OAUTH_TENANT or "common"
    params = {
        "client_id": settings.MICROSOFT_OAUTH_CLIENT_ID,
        "redirect_uri": calendar_redirect_uri(provider),
        "response_type": "code",
        "scope": MICROSOFT_CAL_SCOPES,
        "state": state,
        "response_mode": "query",
    }
    return f"{MICROSOFT_AUTH.format(tenant=tenant)}?{urlencode(params)}"


def _google_tokens(code: str) -> CalendarTokens:
    with httpx.Client(timeout=20.0) as client:
        token_res = client.post(
            GOOGLE_TOKEN,
            data={
                "code": code,
                "client_id": settings.GOOGLE_OAUTH_CLIENT_ID,
                "client_secret": settings.GOOGLE_OAUTH_CLIENT_SECRET,
                "redirect_uri": calendar_redirect_uri("google"),
                "grant_type": "authorization_code",
            },
        )
        if token_res.status_code >= 400:
            raise OAuthError("denied")
        data = token_res.json()
        access = data.get("access_token")
        refresh = data.get("refresh_token")
        if not access or not refresh:
            raise OAuthError("denied")
        info = client.get(GOOGLE_USERINFO, headers={"Authorization": f"Bearer {access}"})
        if info.status_code >= 400:
            raise OAuthError("denied")
        email = normalize_email(info.json().get("email"))
        if not email:
            raise OAuthError("denied")
        return CalendarTokens(
            refresh_token=refresh,
            access_token=access,
            expires_in=int(data.get("expires_in") or 3600),
            email=email,
        )


def _microsoft_tokens(code: str) -> CalendarTokens:
    tenant = settings.MICROSOFT_OAUTH_TENANT or "common"
    with httpx.Client(timeout=20.0) as client:
        token_res = client.post(
            MICROSOFT_TOKEN.format(tenant=tenant),
            data={
                "code": code,
                "client_id": settings.MICROSOFT_OAUTH_CLIENT_ID,
                "client_secret": settings.MICROSOFT_OAUTH_CLIENT_SECRET,
                "redirect_uri": calendar_redirect_uri("microsoft"),
                "grant_type": "authorization_code",
            },
        )
        if token_res.status_code >= 400:
            raise OAuthError("denied")
        data = token_res.json()
        access = data.get("access_token")
        refresh = data.get("refresh_token")
        if not access or not refresh:
            raise OAuthError("denied")
        me = client.get(
            GRAPH_ME,
            params={"$select": "mail,userPrincipalName"},
            headers={"Authorization": f"Bearer {access}"},
        )
        if me.status_code >= 400:
            raise OAuthError("denied")
        profile = me.json()
        email = normalize_email(profile.get("mail") or profile.get("userPrincipalName"))
        if not email:
            raise OAuthError("denied")
        return CalendarTokens(
            refresh_token=refresh,
            access_token=access,
            expires_in=int(data.get("expires_in") or 3600),
            email=email,
        )


def exchange_calendar_code(provider: str, code: str) -> CalendarTokens:
    if provider == "google":
        return _google_tokens(code)
    if provider == "microsoft":
        return _microsoft_tokens(code)
    raise OAuthError("provider")


def upsert_calendar_connection(
    db: Session, *, user_id: int, company_id: int, provider: str, tokens: CalendarTokens
) -> CalendarConnection:
    expires = datetime.now(timezone.utc) + timedelta(seconds=max(tokens.expires_in - 60, 0))
    row = db.query(CalendarConnection).filter(CalendarConnection.user_id == user_id).first()
    if row is None:
        row = CalendarConnection(user_id=user_id, company_id=company_id)
        db.add(row)
    row.company_id = company_id
    row.provider = provider
    row.email = tokens.email
    row.refresh_token_encrypted = encrypt_secret(tokens.refresh_token)
    row.access_token_encrypted = encrypt_secret(tokens.access_token)
    row.access_token_expires_at = expires
    row.status = "active"
    row.error_message = None
    db.commit()
    db.refresh(row)
    return row


def serialize_calendar(row: Optional[CalendarConnection]) -> dict:
    return {
        "connected": row is not None,
        "provider": row.provider if row else None,
        "email": row.email if row else None,
        "status": row.status if row else None,
        "providers": providers_status(),
    }


def get_user_calendar(db: Session, user_id: int) -> Optional[CalendarConnection]:
    return db.query(CalendarConnection).filter(CalendarConnection.user_id == user_id).first()


def delete_user_calendar(db: Session, user_id: int) -> None:
    row = get_user_calendar(db, user_id)
    if row is None:
        return
    db.delete(row)
    db.commit()


def _refresh_access_token(connection: CalendarConnection) -> str:
    refresh = decrypt_secret(connection.refresh_token_encrypted)
    if connection.provider == "google":
        with httpx.Client(timeout=20.0) as client:
            res = client.post(
                GOOGLE_TOKEN,
                data={
                    "client_id": settings.GOOGLE_OAUTH_CLIENT_ID,
                    "client_secret": settings.GOOGLE_OAUTH_CLIENT_SECRET,
                    "refresh_token": refresh,
                    "grant_type": "refresh_token",
                },
            )
        if res.status_code >= 400:
            raise OAuthError("denied")
        access = res.json().get("access_token")
        if not access:
            raise OAuthError("denied")
        return access
    tenant = settings.MICROSOFT_OAUTH_TENANT or "common"
    with httpx.Client(timeout=20.0) as client:
        res = client.post(
            MICROSOFT_TOKEN.format(tenant=tenant),
            data={
                "client_id": settings.MICROSOFT_OAUTH_CLIENT_ID,
                "client_secret": settings.MICROSOFT_OAUTH_CLIENT_SECRET,
                "refresh_token": refresh,
                "grant_type": "refresh_token",
            },
        )
    if res.status_code >= 400:
        raise OAuthError("denied")
    access = res.json().get("access_token")
    if not access:
        raise OAuthError("denied")
    return access


def access_token_for(db: Session, connection: CalendarConnection) -> str:
    now = datetime.now(timezone.utc)
    expires = connection.access_token_expires_at
    if expires is not None and expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if connection.access_token_encrypted and expires and expires > now:
        return decrypt_secret(connection.access_token_encrypted)
    access = _refresh_access_token(connection)
    connection.access_token_encrypted = encrypt_secret(access)
    connection.access_token_expires_at = now + timedelta(minutes=50)
    connection.status = "active"
    connection.error_message = None
    db.commit()
    return access


def _aware(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def meeting_time_range(meeting: Meeting) -> tuple[datetime, datetime]:
    start = _aware(meeting.starts_at)
    if meeting.ends_at is not None:
        end = _aware(meeting.ends_at)
    else:
        end = start + timedelta(hours=1)
    return start, end


def _google_body(meeting: Meeting) -> dict:
    start, end = meeting_time_range(meeting)
    body = {
        "summary": meeting.subject,
        "start": {"dateTime": start.strftime("%Y-%m-%dT%H:%M:%SZ"), "timeZone": "UTC"},
        "end": {"dateTime": end.strftime("%Y-%m-%dT%H:%M:%SZ"), "timeZone": "UTC"},
    }
    if meeting.location:
        body["location"] = meeting.location
    if meeting.notes:
        body["description"] = meeting.notes
    return body


def _graph_body(meeting: Meeting) -> dict:
    start, end = meeting_time_range(meeting)
    fmt = "%Y-%m-%dT%H:%M:%S"
    body = {
        "subject": meeting.subject,
        "start": {"dateTime": start.strftime(fmt), "timeZone": "UTC"},
        "end": {"dateTime": end.strftime(fmt), "timeZone": "UTC"},
    }
    if meeting.location:
        body["location"] = {"displayName": meeting.location}
    if meeting.notes:
        body["body"] = {"contentType": "text", "content": meeting.notes}
    return body


def create_calendar_event(connection: CalendarConnection, meeting: Meeting, db: Optional[Session] = None) -> str:
    access = access_token_for(db, connection) if db is not None else decrypt_secret(connection.access_token_encrypted)
    headers = {"Authorization": f"Bearer {access}"}
    with httpx.Client(timeout=20.0) as client:
        if connection.provider == "google":
            res = client.post(GOOGLE_EVENTS, json=_google_body(meeting), headers=headers)
            if res.status_code >= 400:
                raise RuntimeError("google calendar create failed")
            return str(res.json().get("id") or "")
        res = client.post(GRAPH_EVENTS, json=_graph_body(meeting), headers=headers)
        if res.status_code >= 400:
            raise RuntimeError("graph calendar create failed")
        return str(res.json().get("id") or "")


def update_calendar_event(connection: CalendarConnection, meeting: Meeting, db: Optional[Session] = None) -> None:
    access = access_token_for(db, connection) if db is not None else decrypt_secret(connection.access_token_encrypted)
    headers = {"Authorization": f"Bearer {access}"}
    event_id = meeting.calendar_event_id
    with httpx.Client(timeout=20.0) as client:
        if connection.provider == "google":
            res = client.patch(f"{GOOGLE_EVENTS}/{event_id}", json=_google_body(meeting), headers=headers)
        else:
            res = client.patch(f"{GRAPH_EVENTS}/{event_id}", json=_graph_body(meeting), headers=headers)
    if res.status_code >= 400:
        raise RuntimeError("calendar update failed")


def delete_calendar_event(
    connection: CalendarConnection, event_id: str, db: Optional[Session] = None
) -> None:
    access = access_token_for(db, connection) if db is not None else decrypt_secret(connection.access_token_encrypted)
    headers = {"Authorization": f"Bearer {access}"}
    with httpx.Client(timeout=20.0) as client:
        if connection.provider == "google":
            res = client.delete(f"{GOOGLE_EVENTS}/{event_id}", headers=headers)
        else:
            res = client.delete(f"{GRAPH_EVENTS}/{event_id}", headers=headers)
    if res.status_code >= 400 and res.status_code != 404:
        raise RuntimeError("calendar delete failed")


def _status_value(meeting: Meeting) -> str:
    status_val = meeting.status
    if hasattr(status_val, "value"):
        status_val = status_val.value
    return str(status_val or "")


def sync_meeting_outbound(db: Session, user: User, meeting: Meeting, *, deleted: bool = False) -> None:
    connection = get_user_calendar(db, user.id)
    if connection is None or connection.company_id != user.company_id:
        return
    if connection.status != "active":
        return
    try:
        cancelled = _status_value(meeting) == "cancelled"
        if deleted or cancelled:
            if meeting.calendar_event_id:
                delete_calendar_event(connection, meeting.calendar_event_id, db=db)
            meeting.calendar_event_id = None
            meeting.calendar_provider = None
        elif meeting.calendar_event_id:
            update_calendar_event(connection, meeting, db=db)
        else:
            event_id = create_calendar_event(connection, meeting, db=db)
            meeting.calendar_event_id = event_id or None
            meeting.calendar_provider = connection.provider if event_id else None
        db.commit()
    except Exception as exc:  # noqa: BLE001 — CRM write already succeeded
        connection.status = "error"
        connection.error_message = str(exc)[:500]
        db.commit()
