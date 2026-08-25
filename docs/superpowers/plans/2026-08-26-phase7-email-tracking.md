# Phase 7.1 — Email open / click tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.
> **Status: shipped.** Written alongside the code and kept as the record of what
> was built and in what order; every step below is done.

**Goal:** A trial user sends CRM mail and sees that the prospect opened it or
clicked a link — the HubSpot Free wedge.

**Architecture:** One instrumentation point. `deliver_and_log` mints an opaque
token per kind (open / click), injects a 1×1 pixel and click-wrapped links into
the HTML actually sent on both transports, and stores only SHA-256 hashes on
`email_logs`. Two unauthenticated routes under `/api/public/track` bump the two
counters. Campaigns and mass email already call `deliver_and_log`, so they
inherit tracking without changes.

**Tech Stack:** FastAPI, SQLAlchemy, Alembic (`027_email_tracking` off
`026_mass_email`), stdlib `secrets` / `hashlib` / `hmac` / `base64`. No new pip deps.

**Spec:** [docs/superpowers/specs/2026-08-26-phase7-email-tracking-design.md](../specs/2026-08-26-phase7-email-tracking-design.md)

## Global Constraints

- No new pip deps, no attachment tracking, no bot filtering, no Marketing Hub.
- Raw tokens never leave the sent message; no authenticated response returns a
  token or a hash.
- `EmailLog.body` keeps the caller's original text; only the transported HTML is
  rewritten.
- Tracking is skipped (no injection, `NULL` hashes) whenever `PUBLIC_API_URL` is
  empty, loopback, or scheme-less.
- pytest from `backend/`: `/home/nullbytez/Music/Company/CRM-/backend/venv/bin/python -m pytest`.
- One Alembic head must survive (`tests/ops/test_alembic_heads.py`).

---

### Task 1: Spec the item before any code

- [x] **Step 1: Write the 7.1 spec**

`docs/superpowers/specs/2026-08-26-phase7-email-tracking-design.md`. Locks the
token scheme, the two counters, the public prefix, the always-200 GIF, the
HMAC-signed click target, and the non-goals.

---

### Task 2: RED — tests before implementation

**Files:**
- Create: `backend/tests/sales/test_email_tracking.py`
- Modify: `backend/tests/ops/test_alembic_heads.py`

- [x] **Step 1: Write the failing behaviour tests**

Pixel injection + `open_count` increment; click `302` to the original target +
`click_count` increment; original body preserved on the row; unknown open token
still a GIF with no increment; unknown / missing-param / tampered-target click
`404`; cross-tenant isolation; `serialize_email` carries counts and no hashes;
no injection when the base is unusable; mailbox transport gets the same HTML.

- [x] **Step 2: Move the expected Alembic head to `027_email_tracking`**

- [x] **Step 3: Confirm RED**

`ImportError: cannot import name 'tracking_limiter'` and
`CommandError: Can't locate revision identified by '027_email_tracking'`.

---

### Task 3: GREEN — data, service, routes, wiring

**Files:**
- Modify: `backend/app/models/sales/email_log.py`, `backend/app/schema_sync.py`
- Create: `backend/alembic/versions/027_email_tracking.py`
- Create: `backend/app/services/sales/email_tracking.py`
- Create: `backend/app/routers/public/tracking.py`
- Modify: `backend/app/services/sales/crm_email.py`, `backend/app/services/sales/mailbox.py`
- Modify: `backend/app/utils/rate_limit.py`, `backend/app/main.py`

- [x] **Step 1: Columns**

`open_count` / `click_count` (Integer, default 0) and `open_token_hash` /
`click_token_hash` (String(64), nullable, indexed), plus four `MISSING_COLUMNS`
entries and revision `027_email_tracking`.

- [x] **Step 2: Tracking service**

`mint_token` / `hash_token`, `tracking_base` (rejects empty, loopback, and
scheme-less origins), `sign_target` / `verify_target`, `encode_target` /
`decode_target` (http(s) only), `build_outbound_html`, `TRANSPARENT_GIF`.
Linkification runs on the plain source text, never on assembled HTML, so the
pixel's own `src` can never be rewritten into a click URL.

- [x] **Step 3: Public routes**

`GET /api/public/track/o/{token}.gif` and `GET /api/public/track/c/{token}`,
mounted under `/api/public` so the existing `tenancy._PUBLIC_PREFIXES` RLS bypass
covers them. Rate limited by a dedicated `tracking_limiter` (240 / 60 s) so mail
scanners cannot drain the portal's budget. Both counters move via a single SQL
`UPDATE … COALESCE(col, 0) + 1` with `synchronize_session=False`; the click route
uses the row count of that conditional update as its existence check, so
concurrent hits cannot lose each other.

- [x] **Step 4: Wire `deliver_and_log` and the mailbox transport**

One `outbound_html` for both paths; hashes stored on the row; `serialize_email`
gains the two counts. Gmail and Graph switch to HTML content type — the
`send_via_mailbox` signature is unchanged so the existing monkeypatched fake in
`tests/sales/test_mailbox.py` still binds.

- [x] **Step 5: Confirm GREEN and no regression**

`tests/sales/test_email_tracking.py` + `tests/ops/test_alembic_heads.py` pass;
`test_crm_email.py`, `test_mailbox.py`, campaigns, mass email, and portal suites
still pass.

---

### Task 4: Review fixes

- [x] **Step 1: Refuse a loopback tracking base**

`tracking_base()` returned only on empty, but `PUBLIC_API_URL` ships as
`http://localhost:8000` — an unconfigured install rewrote real outbound links to
localhost. Now empty, loopback (`localhost`, `*.localhost`, any loopback IP
including `::1`), and scheme-less origins all disable injection. Added
`PUBLIC_API_URL` to `.env.example` and to the production localhost warning in
`app/config.py`.

- [x] **Step 2: Atomic counters**

Replaced the read-modify-write on both counters with SQL `UPDATE`.

- [x] **Step 3: Docs**

This plan; the spec's Deploy section and the `IMPLEMENTATION_PLAN.md` 7.1 deploy
bullet corrected (tracking is off until `PUBLIC_API_URL` is a **reachable
non-loopback** origin, not merely "set"); spec non-goals now name the inherent
click-tracking risk that a tenant who sends a tracked email can mint a signed
redirect on this origin.

---

## Self-review (plan vs spec)

| Spec decision | Plan step | Test |
|---|---|---|
| Opaque token per (log, kind), hash at rest | Task 3 Step 1–2 | `test_serialize_email_exposes_counts_and_never_hashes` |
| Counts on `email_logs`, exposed by `serialize_email` | Task 3 Step 1, Step 4 | same |
| Public routes under `/api/public/track` | Task 3 Step 3 | all route tests |
| Open pixel always 200 GIF | Task 3 Step 3 | `test_unknown_open_token_returns_gif_without_incrementing` |
| Click 302 valid / 404 unknown, HMAC-signed target | Task 3 Step 3 | `test_click_link_redirects…`, `test_unknown_or_tampered_click_token_is_404` |
| Inject into the HTML actually sent, both transports | Task 3 Step 4 | `test_open_pixel…`, `test_mailbox_transport_sends_the_tracked_html` |
| Stored body stays original | Task 3 Step 4 | `test_stored_body_keeps_the_original_unwrapped_text` |
| Skip injection without a usable base | Task 4 Step 1 | `test_no_injection_when_base_is_empty_or_unreachable` (7 cases), `test_shipped_default_public_api_url_is_loopback` |
| Cross-tenant isolation | Task 3 Step 3–4 | `test_tracking_urls_do_not_leak_another_companys_email` |
| One Alembic head, `027_email_tracking` | Task 3 Step 1 | `tests/ops/test_alembic_heads.py` |
