# Phase 7.2 — Meeting booking + inbound calendar (design)

> Companion to [IMPLEMENTATION_PLAN.md](../../IMPLEMENTATION_PLAN.md) Phase 7.2,
> [2026-08-26-phase7-trial-defense-design.md](./2026-08-26-phase7-trial-defense-design.md) item 7.2,
> and [2026-08-25-phase6-calendar-sync-design.md](./2026-08-25-phase6-calendar-sync-design.md)
> (which shipped **CRM → calendar only** and left inbound as a residual).
> Grounded in the code as of 26 Aug 2026: `meetings`, `calendar_connections`,
> `app/services/sales/calendar_sync.py`, `/api/public/*`.

## Problem

Two gaps, both first-week trial gaps.

1. **No booking link.** A prospect who wants a site visit has to email and wait.
   HubSpot Free hands a rep a meetings link on day one. We have public lead forms
   (`/f/{slug}`) and web-to-case (`/c/{slug}`) but nothing that produces a
   `meetings` row.
2. **Calendar sync is one-way.** 6.2 pushes CRM meetings out to Google/Outlook
   and explicitly declined to pull. A rep whose day is planned in Google sees an
   empty CRM calendar, so the CRM looks wrong on the first day of the trial.

## Decisions (locked)

1. **Booking config lives on `company_settings`**, not a new table — one booking
   page per company, exactly like the WhatsApp / Exotel / retention settings that
   already sit there. Two columns: `booking_slug` and `booking_host_user_id`.
   Public page is **live when both are set**; clearing the slug takes it down.
   No separate `booking_enabled` flag to drift out of sync with them.
2. **Admin or MD configures it** (`require_admin_or_md`, same gate as
   `PATCH /api/cases/form`). Any authenticated member may *read* the config so the
   settings screen can show the link. The host must be an **active user in the
   same company**; a foreign or disabled `host_user_id` is `400`, never silently
   dropped, because the host is who the meeting gets attributed to.
3. **Slug is caller-chosen and validated**, not a random token like web-to-case.
   A booking link is pasted into email signatures, so it has to be readable:
   `^[a-z0-9][a-z0-9-]{2,63}$`, lowercased on write. Uniqueness is enforced by a
   service-level check across companies (`400` on conflict), not a DB constraint —
   `schema_sync.add_missing_columns` can only `ALTER TABLE … ADD COLUMN`, so a
   `UNIQUE` index would exist on fresh installs and be missing on upgraded ones,
   which is worse than one honest check. Two companies claiming the same slug in
   the same millisecond is an accepted race; the resolver takes the lowest id.
4. **Public booking is unauthenticated, under `/api/public/book`.** That prefix is
   already inside `tenancy._PUBLIC_PREFIXES`, so the RLS middleware binds bypass
   without touching `tenancy.py`. `GET` returns page metadata, `POST …/submit`
   creates the meeting — same two-route shape and same `/submit` suffix as
   `/api/public/forms/{slug}` and `/api/public/cases/{slug}`.
5. **A booking that cannot be attributed is a 404, not a 500.** Unknown slug,
   slug with no host, host no longer in the company, or a company that is
   suspended / past its trial end (`cases.company_accepts_public`, reused) all
   return the same `404 Booking page not found`. A distinct error per cause would
   let anyone enumerate which companies exist.
6. **Guest supplies name, email, `starts_at`; everything else is derived.**
   `ends_at` defaults to `starts_at + 60 minutes` (same duration default as 6.2's
   push). `created_by_id` = the configured host. `subject` = `Meeting with {name}`.
   The guest's name and email land in `notes` — no `guest_name` / `guest_email`
   columns, because the only consumer is a human reading the meeting.
7. **`lead_id` is set only on an exact in-company email match** (case-insensitive,
   soft-deleted leads excluded). No lead is created: a public booking page is not
   a lead form, and minting a lead per booking would double-count against the one
   the form already captured.
8. **Past bookings are rejected** (`starts_at` at or before now → `400`). A
   booking page that accepts yesterday is a bug, and validating at the boundary is
   cheaper than a rep discovering it in the meetings list.
9. **Honeypot + rate limit, same as the sibling public forms.** A non-empty
   `website` field returns `{"ok": true}` and writes nothing; `public_form_limiter`
   allows 10 posts per slug per IP per 600 s. Identical numbers to lead forms and
   web-to-case so one bot budget covers all three.
10. **After a successful book, reuse the 6.2 push.** `sync_meeting_outbound(db,
    host, meeting)` runs for the host, which is already a no-op when the host has
    no active `calendar_connection` and already swallows provider failures into
    `connection.status = "error"`. **A calendar API failure must not fail the
    booking** — the CRM row is the deliverable.
11. **Inbound is a pull on demand, not a webhook.** `POST /api/calendar/sync`
    (JWT) reads the caller's own connected calendar over a fixed window of **now
    to now + 14 days**. No cron, no Google watch channels, no incremental sync
    tokens in v0.
12. **Inbound upserts by `(company_id, calendar_event_id)`.** Existing row →
    subject / start / end / location / conference URL are overwritten from the
    provider. New row → `created_by_id` = the syncing user, `status = scheduled`,
    `calendar_provider` = the connection's provider.
13. **Inbound never deletes.** An event that disappeared from the provider leaves
    its CRM meeting alone (v0). Deleting CRM rows from a provider read is how a
    partial API response destroys data, and 6.2 already declares the CRM the
    source of truth.
14. **Conference URL is stored only when the provider hands one over.**
    `meetings.conference_url`, filled from Google `hangoutLink` or a
    `conferenceData` video entry point, or Graph `onlineMeeting.joinUrl` /
    `onlineMeetingUrl`. Must be `http(s)` and ≤ 500 chars or it is dropped. We
    never synthesise a Meet/Teams link.
15. **Disconnected or errored calendar → `400` with a clear message; provider
    rejection → `502`. Never a fake event.** The `400`/`502` split is deliberate:
    `400` means "you have not connected a calendar", which the caller fixes;
    `502` means "Google/Microsoft said no", which they cannot.
16. **Alembic `028_booking_calendar` off `027_email_tracking`**, same
    `apply_schema` body as 024–027. One head.
17. **No new pip deps.** `httpx` (already used by 6.2), stdlib `re` / `secrets`.
    Provider HTTP is mocked in tests; no live Google or Microsoft call.

## Non-goals

Availability rules (working hours, buffers, per-day caps, timezone picker),
round-robin or team booking pages, reschedule / cancel links for the guest,
confirmation email or ICS attachment to the guest, double-booking detection,
webhook or cron-driven inbound sync, incremental sync tokens, attendee lists,
recurring-event expansion beyond what the provider already flattens, all-day
event import, deleting CRM meetings when a provider event vanishes, two-way
conflict resolution, and live agent chat (7.x item 4 of the phase spec: the
widget stays lead-capture, and nothing here claims chat).

**Not closed:** a guest can book any future slot the host has not blocked,
because v0 reads no availability. The host sees the meeting immediately in the
CRM and on their calendar (decision 10) and can cancel it, which is the same
posture 6.2 took toward conflicts. Closing this needs a free/busy query per
render, which is an availability feature, not a booking feature.

## Data

### `company_settings` — new columns

| column | type | note |
|---|---|---|
| `booking_slug` | String(64), nullable, indexed | lowercased, `^[a-z0-9][a-z0-9-]{2,63}$` |
| `booking_host_user_id` | Integer FK `users.id`, nullable | must be active and in-company |

### `meetings` — new column

| column | type | note |
|---|---|---|
| `conference_url` | String(500), nullable | provider-supplied Meet / Teams join link only |

Schema apply: three entries in `app/schema_sync.MISSING_COLUMNS` plus revision
`028_booking_calendar`. **No composite index** on
`(company_id, calendar_event_id)`: `create_all` skips tables that already exist,
so an index declared on the model would land on fresh installs and be absent on
upgraded ones. `meetings.company_id` is already indexed and the inbound upsert
looks up inside one company over a 14-day window, so the residual scan is small.
Noted as a residual, not hidden.

## Service — `app/services/sales/booking.py`

| function | contract |
|---|---|
| `normalize_slug(raw)` | lowercase + strip; `400` unless it matches the slug regex |
| `get_or_create_settings(db, company_id)` | the company's `company_settings` row, created if absent (same helper shape as `telephony._settings`) |
| `resolve_host(db, company_id, host_user_id)` | the `User`, or `400` if missing / foreign / inactive |
| `serialize_booking(row, host)` | `{slug, host_user_id, host_name, public_path, is_live}` |
| `set_booking_config(db, company_id, slug, host_user_id)` | validates both, rejects a slug held by another company, `None` slug clears the page |
| `public_booking(db, slug)` | `(settings, host, company)` or `404` (decision 5) |
| `book_meeting(db, settings, host, …)` | validates guest input, matches a lead by email, inserts the `Meeting`, returns it |

`book_meeting` does not push to the calendar itself; the router calls
`sync_meeting_outbound` after the commit so a provider timeout cannot roll the
booking back.

## Service — inbound, in `app/services/sales/calendar_sync.py`

Inbound lives beside the outbound push because it shares the connection, the
token refresh, and the provider constants.

| function | contract |
|---|---|
| `INBOUND_WINDOW_DAYS` | `14` |
| `inbound_window(now)` | `(now, now + 14 days)`, both aware UTC |
| `parse_provider_datetime(raw)` | provider ISO string → naive UTC; tolerates `Z` and 7-digit fractional seconds (Graph emits 7; `fromisoformat` is strict below Python 3.11) |
| `google_conference_url(ev)` / `graph_conference_url(ev)` | `http(s)` join link ≤ 500 chars, else `None` |
| `normalize_google_event(ev)` / `normalize_graph_event(ev)` | `InboundEvent` or `None` (missing id, cancelled, all-day, unparseable start) |
| `fetch_inbound_events(db, connection)` | provider list call inside the window; `RuntimeError` on a `>=400` response |
| `sync_calendar_inbound(db, user)` | `{created, updated, skipped, window_start, window_end}` |

Provider list calls: Google
`GET /calendar/v3/calendars/primary/events?timeMin&timeMax&singleEvents=true&orderBy=startTime&maxResults=250`
(`singleEvents` flattens recurrence into real instances, so no expansion code
here), Graph
`GET /me/calendarView?startDateTime&endDateTime&$top=250` (calendar view, not
`/events`, because `/events` returns recurrence masters instead of instances).

`sync_calendar_inbound` raises `HTTPException(400)` when the caller has no
connection, when the connection belongs to another company, or when its status is
not `active`; `HTTPException(502)` when the provider call fails, after marking
`connection.status = "error"`.

## Endpoints

| method | path | auth | behaviour |
|---|---|---|---|
| GET | `/api/meetings/booking` | JWT | current `{slug, host_user_id, host_name, public_path, is_live}` |
| PATCH | `/api/meetings/booking` | JWT admin/MD | set or clear `slug` / `host_user_id`; `400` on a bad slug, a taken slug, or a foreign host |
| GET | `/api/public/book/{slug}` | none | `{company_name, host_name, headline, duration_minutes: 60}` or `404` |
| POST | `/api/public/book/{slug}/submit` | none | `201 {ok, meeting_id, starts_at, ends_at}`; honeypot → `{ok: true}` with no write; rate limited 10 / 600 s per slug per IP |
| POST | `/api/calendar/sync` | JWT | pull now → +14 d, upsert, `{created, updated, skipped, window_start, window_end}`; `400` disconnected, `502` provider failure |

`/api/meetings/booking` is safe beside the existing `/{meeting_id:int}` routes
because those use the `int` path converter, so `booking` cannot match them.

`_serialize` in `app/routers/sales/meetings.py` gains `conference_url`.

## Cross-tenant

- **Booking.** The public routes resolve a company *from the slug only*; there is
  no caller identity to spoof. Company B posting to A's slug creates a meeting in
  **A** (that is the point of a public page) and B still cannot read it —
  `GET /api/meetings/{id}` stays on `apply_company_scope` + `ensure_company_access`,
  so B gets `404` for A's meeting id. B cannot make A's page create rows in B.
  A slug that does not exist is `404` for everyone, so B cannot enumerate A.
- **Config.** `PATCH /api/meetings/booking` writes only
  `current_user.company_id`'s settings row and refuses a `host_user_id` outside
  that company (`400`).
- **Inbound.** `sync_calendar_inbound` looks the connection up by
  `current_user.id` and asserts `connection.company_id == current_user.company_id`;
  the upsert filters `Meeting.company_id == current_user.company_id`. There is no
  request field that names another tenant's connection or calendar, so B cannot
  sync A's calendar, and an event id that collides with A's produces a **new row
  in B**, never a write into A's.
- Postgres RLS still fences `meetings` and `company_settings` for authenticated
  sessions; the public routes run under the existing `/api/public` bypass.

## Tests — `backend/tests/sales/test_booking_calendar.py`

1. Config round-trip: `PATCH` then `GET` returns the slug, the host, and
   `is_live`; a non-admin `PATCH` is `403`.
2. Slug validation: `Bad Slug`, `ab`, and a 65-char slug are `400`; a slug already
   held by another company is `400`; a foreign or disabled `host_user_id` is `400`.
3. Public `GET` returns the company and host name for a live slug; `404` for an
   unknown slug, a slug with no host, and a company past its trial end.
4. Public `POST` creates the meeting: `created_by_id` is the host, `ends_at` is
   `starts_at + 60 min` when omitted, guest name and email are in `notes`, and the
   meeting is visible to the host through `GET /api/meetings`.
5. Explicit `ends_at` is honoured; `ends_at <= starts_at` is `400`; a past
   `starts_at` is `400`; a missing name or email is `400`.
6. `lead_id` is set when a lead in that company has the guest's email
   (case-insensitive), and left `NULL` when the only matching lead is in another
   company.
7. Honeypot post writes nothing; the 11th post inside the window is `429`.
8. A successful book pushes to the host's calendar (mocked `create_calendar_event`)
   and a mocked provider failure still returns `201`.
9. Inbound: mocked Google list creates two meetings with subject, start, end,
   location, and `conference_url` from `hangoutLink`; re-running the same payload
   updates in place (`created == 0`, `updated == 2`, no duplicate rows).
10. Inbound Graph: `onlineMeeting.joinUrl` becomes `conference_url`; a 7-digit
    fractional `dateTime` parses; `isCancelled` and `isAllDay` events are skipped.
11. Inbound with no connection is `400`, with an errored connection is `400`, and
    a mocked `>=400` provider response is `502` — and no meeting row is written in
    any of the three.
12. Inbound does not delete: a meeting whose event id is absent from the second
    response survives.
13. Cross-tenant: B `PATCH`ing a host from A is `400`; B's sync never touches A's
    meetings even when the event ids collide; B reading A's booked meeting id is
    `404`; positive control — A's host reads it `200`.
14. `tests/ops/test_alembic_heads.py` still sees exactly one head, now
    `028_booking_calendar`, with `down_revision == "027_email_tracking"`.

## Frontend

- `frontend/app/book/[slug]/page.jsx` — public booking page, same shape as
  `app/c/[slug]/page.jsx`: `GET` for metadata, four states (loading / error /
  form / success), honeypot `website` input, `datetime-local` converted to ISO
  with `toISOString()` before posting. No copy that implies a live agent.
- `frontend/app/settings/calendar/page.jsx` — a booking-link block (slug + host
  select, admin/MD only) and a **Pull events from calendar** button hitting
  `POST /api/calendar/sync`, so the feature is reachable without curl.

## Deploy

`alembic upgrade head` (or `create_missing_tables.py`) for the three columns.

Booking needs no credentials: the page goes live the moment an admin sets a slug
and a host. `FRONTEND_URL` must be the public site origin for the copyable link
to be right. Inbound sync needs the same Google/Microsoft OAuth client
credentials 6.2 already documents, plus a per-user connect — without one,
`POST /api/calendar/sync` answers `400`.

## Residuals

Availability rules and timezone display, guest confirmation email / ICS,
reschedule and cancel links, round-robin hosts, scheduled or webhook-driven
inbound sync, all-day event import, delete-on-vanish, attendees, and a composite
`(company_id, calendar_event_id)` index for installs that upgrade rather than
create.
