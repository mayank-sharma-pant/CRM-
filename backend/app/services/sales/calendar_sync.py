"""Per-user Google / Microsoft calendar: OAuth, CRM→calendar push, inbound pull."""
from __future__ import annotations

import re
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Optional
from urllib.parse import urlencode

import httpx
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.config import settings
from app.models.core.enums import MeetingStatus
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
GRAPH_CALENDAR_VIEW = "https://graph.microsoft.com/v1.0/me/calendarView"
INBOUND_WINDOW_DAYS = 14
INBOUND_MAX_EVENTS = 250


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


# ---------------------------------------------------------------------------
# Inbound: pull provider events into CRM meetings (7.2)
# ---------------------------------------------------------------------------

_FRACTION_RE = re.compile(r"(\.\d{1,})")


@dataclass(frozen=True)
class InboundEvent:
    event_id: str
    subject: str
    starts_at: datetime
    ends_at: datetime
    location: Optional[str]
    conference_url: Optional[str]


def inbound_window(now: Optional[datetime] = None) -> tuple[datetime, datetime]:
    start = now or datetime.now(timezone.utc)
    if start.tzinfo is None:
        start = start.replace(tzinfo=timezone.utc)
    else:
        start = start.astimezone(timezone.utc)
    return start, start + timedelta(days=INBOUND_WINDOW_DAYS)


def parse_provider_datetime(raw: Optional[str]) -> Optional[datetime]:
    """Provider ISO string → naive UTC. Graph emits 7 fractional digits, which
    `fromisoformat` rejects below Python 3.11, and `Z` which it rejects below 3.11."""
    if not raw:
        return None
    value = str(raw).strip()
    if not value:
        return None
    if value.endswith(("Z", "z")):
        value = value[:-1] + "+00:00"
    match = _FRACTION_RE.search(value)
    if match and len(match.group(1)) > 7:
        value = value[: match.start(1)] + match.group(1)[:7] + value[match.end(1):]
    try:
        parsed = datetime.fromisoformat(value)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        return parsed
    return parsed.astimezone(timezone.utc).replace(tzinfo=None)


def _clean_conference_url(raw: Optional[str]) -> Optional[str]:
    url = (raw or "").strip()
    if not url or len(url) > 500:
        return None
    if not url.lower().startswith(("http://", "https://")):
        return None
    return url


def google_conference_url(event: dict) -> Optional[str]:
    direct = _clean_conference_url(event.get("hangoutLink"))
    if direct:
        return direct
    conference = event.get("conferenceData") or {}
    for entry in conference.get("entryPoints") or []:
        if not isinstance(entry, dict):
            continue
        if entry.get("entryPointType") != "video":
            continue
        candidate = _clean_conference_url(entry.get("uri"))
        if candidate:
            return candidate
    return None


def graph_conference_url(event: dict) -> Optional[str]:
    online = event.get("onlineMeeting") or {}
    if isinstance(online, dict):
        candidate = _clean_conference_url(online.get("joinUrl"))
        if candidate:
            return candidate
    return _clean_conference_url(event.get("onlineMeetingUrl"))


def _subject_or_default(raw: Optional[str]) -> str:
    subject = (raw or "").strip() or "(No title)"
    return subject[:255]


def normalize_google_event(event: dict) -> Optional[InboundEvent]:
    if not isinstance(event, dict):
        return None
    event_id = str(event.get("id") or "").strip()
    if not event_id or event.get("status") == "cancelled":
        return None
    start_block = event.get("start") or {}
    end_block = event.get("end") or {}
    if not isinstance(start_block, dict) or not isinstance(end_block, dict):
        return None
    if start_block.get("date") and not start_block.get("dateTime"):
        return None  # all-day events are not meetings in v0
    start = parse_provider_datetime(start_block.get("dateTime"))
    if start is None:
        return None
    end = parse_provider_datetime(end_block.get("dateTime")) or start + timedelta(hours=1)
    loc_raw = event.get("location")
    if isinstance(loc_raw, dict):
        loc_raw = loc_raw.get("displayName")
    location = (loc_raw or "").strip() or None
    return InboundEvent(
        event_id=event_id,
        subject=_subject_or_default(event.get("summary")),
        starts_at=start,
        ends_at=end,
        location=location[:255] if location else None,
        conference_url=google_conference_url(event),
    )


def normalize_graph_event(event: dict) -> Optional[InboundEvent]:
    if not isinstance(event, dict):
        return None
    event_id = str(event.get("id") or "").strip()
    if not event_id or event.get("isCancelled") or event.get("isAllDay"):
        return None
    start_block = event.get("start") or {}
    end_block = event.get("end") or {}
    if not isinstance(start_block, dict) or not isinstance(end_block, dict):
        return None
    start = parse_provider_datetime(start_block.get("dateTime"))
    if start is None:
        return None
    end = parse_provider_datetime(end_block.get("dateTime")) or start + timedelta(hours=1)
    location_block = event.get("location") or {}
    location = None
    if isinstance(location_block, dict):
        location = (location_block.get("displayName") or "").strip() or None
    return InboundEvent(
        event_id=event_id,
        subject=_subject_or_default(event.get("subject")),
        starts_at=start,
        ends_at=end,
        location=location[:255] if location else None,
        conference_url=graph_conference_url(event),
    )


def provider_list_events(
    provider: str, access_token: str, window_start: datetime, window_end: datetime
) -> dict:
    """Raw provider response for the window. Raises RuntimeError on a >=400 reply."""
    headers = {"Authorization": f"Bearer {access_token}"}
    fmt = "%Y-%m-%dT%H:%M:%SZ"
    with httpx.Client(timeout=20.0) as client:
        if provider == "google":
            res = client.get(
                GOOGLE_EVENTS,
                params={
                    "timeMin": window_start.strftime(fmt),
                    "timeMax": window_end.strftime(fmt),
                    "singleEvents": "true",
                    "orderBy": "startTime",
                    "maxResults": INBOUND_MAX_EVENTS,
                },
                headers=headers,
            )
            if res.status_code >= 400:
                raise RuntimeError("google calendar list failed")
            return res.json()
        res = client.get(
            GRAPH_CALENDAR_VIEW,
            params={
                "startDateTime": window_start.strftime(fmt),
                "endDateTime": window_end.strftime(fmt),
                "$top": INBOUND_MAX_EVENTS,
            },
            headers=headers,
        )
        if res.status_code >= 400:
            raise RuntimeError("graph calendar list failed")
        return res.json()


def fetch_inbound_events(
    db: Session, connection: CalendarConnection, window_start: datetime, window_end: datetime
) -> tuple[list[InboundEvent], int]:
    """(usable events, skipped count). Raises RuntimeError if the provider refuses."""
    access = access_token_for(db, connection)
    payload = provider_list_events(connection.provider, access, window_start, window_end)
    if connection.provider == "google":
        raw = (payload or {}).get("items") or []
        normalize = normalize_google_event
    else:
        raw = (payload or {}).get("value") or []
        normalize = normalize_graph_event
    events: list[InboundEvent] = []
    skipped = 0
    for item in raw:
        normalized = normalize(item)
        if normalized is None:
            skipped += 1
            continue
        events.append(normalized)
    return events, skipped


def _require_inbound_connection(db: Session, user: User) -> CalendarConnection:
    connection = get_user_calendar(db, user.id)
    if connection is None or connection.company_id != user.company_id:
        raise HTTPException(
            status_code=400,
            detail="No calendar connected. Connect Google or Outlook calendar first.",
        )
    if connection.status != "active":
        raise HTTPException(
            status_code=400,
            detail="Calendar connection needs attention. Reconnect your calendar and try again.",
        )
    return connection


def sync_calendar_inbound(db: Session, user: User) -> dict:
    """Pull the caller's own calendar for the next 14 days and upsert CRM meetings.

    Upsert key is (company_id, calendar_event_id). Events that vanished from the
    provider are left alone — a partial provider read must not delete CRM rows.
    """
    connection = _require_inbound_connection(db, user)
    window_start, window_end = inbound_window()
    try:
        events, skipped = fetch_inbound_events(db, connection, window_start, window_end)
    except Exception as exc:  # noqa: BLE001 — surfaced as 502, never a fake event
        connection.status = "error"
        connection.error_message = str(exc)[:500]
        db.commit()
        raise HTTPException(
            status_code=502,
            detail="Calendar provider rejected the request. Reconnect your calendar and try again.",
        ) from exc

    created = 0
    updated = 0
    for event in events:
        meeting = (
            db.query(Meeting)
            .filter(
                Meeting.company_id == user.company_id,
                Meeting.calendar_event_id == event.event_id,
            )
            .first()
        )
        if meeting is None:
            meeting = Meeting(
                company_id=user.company_id,
                status=MeetingStatus.SCHEDULED.value,
                created_by_id=user.id,
                calendar_event_id=event.event_id,
            )
            db.add(meeting)
            created += 1
        else:
            updated += 1
        meeting.subject = event.subject
        meeting.starts_at = event.starts_at
        meeting.ends_at = event.ends_at
        meeting.location = event.location
        meeting.conference_url = event.conference_url
        meeting.calendar_provider = connection.provider
    db.commit()
    return {
        "created": created,
        "updated": updated,
        "skipped": skipped,
        "window_start": window_start.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "window_end": window_end.strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
