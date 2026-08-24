# Phase 1 — Charge Money (Razorpay) — Design Spec

> Companion to [IMPLEMENTATION_PLAN.md](../../IMPLEMENTATION_PLAN.md) §1.
> Grounded in the code as of 24 Aug 2026 (verified against the repo, not assumed).
> **Provider decision: Razorpay** (confirmed with the product owner — India-first buyer signals).

## Goal (phase-exit test)

A stranger signs up → lands on an active TRIAL → pays in test mode → adds users up to
`plan.max_users` → the (max+1)th add fails with a **402** carrying the limit and an upgrade
path. An automated test asserts the failed seat.

## Grounded facts that shape the design

- **Seats are consumed in two places:** `signup` (first admin — `app/routers/auth/auth.py:141`)
  and `create_invite` (`app/routers/admin/admin.py:1042`). A `PENDING` invite is a reserved
  seat. The seat count must be `active users + pending invites`, enforced at `create_invite`.
- **`Document` has no size column** (`app/models/ops/document.py`). Storage enforcement has no
  size source today — we add one.
- **`CompanyStatus`** (`app/models/core/enums.py:55`) has `active/pending/suspended/rejected`,
  no `TRIAL`. `Company` (`app/models/core/company.py`) has no trial-expiry field.
- **Alembic is not usable here:** the binary is not installed in this environment and the plan
  documents two existing migration heads (a pre-existing branch). The established convention is
  `create_missing_tables.py` (`Base.metadata.create_all`), which is also how Phase 0.4 shipped
  the `refresh_tokens` table. Tests auto-create schema via `create_all` in `tests/conftest.py`.
- **Model registration:** `app/models/__init__.py` does `from .core import *` etc. New billing
  models register in `Base.metadata` only if imported — so `app/models/__init__.py` gains
  `from .billing import *`, and `create_missing_tables.py` imports the billing package.

## Confirmed decisions

1. **Migrations:** new tables land via `create_missing_tables.py` + `Base.metadata`, **not**
   Alembic. Follows the 0.4 precedent; avoids rewriting the two-head migration topology.
2. **Storage tracking:** add a `file_size` (bytes) column to `Document`, populated on upload.
   Existing rows backfill to `0` (they predate the limit). Chosen over `os.stat`-on-demand:
   exact, cheap, survives file moves.
3. **Razorpay checkout modeled as Subscriptions** (recurring), not one-time Orders. `Subscription`
   carries `provider_subscription_id`; the schema also tolerates one-time flows later.
4. **Seat semantics:** a pending invite counts as a consumed seat.

---

## 1.1 Plans & subscriptions schema

New package `app/models/billing/`:

**`Plan`** (`plans` table)
- `id`, `name` (unique), `price_monthly` (Numeric), `currency` (String, default `"INR"`),
  `max_users` (Int), `max_teams` (Int), `max_storage_gb` (Int, **nullable = unlimited**),
  `razorpay_plan_id` (String, nullable), `is_active` (Bool, default True).

**`Subscription`** (`subscriptions` table)
- `id`, `company_id` (FK `companies.id`, **unique** — one live subscription per company),
  `plan_id` (FK `plans.id`), `provider` (String, default `"razorpay"`),
  `provider_subscription_id` (String, nullable),
  `status` (String: `trialing` | `active` | `past_due` | `cancelled`),
  `current_period_end` (DateTime, nullable), `trial_ends_at` (DateTime, nullable),
  `seats` (Int, nullable — informational; enforcement counts real users+invites),
  `created_at`, `updated_at`.

**Seeding:** `seed_plans()` seeds the three tiers currently hardcoded at
`app/routers/admin/platform.py:307` (Starter 29 / Growth 79 / Enterprise 199, same limits),
idempotently (skip if a plan name exists). Called from `create_missing_tables.py`.

**`GET /plans`** (`platform.py`) reads the `plans` table instead of the literal. Platform admin
gets `PATCH /plans/{id}` to edit price/limits/is_active.

**Touch:** new `app/models/billing/{__init__,plan,subscription}.py`,
`app/models/__init__.py` (+`from .billing import *`), `create_missing_tables.py`,
`app/routers/admin/platform.py`.

## 1.2 Payment provider adapter

New `app/services/billing/`:

- **`BillingProvider`** (ABC): `create_checkout(company, plan) -> checkout_ref`,
  `handle_webhook(headers, raw_body) -> event`, `cancel(subscription)`, `list_invoices(company)`.
- **`RazorpayProvider`**: uses the `razorpay` SDK; keys from env. `create_checkout` creates a
  Razorpay subscription and returns the checkout handle. `handle_webhook` verifies the
  `X-Razorpay-Signature` HMAC (SHA256 over the raw body with the webhook secret) and returns a
  normalized event.
- **`NullProvider`**: no network; used in tests and when keys are absent. `handle_webhook`
  verifies against a local test secret so idempotency/signature logic is exercised without live
  Razorpay.
- **Selection:** `get_billing_provider()` returns Razorpay when keys are configured, else Null.

**Webhook endpoint** `POST /api/billing/webhook` (`app/routers/billing/`):
- **No JWT.** Reads the raw request body (needed for signature verification).
- Verifies signature via the provider; a bad signature → 400.
- **Idempotent:** new `webhook_events` table (`event_id` unique). If the event id was seen, the
  handler no-ops (returns 200) without re-applying state. Otherwise records the id and applies:
  `subscription.charged`/`activated` → status `active` + `current_period_end`; `halted`/`cancelled`
  → `past_due`/`cancelled`. Event record + subscription update commit in one transaction.

**Config** (`app/config.py`): `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`
— env only, no defaults that could ship a real key. Absent keys → NullProvider (dev/test).

**Touch:** new `app/services/billing/{__init__,base,razorpay_provider,null_provider}.py`,
new `app/models/billing/webhook_event.py`, new `app/routers/billing/__init__.py` (+ router),
`app/config.py`, `app/main.py` (include router), `backend/requirements.txt` (+`razorpay`).

## 1.3 Self-serve signup

- Add `CompanyStatus.TRIAL = "trial"` (`enums.py`) and `Company.trial_ends_at`
  (DateTime, nullable).
- **`signup`** (`auth.py:141`): default company `status` flips `pending` → `trial`;
  `trial_ends_at = now + 14 days`; create a `Subscription` row on the **Starter** plan with
  `status="trialing"`, `trial_ends_at` set. The first user's `status` becomes active (was
  `pending`) so the owner can use the trial immediately. The platform-admin notification stays.
- **`_check_company_status`** (`auth.py:125`): `trial` is allowed to log in. `suspended`/`rejected`
  still blocked (abuse controls preserved). If `trial_ends_at` is past and no active subscription,
  block with a clear "trial expired — upgrade" message.
- **Billing portal endpoints** (`app/routers/billing/`, company-admin auth):
  `GET /api/billing/subscription` (current plan + status + limits + usage),
  `POST /api/billing/checkout` (→ `create_checkout`, returns the Razorpay handle),
  `POST /api/billing/cancel`.

**Touch:** `app/models/core/enums.py`, `app/models/core/company.py`,
`app/routers/auth/auth.py`, `app/routers/billing/`.

## 1.4 Limit enforcement

New `app/services/billing/limits.py`:
- `current_seat_usage(db, company_id)` = active users + pending invites.
- `assert_can_add_user(db, company_id)` — raises **402** `{detail, limit, current, upgrade_path}`
  when usage ≥ `plan.max_users`.
- `assert_can_add_team(db, company_id)` — vs `plan.max_teams`.
- `assert_can_upload(db, company_id, incoming_bytes)` — sum of `Document.file_size` + incoming
  vs `plan.max_storage_gb * 1024³`; `NULL` max_storage_gb = unlimited (skip).
- A company with no `Subscription` row (legacy) resolves to the Starter limits (safe default), so
  enforcement never crashes on pre-existing tenants.

**Wiring:**
- `assert_can_add_user` in `create_invite` (`admin.py:1042`), before the `Invite` is created.
- `assert_can_add_team` at team creation (`app/routers/teams.py`).
- `assert_can_upload` at document upload (`app/routers/ops/documents.py`), and set
  `Document.file_size` from the uploaded content length.

**Storage schema fix:** add `Document.file_size` (Int, bytes, default 0). Backfill existing rows
to 0 via `create_missing_tables` path (new column defaults to 0 for old rows on SQLite/PG).

**Touch:** new `app/services/billing/limits.py`, `app/models/ops/document.py`,
`app/routers/admin/admin.py`, `app/routers/teams.py`, `app/routers/ops/documents.py`.

---

## Testing (`tests/billing/`)

1. `test_plans.py` — `seed_plans` is idempotent; `GET /plans` returns seeded tiers; platform
   admin `PATCH` edits a limit.
2. `test_webhook_idempotency.py` — a signed event applies once; the **same event id twice** yields
   one state change (second call no-ops, 200). Bad signature → 400.
3. `test_signup_trial.py` — signup creates a `trial` company with a `trialing` Subscription on
   Starter and an active owner who can immediately log in.
4. `test_limits.py` (**phase-exit gate**) — seed a company on a plan with `max_users = N`; fill
   seats (users + pending invites) to N; the (N+1)th `create_invite` returns **402** with
   `limit`, `current`, and `upgrade_path`. Parallel smaller checks for team and storage limits.

All tests run against `NullProvider` (no live Razorpay) and SQLite in-memory via the existing
`conftest.py` `create_all` fixture. No network in the suite.

## Out of scope (surfaced, not smuggled)

- Live Razorpay integration test against the real sandbox (needs credentials + network) — the
  suite proves the adapter/webhook logic via NullProvider and synthetic signed events.
- Proration / mid-cycle plan changes beyond a straight upgrade checkout.
- Resolving the two Alembic heads — deliberately untouched (see decision 1). A follow-up should
  reconcile heads and fold these tables into a migration for teams that deploy via Alembic.
- Dunning / retry emails on `past_due` — status is tracked; notification flow is Phase 2 email work.
