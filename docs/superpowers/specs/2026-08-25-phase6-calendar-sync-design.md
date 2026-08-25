# Phase 6.2 — Google / Microsoft Calendar sync (design)

> Companion to [IMPLEMENTATION_PLAN.md](../../IMPLEMENTATION_PLAN.md) Phase 6.2
> and Phase 3.2 meetings. Grounded in the code as of 25 Aug 2026.
> **CRM → calendar only.** No import of Google/Outlook events into the CRM.

## Problem

Meetings live only in the CRM. Site visits disappear from the salesperson’s real
calendar (Google / Outlook), which is where they actually plan the day.

## Decisions (locked)

1. **Per-user calendar connection** — `calendar_connections.user_id` unique. Separate from mailbox OAuth so mail users are not forced to re-consent.
2. **Same env client IDs** as SSO/mailbox. Distinct redirect `{PUBLIC_API_URL}/api/calendar/oauth/{google|microsoft}/callback`.
3. **Push on CRM mutate** — create → insert event; update → patch event; cancel or delete → delete event. If `ends_at` is missing, duration is **60 minutes**.
4. **CRM is source of truth** — calendar API failure does **not** fail the meeting request. Event id stored when push succeeds.
5. **No inbound sync** in v0 (no pull, no webhook).
6. **No Alembic / no new pip deps.** Table via `create_all`. `meetings.calendar_event_id` / `calendar_provider` via `_MISSING_COLUMNS`. Fernet via `totp_crypto`.

## Non-goals

Two-way sync, attendees, conference links, reminders, shared calendars, mailbox scope reuse, calendar-as-source-of-truth.

## Data

### `calendar_connections`

Same shape as `mailbox_connections` (no `last_synced_at`): company_id, unique user_id, provider, email, encrypted tokens, expires_at, status, error_message.

### `meetings` columns

| column | type |
|---|---|
| calendar_event_id | String(255), nullable |
| calendar_provider | String(32), nullable |

## OAuth

| provider | scopes |
|---|---|
| google | `https://www.googleapis.com/auth/calendar.events` `openid` `email` (`offline` + `consent`) |
| microsoft | `Calendars.ReadWrite` `offline_access` `openid` `email` |

State JWT audience `calendar_oauth_state`: `{provider, nonce, user_id}`.

## APIs

| method | path | behaviour |
|---|---|---|
| GET | `/api/calendar` | `{ connected, provider, email, status, providers }` |
| GET | `/api/calendar/oauth/{provider}/start` | JWT, 302 |
| GET | `/api/calendar/oauth/{provider}/callback` | upsert; 302 `/settings/calendar?calendar=success\|calendar_error=` |
| DELETE | `/api/calendar` | 204 |

Meeting serialize adds `calendar_event_id` and `calendar_synced` (bool).

## Testing

Status/start/callback (encrypted refresh). Create meeting with mocked calendar create stores id. Patch calls update. Delete calls delete. Create without connection does not call provider. Existing meeting tests still pass.

## Residuals

Inbound sync, attendees, Google Meet / Teams links.
