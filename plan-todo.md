# SMB Wedge — Dev Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship coding work so a small sales team can claim leads, talk on WhatsApp, book appointments, finish Day-0 setup, and get overdue/unanswered reminders — without enterprise/dealership features.

**Architecture:** Phase 1 executes `plan-next.md` (daily-ops trio + email templates). Phase 2 extends existing `/api/onboarding` + `OnboardingChecklist` for WhatsApp/invite/CSV. Phase 3 closes Flutter gaps for field sales. Phase 4 adds in-app digests from existing notification infra.

**Tech Stack:** FastAPI + SQLAlchemy 2 + pytest; Next.js 15 App Router + Tailwind Ledger Desk; Flutter; Playwright smoke.

**Spec:** This file. Detailed APIs/UI for Unassigned / Appointments / Conversations / email templates: **`plan-next.md`** (do not duplicate those steps here — execute that file).

## Global Constraints

- Coding only. No GTM, pricing, partner recruiting, or marketing copy tasks in this file.
- Roles for daily-ops pages: `sales`, `manager`, `md` only (`admin` / `purchase` as in `plan-next.md`).
- Conversations = WhatsApp threads only. No unified email+WhatsApp inbox.
- Do not add Meta Lead Ads, Google Sheets sync, Trust/SSN, PWA clone, calendar toggle, SSO, or dealership chrome (`plan-next.md` out-of-scope list).
- UI: Ledger Desk tokens; Hindi keys in `frontend/lib/i18n/hi.cjs` for new labels.
- Reuse existing patterns: role-prefixed re-exports, `apply_company_scope`, 404 cross-tenant, parameterized queries.
- Commits only when the human asks.

### Done when

| Deliverable | Evidence |
|---|---|
| Daily-ops trio live | sales/manager/md can use pool → WA thread → appointment |
| Day-0 onboarding SMB-aligned | checklist includes invite + WhatsApp; sample seed still works |
| Flutter field path | sales can open leads + follow-ups; claim/WA/appointments if APIs exist — fix blockers only |
| Digests | in-app notifications for unanswered WA / overdue meetings / unassigned count |

---

## Phase 1 — Daily-ops wedge (`plan-next.md`)

> Full file map, tests, and steps: **`plan-next.md`**. Track completion here; implement there.

### Task 1: Unassigned Pool

- [x] Execute `plan-next.md` Tasks 1–2 (API `unassigned` + UI on sales/manager/md).
- [x] Pytest `tests/sales/test_unassigned_pool.py` green; Playwright smoke for three roles.

### Task 2: Appointments

- [x] Execute `plan-next.md` Tasks 3–4 (meetings row-scope + `/meetings/summary` + Appointments UI).
- [x] List only (no calendar). Pytest + smoke green.

### Task 3: Conversations (WhatsApp inbox)

- [x] Execute `plan-next.md` Tasks 5–6 (`GET /whatsapp/threads` + Conversations UI).
- [x] Pytest + smoke green.

### Task 4: Email templates + cross-role QA

- [x] Execute `plan-next.md` Tasks 7–8.
- [x] Full pytest set listed in `plan-next.md` Task 8; purchase has no Unassigned/Appointments/Conversations nav.

**E2E demo (manual or browser):** unassigned lead → claim/assign → Conversations thread → New Appointment.

---

## Phase 2 — Day-0 onboarding (extend existing)

**Already exists:** `backend/app/routers/sales/onboarding.py`, `backend/app/services/sales/onboarding.py`, `frontend/components/onboarding/OnboardingChecklist.jsx`, `backend/tests/sales/test_onboarding.py`. Steps today: sample_data, import_csv, connect_email, create_form, send_quote.

**Change:** Align checklist with WhatsApp-first SMB setup. Prefer invite + WhatsApp over email/form/quote as primary steps.

### Task 5: Onboarding status API — SMB steps

**Files:**
- Modify: `backend/app/services/sales/onboarding.py`
- Modify: `backend/tests/sales/test_onboarding.py`
- Possibly: WhatsApp connection model/settings query (find existing WhatsApp settings model before coding)

**Interfaces:**
- Consumes: existing `CompanySettings`, leads, invites or team users, WhatsApp config for company
- Produces: `GET /api/onboarding/status` steps that include at least: `sample_data`, `import_csv`, `invite_teammate`, `connect_whatsapp` (keep or demote email/form/quote — do not break dismiss/complete semantics)

- [x] **Step 1:** Read current WhatsApp settings storage and admin invite APIs; note exact “connected” predicate.
- [x] **Step 2:** Write failing tests for new step keys (`invite_teammate` done when company has ≥2 active users or a pending invite; `connect_whatsapp` done when company WA is configured).
- [x] **Step 3:** Update `STEPS` + `onboarding_status` detection; keep `POST /onboarding/sample-data` and dismiss.
- [x] **Step 4:** Pytest `tests/sales/test_onboarding.py` green; update assertions for new keys.

### Task 6: OnboardingChecklist UI + deep links

**Files:**
- Modify: `frontend/components/onboarding/OnboardingChecklist.jsx`
- Modify: `frontend/lib/i18n/hi.cjs` if new visible strings
- Smoke: dashboard still shows checklist for md/sales when incomplete

**Interfaces:**
- Consumes: `GET /onboarding/status`, `POST /onboarding/sample-data`, `POST /onboarding/dismiss`
- Produces: HREF map for `invite_teammate` → admin users / invite, `connect_whatsapp` → `/settings/whatsapp` (confirm real path), `import_csv` → leads home

- [x] **Step 1:** Point checklist links at invite + WhatsApp settings; drop or deprioritize email/form/quote in the UI if API demotes them.
- [x] **Step 2:** Title/copy: setup for first WhatsApp reply / first claimed lead (Ledger Desk styles; no restyle).
- [x] **Step 3:** Manual or Playwright: incomplete company sees checklist; sample-data still works; dismiss hides it.

### Task 7: Sample seed includes unassigned + meeting optional

**Files:**
- Modify: `backend/app/services/sales/onboarding.py` (`seed_sample_data`)
- Modify: `backend/tests/sales/test_onboarding.py`

- [x] **Step 1:** After sample leads seed, leave at least one lead `assigned_to_id=None` so Unassigned Pool is non-empty.
- [x] **Step 2:** Optionally create one scheduled `Meeting` for a sample lead (if Meeting model import is clean).
- [x] **Step 3:** Tests assert ≥1 unassigned sample lead after seed.

---

## Phase 3 — Flutter field-sales blockers

**Already exists:** leads list, follow-ups, invoices, sales shell. No WhatsApp/appointments/claim screens found in Flutter at plan write time — verify before building large features.

### Task 8: Audit + minimal mobile path

**Files:**
- Explore: `flutter_app/lib/features/leads/`, `follow_ups/`, `core/constants/api_endpoints.dart`
- Modify only what blocks: open lead → call/message → complete follow-up

- [x] **Step 1:** Document gap list in a short comment at bottom of this file (or PR description): claim API, WA threads, meetings — present or missing on mobile.
- [x] **Step 2:** If web daily-ops APIs exist: add **minimal** sales screens or actions — claim button on lead detail, link out to WhatsApp (`wa.me` / phone), list today’s meetings **or** deep-link to mobile web for Conversations/Appointments. Prefer smallest change.
- [x] **Step 3:** Do **not** redesign shell or add manager/MD parity on Flutter in this plan.
- [x] **Step 4:** Run existing Flutter tests (`flutter_app/test/`); add one widget/API test only if new screen ships. (`flutter` is not on PATH in this environment; tests not executed.)

---

## Phase 4 — Owner digests (in-app)

### Task 9: Digest counts + notifications

**Files:**
- Create or modify: notification job/service under `backend/app/services/` (match existing notification patterns)
- Modify: reuse unanswered threads, meetings overdue, unassigned lead count (from Phase 1 APIs/queries)
- Test: `backend/tests/` new or extended notification/digest tests

**Interfaces:**
- Consumes: WhatsApp thread unanswered logic, meetings overdue, `Lead.assigned_to_id IS NULL`
- Produces: at most one digest notification per user per period (e.g. daily) with counts; roles: sales (own), manager (team), md (company)

- [x] **Step 1:** Find how in-app notifications are created today; mirror that API.
- [x] **Step 2:** Failing test: with overdue meeting + unanswered inbound + unassigned lead, digest payload includes those counts for md.
- [x] **Step 3:** Implement count aggregation + notification create; idempotent per day.
- [x] **Step 4:** Wire trigger (existing scheduler/cron if any; else document manual `POST` admin/dev endpoint — do not invent a second job runner without checking repo).
- [x] **Step 5:** No email digest unless SMTP path is already used for similar mail — in-app first.

---

## Implementation order

1. Phase 1 Tasks 1–4 → `plan-next.md`  
2. Phase 2 Tasks 5–7 → onboarding SMB  
3. Phase 3 Task 8 → Flutter blockers only  
4. Phase 4 Task 9 → digests  

Each phase is shippable alone. Phase 1 alone unlocks the SMB product demo.

---

## Out of scope

- Founder GTM, pricing, design-partner recruiting, positioning rewrite  
- Second UI theme, calendar view, Meta ads, Sheets sync, SSO  
- New finance/billing suite; heavy MD report work  
- Flutter full feature parity with web  

## Spec coverage check

| Requirement | Task |
|---|---|
| Unassigned / Appointments / Conversations | 1–4 → `plan-next.md` |
| Day-0 invite + CSV + WhatsApp + sample | 5–7 |
| Mobile field sales | 8 |
| Unanswered / overdue / pool reminders | 9 |

## Flutter gap note

**Has on mobile:** Leads list, lead detail (status, notes, tasks, convert), follow-ups (today/overdue). After Task 8, lead detail also supports **claim** (`POST /api/leads/{id}/claim` via `ApiEndpoints.leadClaim`) for unassigned leads and **WhatsApp** via `https://wa.me/<digits>` (`url_launcher`, dependency already in `pubspec.yaml`).

**Missing / web-only:** **WhatsApp threads** — no `GET /api/whatsapp/threads`, no conversations inbox on Flutter; outbound chat only from lead phone. **Meetings** — no `GET /api/meetings?bucket=today` or appointments UI; use web `/sales/appointments` for today’s meetings. No new shell, manager parity, or calendar screen in this task.
