# Phase 7.2 — Meeting booking + inbound calendar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.
> Written before the code and kept as the record of order and scope.

**Goal:** A trial user hands a prospect a public link that books a site visit,
and pulls their real Google/Outlook week into the CRM. Closes the HubSpot
meetings wedge and the 6.2 inbound residual.

**Architecture:** Booking config is two columns on `company_settings`
(`booking_slug`, `booking_host_user_id`), so one company has one booking page and
no new table. Two unauthenticated routes under `/api/public/book` resolve the
company from the slug and insert a `meetings` row attributed to the configured
host, then reuse 6.2's `sync_meeting_outbound` to push it to the host's calendar.
Inbound is a JWT-only on-demand pull (`POST /api/calendar/sync`) over a fixed
now → +14 day window, upserting by `(company_id, calendar_event_id)` and never
deleting.

**Tech Stack:** FastAPI, SQLAlchemy, Alembic (`028_booking_calendar` off
`027_email_tracking`), `httpx` (already a 6.2 dependency), stdlib `re`. Next.js
app-router page for `/book/[slug]`. No new pip deps.

**Spec:** [docs/superpowers/specs/2026-08-26-phase7-booking-calendar-design.md](../specs/2026-08-26-phase7-booking-calendar-design.md)

## Global Constraints

- No new pip deps. No live Google/Microsoft call in tests — provider HTTP mocked.
- No secrets in git.
- Calendar failure never fails a booking; the CRM row is the deliverable.
- Inbound never deletes a CRM meeting and never invents an event.
- Disconnected calendar → `400` with a clear message; provider rejection → `502`.
- One Alembic head must survive (`tests/ops/test_alembic_heads.py`).
- pytest from `backend/`: `/home/nullbytez/Music/Company/CRM-/backend/venv/bin/python -m pytest`.
- 7.3–7.12 stay untouched.

---

### Task 1: Spec

- [ ] **Step 1** Write `docs/superpowers/specs/2026-08-26-phase7-booking-calendar-design.md`
      — locks the settings-column choice, the 404-on-everything resolver, the
      60-minute default, the upsert key, no-delete, and the 400/502 split.

---

### Task 2: RED — tests before implementation

**Files:** create `backend/tests/sales/test_booking_calendar.py`; modify
`backend/tests/ops/test_alembic_heads.py`.

- [ ] **Step 1** Config round-trip, admin/MD gate, slug and host validation.
- [ ] **Step 2** Public `GET` metadata / `404` cases; public `POST` creating the
      meeting with host attribution, 60-minute default, notes, lead match,
      honeypot, rate limit, and calendar push (mocked, including failure).
- [ ] **Step 3** Inbound Google and Graph normalisation, upsert-in-place,
      no-delete, `400` disconnected / errored, `502` provider failure.
- [ ] **Step 4** Cross-tenant: foreign host `400`, colliding event ids stay in
      their own company, B reading A's booked meeting `404`, host positive control.
- [ ] **Step 5** Move the expected Alembic head to `028_booking_calendar`.
- [ ] **Step 6** Confirm RED and record the failure text.

---

### Task 3: GREEN — data

**Files:** `backend/app/models/core/company_settings.py`,
`backend/app/models/sales/meeting.py`, `backend/app/schema_sync.py`,
create `backend/alembic/versions/028_booking_calendar.py`.

- [ ] **Step 1** `company_settings.booking_slug` (String(64), indexed) and
      `booking_host_user_id` (Integer FK `users.id`); `meetings.conference_url`
      (String(500)).
- [ ] **Step 2** Three `MISSING_COLUMNS` entries and revision
      `028_booking_calendar` with the same `apply_schema` body as 024–027.

---

### Task 4: GREEN — booking service and routes

**Files:** create `backend/app/services/sales/booking.py`,
`backend/app/routers/public/booking.py`; modify
`backend/app/routers/sales/meetings.py`, `backend/app/main.py`.

- [ ] **Step 1** `normalize_slug`, `get_or_create_settings`, `resolve_host`,
      `serialize_booking`, `set_booking_config`, `public_booking`, `book_meeting`.
- [ ] **Step 2** `GET` / `PATCH /api/meetings/booking` (read = any member,
      write = `require_admin_or_md`); `conference_url` added to `_serialize`.
- [ ] **Step 3** `GET /api/public/book/{slug}` and
      `POST /api/public/book/{slug}/submit` with honeypot and
      `public_form_limiter` (10 / 600 s), then `sync_meeting_outbound` for the
      host *after* the commit.
- [ ] **Step 4** Mount the public router under `/api/public/book`.

---

### Task 5: GREEN — inbound pull

**Files:** modify `backend/app/services/sales/calendar_sync.py`,
`backend/app/routers/sales/calendar.py`.

- [ ] **Step 1** `parse_provider_datetime` (tolerates `Z` and 7-digit fractional
      seconds), `inbound_window`, the two conference-URL readers, the two event
      normalisers, `fetch_inbound_events` (Google `events?singleEvents=true`,
      Graph `calendarView`).
- [ ] **Step 2** `sync_calendar_inbound`: upsert by
      `(company_id, calendar_event_id)`, never delete, `400` when disconnected /
      foreign / errored, `502` after marking the connection errored.
- [ ] **Step 3** `POST /api/calendar/sync`.

---

### Task 6: Frontend

**Files:** create `frontend/app/book/[slug]/page.jsx`; modify
`frontend/app/settings/calendar/page.jsx`.

- [ ] **Step 1** Public page: loading / error / form / success, honeypot,
      `datetime-local` → `toISOString()`, labelled inputs, no live-chat copy.
- [ ] **Step 2** Settings: booking slug + host select (admin/MD) and a
      **Pull events from calendar** button on `POST /api/calendar/sync`.

---

### Task 7: Verify and document

- [ ] **Step 1** Full backend suite green, no regression in
      `test_calendar_sync.py`, `test_meetings_calls_api.py`, cases, lead forms.
- [ ] **Step 2** `IMPLEMENTATION_PLAN.md` 7.2 → DONE (code), resume pointer → 7.3.
- [ ] **Step 3** Task report with the RED/GREEN transcript.

---

## Self-review (plan vs spec)

| Spec decision | Plan step | Test |
|---|---|---|
| Config on `company_settings`, live when both set | T3 S1, T4 S1–2 | config round-trip |
| Admin/MD writes, member reads | T4 S2 | non-admin `PATCH` 403 |
| Readable validated slug, unique across companies | T4 S1 | slug validation, taken slug |
| Public routes under `/api/public/book` (RLS bypass already covers it) | T4 S3–4 | all public route tests |
| Unknown / hostless / expired → same 404 | T4 S1 | public `GET` 404 cases |
| 60-minute default, host attribution, guest in notes | T4 S1 | public `POST` creation |
| Lead match by email, no lead created | T4 S1 | lead match / foreign-lead |
| Past `starts_at` rejected | T4 S1 | past-start 400 |
| Honeypot + 10/600 s limit | T4 S3 | honeypot, 429 |
| Reuse 6.2 push, failure does not fail the book | T4 S3 | mocked push + mocked failure |
| Inbound pull, now → +14 d, JWT only | T5 S1–3 | inbound Google/Graph |
| Upsert by `(company_id, calendar_event_id)` | T5 S2 | re-run updates in place |
| Never delete | T5 S2 | vanished event survives |
| Conference URL only when provided | T5 S1 | `hangoutLink`, `joinUrl` |
| 400 disconnected / 502 provider, never fake | T5 S2 | three no-write cases |
| One head, `028_booking_calendar` | T3 S2 | `test_alembic_heads.py` |
| Cross-tenant closed on config, sync, and read | T4 S1, T5 S2 | cross-tenant tests |
