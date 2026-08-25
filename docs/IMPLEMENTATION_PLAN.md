# Perioxia CRM — Implementation Plan

> Companion to [PRODUCT_ROADMAP.md](./PRODUCT_ROADMAP.md). The roadmap decides *what* and *why*.
> This file decides *how*, *in what order*, and *how we know a phase is done*.
> Grounded in the code as of 25 Aug 2026 (verified, not assumed).

**Ground rule (from roadmap §8):** each phase ships to production before the next starts. No phase N+1 while N is unverified.

---

## Status board (resume here)

Last updated: **26 Aug 2026**. Status is from code + this file’s progress logs, not from memory.

| Phase | Status | Notes |
|-------|--------|--------|
| **0 — Trust** | ✅ **DONE** | 0.1 RLS in **6.10** (code). 0.2–0.5 already done. |
| **1 — Charge money** | ✅ **DONE** | Razorpay adapter, trial signup, seat/storage limits. |
| **2 — Sales loop** | ✅ **DONE** (code) | Deals, web form, custom fields, quotes→invoice, workflows, cadence, email, tags/recycle/merge, reminders. |
| **3 — Zoho Standard match** | ✅ **DONE** (code) | 3.1–3.9 shipped. |
| **4 — Professional extras** | ✅ **DONE** (code) | 4.1–4.7 shipped. |
| **5 — Paid add-ons** | ✅ **DONE (code)** | **5.1–5.10 DONE.** |
| **6 — Competitor parity (buyers still feel)** | ✅ **DONE** (code) | **6.1–6.20 DONE.** |
| **7 — Trial defense** | 🚧 **IN PROGRESS** | **7.1–7.2 DONE (code); 7.3–7.12 pending.** Spec: [`superpowers/specs/2026-08-26-phase7-trial-defense-design.md`](./superpowers/specs/2026-08-26-phase7-trial-defense-design.md). Resume **7.3**. |

### Phase 4 checklist

| Item | Status |
|------|--------|
| **4.1** Products price book + tax | ✅ DONE |
| **4.2** Blueprint (required stages) | ✅ DONE |
| **4.3** Customer portal (view invoice/quote) | ✅ DONE |
| **4.4** Forecasting (quota vs pipeline) | ✅ DONE |
| **4.5** Territory assignment | ✅ DONE |
| **4.6** Sandbox | ✅ DONE |
| **4.7** SSO (Google/Microsoft first; SAML later) | ✅ DONE |

### Phase 6 checklist — competitor gaps companies still want

Ordered for India-first service businesses (WhatsApp / pay / calendar first), then desk-sales (email / timeline / one UI).

| Item | Why competitors win | Status |
|------|---------------------|--------|
| **6.1** Gmail / Outlook sync + send/log on record | HubSpot/Pipedrive/Freshsales table-stakes inbox | ✅ DONE |
| **6.2** Google / Microsoft Calendar sync (site visits) | Service businesses schedule in calendar, not only CRM meetings | ✅ DONE |
| **6.3** Click-to-call / telephony (Exotel or Twilio) | Freshsales / Kylas — call logs alone are not enough | ✅ DONE (Exotel) |
| **6.4** Unified activity timeline (email+call+meeting+note) | Pipedrive’s core; one record history | ✅ DONE |
| **6.5** One object UI (collapse five role apps) | HubSpot one contact; we still have `/sales`…`/admin` copies | ✅ DONE |
| **6.6** Customer pay invoice + accept quote from portal | Portal is view-only; buyers expect pay link | ✅ DONE |
| **6.7** WhatsApp inbound + auto reminder sequences | India: Kylas/LeadSquared; templates-only is thin | ✅ DONE |
| **6.8** Store-ready mobile (Play/App Store) + mobile 2FA | Flutter path exists; not shippable | ✅ DONE (code) |
| **6.9** In-app onboarding (sample pipeline, connect Gmail, import) | Time-to-first-deal; empty CRM loses trials | ✅ DONE |
| **6.10** Postgres RLS (0.1) | Diligence / “isolation you can prove” | ✅ DONE |
| **6.11** Landing honesty (remove fake testimonials / unshipped claims) | Legal + trust before public launch | ✅ DONE |
| **6.12** Brand drift fix (Perioxia vs repo names) | Buyers notice | ✅ DONE |
| **6.13** Accounts vs Contacts (B2B company record) | HubSpot/Zoho/Salesforce shape | ✅ DONE |
| **6.14** Saved filters / “my deals due today” | Every serious CRM nag | ✅ DONE |
| **6.15** Outbound webhooks (customer events) | API keys exist; competitors push events | ✅ DONE |
| **6.16** Invoice PDF polish + India e-invoice/IRN path | GST lines exist; PDF/e-invoice don’t | ✅ DONE |
| **6.17** Live chat / website widget → lead | HubSpot free wedge | ✅ DONE |
| **6.18** SAML / enterprise SSO | After Google/Microsoft OAuth | ✅ DONE |
| **6.19** GDPR / India DPDP (export, delete, retention) | Before EU; India later | ✅ DONE |
| **6.20** Alembic two-heads cleanup | Ops; unblocks real migrations | ✅ DONE |

### Phase 5 checklist — paid add-ons (still build; lower than 6 for niche)

| Item | Status |
|------|--------|
| **5.1** Data enrichment | ✅ DONE |
| **5.2** Lead / deal scoring | ✅ DONE |
| **5.3** Predictive AI (convert/churn) | ✅ DONE |
| **5.4** Tally / QuickBooks sync | ✅ DONE |
| **5.5** Custom modules (beyond custom fields) | ✅ DONE |
| **5.6** Marketplace / apps | ✅ DONE (first-party catalog) |
| **5.7** Full email marketing / campaigns | ✅ DONE (integrate, don’t clone) |
| **5.8** Helpdesk / cases / web-to-case | ✅ DONE (thin) |
| **5.9** Deep sandbox data clone | ✅ DONE |
| **5.10** Mass email (capped) | ✅ DONE |

### Also still open (folded into 6.x where noted)

| Item | Status |
|------|--------|
| **0.1** / **6.10** Postgres RLS | ✅ DONE |
| **6.11** Landing honesty | ✅ DONE |
| **6.12** Brand drift | ✅ DONE |
| **6.20** Alembic two-heads | ✅ DONE |

### Phase 7 checklist — trial defense (HubSpot / Zoho / Pipedrive week-one)

Thin edges after 0–6. Not Marketing Hub / Desk. Spec: [`superpowers/specs/2026-08-26-phase7-trial-defense-design.md`](./superpowers/specs/2026-08-26-phase7-trial-defense-design.md); index plan: [`superpowers/plans/2026-08-26-phase7-trial-defense.md`](./superpowers/plans/2026-08-26-phase7-trial-defense.md). Spec + plan per item before code.

| Item | Why they still win the trial | Status |
|------|------------------------------|--------|
| **7.1** Email open / click tracking | HubSpot Free wedge | ✅ DONE (code) |
| **7.2** Meeting booking + inbound calendar | HubSpot meetings; 6.2 is CRM→calendar only | ✅ DONE (code) |
| **7.3** Store-listed mobile | Apps in stores; 6.8 is code + STORE_RELEASE.md | ⏳ PENDING |
| **7.4** Hindi UI (sales loop) | Zoho India expectation | ⏳ PENDING |
| **7.5** Live Tally sync | 5.4 is a stub | ⏳ PENDING |
| **7.6** Live GST IRN (IRP/NIC) | 6.16 is a hash stub | ⏳ PENDING |
| **7.7** Price books | 4.1 products, no books | ⏳ PENDING |
| **7.8** Next-activity nag (mandatory + last-touch rotting + due email) | Pipedrive | ⏳ PENDING |
| **7.9** Quote → sales order → invoice | Zoho money chain | ⏳ PENDING |
| **7.10** Deal / discount approvals | Zoho process; purchase approvals only today | ⏳ PENDING |
| **7.11** Import undo + clients/deals CSV | 3.6 is leads-only | ⏳ PENDING |
| **7.12** More report types + scheduled email | 3.4 is one type, no schedule | ⏳ PENDING |

**Out of Phase 7 (roadmap §7):** Marketing Hub, Zoho Desk, Salesforce objects, two-way live chat, layouts designer.

**Resume next:** **7.3** store-listed mobile (7.2 is in code). Production verify of 0–6 remains a deploy gate (roadmap §8), in parallel with 7.x.

---

## Blocking decision before Phase 1 (decide now, costs a week if wrong)

**Payment provider: Razorpay vs Stripe.** Roadmap §12 leaves this open; it blocks Phase 1 and Phase 2's payment link.

**Recommendation: Razorpay.** The buyer signals in the roadmap point India-first — INR pricing anchored to Zoho India (§1), GST invoices, WhatsApp (Interakt/Gupshup), Kylas/LeadSquared as the real alternatives (§5). Stripe does not support collecting from India-domiciled businesses well; Razorpay is the local default and also does subscriptions.

**What flips it to Stripe:** if the first design-partner companies are outside India, or you want one provider for global expansion from day one. Decide before writing any billing code — the webhook shape, SDK, and checkout differ enough that a switch mid-Phase-1 wastes ~a week.

Everything below assumes Razorpay; the structure is provider-agnostic (an adapter, not provider calls sprinkled through routers).

---

## Phase 0 — Trust (2–4 weeks)

**Status: ✅ DONE** (including 0.1 RLS as 6.10).

**Goal:** cross-tenant leaks and "fake SaaS" become impossible, proven by an automated test.

Order matters: tenancy first (biggest risk), then the cheap boot/health fixes, then auth hardening.

### Progress log

- **0.3 boot + health — DONE.** `config.py` refuses to boot on the placeholder `SECRET_KEY` when `ENVIRONMENT=production`; `/health` runs `SELECT 1` and returns 503 on DB failure. Covered by `tests/test_health_and_config.py` (4 tests).
- **0.2 tenancy matrix — SUBSTANTIALLY DONE (39 tests, all green).** `tests/tenancy/test_cross_tenant_object_access.py` proves, each paired with a positive control, that company B's admin gets no cross-tenant access while company A's owner succeeds, across:
  - **read-by-id:** leads, clients, tasks, follow-ups, invoices, documents, **teams**
  - **delete/mark-by-id:** leads, clients, tasks, follow-ups, documents, stock, **ledger entries, notifications, teams**
  - **mutate-by-id (PATCH/PUT, valid bodies):** leads, clients, tasks, follow-ups, stock, **teams**
  - **list-scope:** users, **teams** (`/api/admin/teams`, `/api/teams/mine`)
  - **The current opt-in `apply_company_scope` + `ensure_company_access` is holding on every path tested — no leak found.** Positive controls earned their keep: they caught a vacuous pass (document download 404'd for the owner too, on a missing file, not scoping), fixed before the result was trusted. Valid request bodies on the mutation cases ensure a 404 proves the *scope* check, not body rejection.
  - **Teams + AI reads (closed 26 Aug 2026):** `GET/PUT/DELETE /api/admin/teams/{id}`, `/api/admin/teams` list, `/api/teams/mine`, plus AI `list_teams` / `business_snapshot` / `delete_team` against a foreign id (`tests/tenancy/test_ai_reads_cross_tenant.py`). Isolation already held; the residual was missing coverage.
  - Also fixed a test-infra trap: the process-global auth rate limiter tripped across repeated logins and masked results with 429s; reset per-test.
- **Pre-existing red tests — both fixed (were masking real signal).**
  - `test_sales_cannot_mutate_but_manager_md_admin_can_create_team`: **test bug**, not product. The mock hardcoded team name "Alpha Team", so the admin re-created the manager's team and hit the correct duplicate-name 400. Product logic (role gating + duplicate rejection) is right; fixed the mock to derive the name from the message. Flagged for 0.5: a single failing AI action 400s the *whole* turn instead of returning a per-action error.
  - `test_manager_task_create_notifies_sales_assignee`: **time-bomb test**. Hardcoded `due_date=2026-05-05` aged into the past (today 2026-08-24); the endpoint correctly rejects past due dates. Fixed to a `now + 30 days` date. Sibling tests share this hardcoded-date pattern — worth a sweep.
- **0.4 refresh tokens + logout revoke — DONE (6 tests, `tests/auth/test_refresh_tokens.py`).** Stateful rotating refresh tokens (opaque random token, only SHA-256 hash stored in `refresh_tokens`). Login (password + OTP) issues a refresh token (body + HttpOnly cookie, Secure in prod). New `POST /api/auth/refresh` rotates on use; **reuse of an already-rotated token revokes the entire chain** (theft signal) **and bumps `users.token_version`**. Logout revokes **all** of that user's refresh tokens, increments `token_version`, and clears cookies so the access JWT is rejected immediately (`ver` claim). CRM access tokens minted via `crm_access_token()`. Alembic `018_token_version`.
  - **Production DB note:** `alembic upgrade head` (through `018_token_version`) or `python create_missing_tables.py` adds `users.token_version`.
- **0.5 AI action audit — DONE (audit portion; 3 tests, `tests/ai/test_ai_audit.py`).** Every executed AI mutation (`COMMAND_ACTIONS`) now writes an `AuditLog` row via the existing `log_activity` helper: `action="ai:<tool>"`, `entity_type="ai_action"`, actor (`admin_id`), `company_id`, and `after_value` = JSON of `{params, result}`. Read-only actions and role-denied (skipped) actions are not logged. Insertion at `company_assistant.py` execution loop; commits in the same transaction as the actions.
  - **Role restriction was already in place** (not a gap): `_allowed_actions_for_role` gives sales only `READ_ONLY_ACTIONS + SALES_AI_EXTRA` (own-task tools), so sales cannot create/delete teams or ledgers — the skipped-action test confirms it. The real 0.5 gap was the missing audit trail, now closed.
  - **AI follow-ups — DONE (3 tests, `tests/ai/test_ai_graceful_actions.py`).** (1) A failing *execution-phase* action no longer aborts the turn: each action is wrapped in a per-action `try/except HTTPException`, returning `{"status":"error","detail":...}` for that action while others still run (turn stays 200). Validation-phase 400s (malformed shape/params) are unchanged and still tested. The dispatch was extracted into `_execute_action(...)`. (2) Failed *executed* attempts are now audited as `ai:<action>:failed`. Also reordered `_create_team_with_members` to validate `manager_id` **before** creating the team, closing the orphan-team hole a bad manager_id would otherwise leave.
  - **Dry-run — DONE.** `POST /api/ai/company-assistant` with `dry_run: true` validates and returns mutating tools as `{status:"dry_run"}` without calling them or writing `ai_action` audits. Read-only tools still run. UI checkbox on the company assistant. Tests: `tests/ai/test_ai_dry_run.py`.
  - **Deliberately NOT done (surfaced, not smuggled):** full transactional isolation of *every* multi-step partial failure would require removing self-`commit()` from ~15 helper functions across `company_assistant.py` + `assistant_crm_actions.py` (they each own their transaction, which is why SAVEPOINTs conflict). That's an architecture refactor, out of scope for a follow-up; the common composite failure (bad manager) is closed by validate-first, and simple actions are already atomic (validate → mutate+commit). Role-*denied* attempts remain unaudited by design (they never execute; see the denied-not-audited test).
- **Suite: 139 passing, 0 failing.**

### 0.1 Tenant isolation at the database, not the helper

**Reframed by the 0.2 evidence:** the sampled object-access paths are *not* leaking today (see progress log), so RLS is now **defense-in-depth**, not urgent leak-plugging. Do it because "isolation you can prove" is the selling point and a helper can be forgotten on the *next* endpoint — not because a specific leak was found. Priority accordingly: finish the test matrix (0.2) first; it is the guardrail that catches a future missed scope regardless of whether RLS lands.

Today `apply_company_scope` (`app/utils/dependencies.py:19`) is opt-in — one missed call leaks another company. 384 call sites means one *could* be wrong (none found yet in the sampled set).

- Add `backend/app/tenancy.py`: a request-scoped mechanism that sets the active `company_id` on the DB session.
- **Pick one** (enumerate before choosing):
  - **Postgres RLS** — `CREATE POLICY` on every tenant table using `current_setting('app.company_id')`; set it per request via `SET LOCAL app.company_id = :cid`. Strongest; the DB enforces it even if application code forgets. More Alembic work.
  - **Session `SET` + a mandatory query filter mixin** — lighter, but still application-enforced. Weaker guarantee.
  - **Recommendation: RLS.** The whole selling point (§1.1, §11) is "isolation you can prove." RLS is the provable version; a helper is not.
- Wire `SET LOCAL app.company_id` into the `get_db` dependency after auth resolves the user's company.
- Platform-admin queries (cross-tenant by design) need an explicit bypass role/path — do not let the bypass become the default.

**Touch:** `app/database.py`, new `app/tenancy.py`, Alembic migration (enable RLS + policies), `app/utils/dependencies.py`.

### 0.2 Tenancy test matrix

Expand `backend/tests/tenancy/` (currently only `test_multi_tenancy.py`) to cover **every** tenant resource: leads, clients, invoices, ledgers, documents, stock, users, teams, notifications, tasks, follow-ups, AI reads.

- Two seeded companies A and B. For each resource: user A gets 404 (not 403) on GET/PATCH/DELETE of B's row.
- One parametrized test over a resource list beats twelve copy-pasted tests.

**This is the Phase 0 exit gate.**

### 0.3 Boot + health honesty (cheap, do in a day)

- `config.py:103` currently `warnings.warn` on placeholder `SECRET_KEY` → change to **raise** when `ENV == production`. Keep the warning in dev.
- `main.py:124` `/health` → execute `SELECT 1`; return 503 if it fails. Add `/health/ready` vs `/health/live` if you want k8s-style splits later (not now).

### 0.4 Auth hardening

- **Refresh tokens:** config has `REFRESH_TOKEN_EXPIRE_DAYS` (`config.py:28`) but the auth router never issues one. Add: issue refresh on login, rotate on use, store a revocation list (or a `token_version` on User), revoke on logout.
- HttpOnly + Secure cookie in production only.
- Kill the client-only route guard as a *security* claim (roadmap §6.3) — API stays the source of truth. (Full UI unification is Phase 2; here just stop pretending the guard is security.)

### 0.5 AI action audit

`app/utils/audit.py` exists; the AI assistant can mutate CRM data (`app/routers/ai/company_assistant.py`, `assistant_crm_actions.py`).

- Every mutating AI tool call persists: tool name, actor user, company_id, payload, result.
- Restrict by role: sales role → read + own tasks only; no team/ledger deletion by the model.
- Add a dry-run mode (return the intended change without committing) for the dangerous tools.

**Phase 0 done when:** two seeded companies; user A cannot GET/PATCH/DELETE any of B's resources; test suite green; `/health` fails when Postgres is down; prod boot refuses the placeholder key.

---

## Phase 1 — Charge money (2–3 weeks)

**Goal:** a stranger signs up, pays in test mode, hits a seat limit, and cannot add the over-limit user.

**Provider decision: Razorpay** (confirmed 24 Aug 2026 — India-first buyer signals). Adapter is provider-agnostic.

### Progress log

- **PHASE 1 DONE.** Full suite **162 passing** (139 baseline + 23 new billing/trial tests), verified. Executed subagent-driven with per-task review + a whole-branch final review; all work uncommitted on `main` per decision. Spec: [`superpowers/specs/2026-08-24-phase1-billing-design.md`](./superpowers/specs/2026-08-24-phase1-billing-design.md); plan: [`superpowers/plans/2026-08-24-phase1-billing.md`](./superpowers/plans/2026-08-24-phase1-billing.md).
  - **1.1 plans schema — DONE.** New `app/models/billing/{plan,subscription,webhook_event}.py`; idempotent `seed_plans` (Starter/Growth/Enterprise) wired into `create_missing_tables.py`. `platform.py` `/plans` reads the table; platform admin `PATCH /plans/{id}` edits limits/price.
  - **1.2 payment adapter — DONE.** `app/services/billing/` — `BillingProvider` ABC, `RazorpayProvider` (lazy SDK import), `NullProvider` (offline tests), `get_billing_provider()`. HMAC-SHA256 webhook verification with `compare_digest`, **fail-closed on empty secret**. `POST /api/billing/webhook` (no JWT, raw-body verify), **idempotent** via unique `webhook_events.event_id` + IntegrityError-catch on the concurrent-duplicate race.
  - **1.3 self-serve signup — DONE.** `CompanyStatus.TRIAL` + `Company.trial_ends_at`; signup creates a `trial` company (14-day) + active owner + Starter `trialing` subscription (atomic). Trial-aware auth at **both** login (`_check_company_status`) and every request (`get_current_user`); expired trials blocked. Portal: `GET /subscription`, `POST /checkout`, `POST /cancel` (company-admin, IDOR-safe). **Paid webhook flips `Company.status`→active and clears `trial_ends_at`** (the trial→paid seam).
  - **1.4 limit enforcement — DONE.** `app/services/billing/limits.py` → 402 with `{limit, current, upgrade_path}`. Seats = active users + pending invites (enforced in `create_invite`); teams in `create_team`; storage via new `Document.file_size` in `upload_document`. No-subscription companies fall back to Starter limits.
- **Migration note (important for prod):** we deliberately did **not** touch Alembic (two pre-existing heads; alembic not runnable here). New **tables** come from `Base.metadata.create_all`; new **columns on existing tables** (`companies.trial_ends_at`, `documents.file_size`) come from an idempotent `add_missing_columns()` in `create_missing_tables.py` (dialect-agnostic `ALTER TABLE ADD COLUMN`, Postgres-correct `TIMESTAMP WITH TIME ZONE` / `INTEGER DEFAULT 0`). **Run `create_missing_tables.py` on deploy.** `razorpay` is in `requirements.txt` but not installed — `pip install` before live use.
- **Deferred (non-blocking, Phase 1.x candidates):** `Subscription.updated_at`/`current_period_end` unpopulated; 402-before-400 on over-limit+duplicate; schema-default `PENDING` user would count as a seat (none persist today); `update_plan` has no audit-log entry; webhook duplicate response not distinguished for metrics; cancel/`past_due` webhooks intentionally do **not** auto-suspend the company (dunning deferred).

### 1.1 Real plans schema (replace the hardcoded literal)

`app/routers/admin/platform.py:307` returns a Python literal; `Company.plan` is a free String. Replace with tables:

- `plans` — id, name, price_monthly, currency, max_users, max_teams, max_storage_gb (nullable = unlimited), is_active.
- `subscriptions` — company_id, plan_id, provider, provider_subscription_id, status, current_period_end, seats.
- Seed the three existing tiers (Starter/Growth/Enterprise) via migration so nothing breaks.
- `/plans` reads the table; platform admin can edit.

**Touch:** new `app/models/billing/plan.py` + `subscription.py`, Alembic, `app/routers/admin/platform.py` (replace literal), new `app/routers/billing/`.

### 1.2 Payment provider adapter

- `app/services/billing/` with a thin interface: `create_checkout`, `handle_webhook`, `cancel`, `list_invoices`. Razorpay implementation behind it.
- Webhook endpoint (no JWT, verify signature) → update `subscriptions.status`. **Idempotent** — Razorpay retries; a double webhook must not double-charge state.
- Secrets in env only; never in code.

### 1.3 Self-serve signup (remove the human bottleneck)

Roadmap §6.2: company signup is currently a ticket (`status=PENDING` until platform admin). HubSpot is minutes.

- Signup → company `TRIAL` (active, time-boxed) **or** pay → `ACTIVE`. Drop the mandatory admin approval for the default path; keep suspend/reject for abuse.
- Billing portal: upgrade, cancel, view the CRM's own invoices.

### 1.4 Limit enforcement

- On add-user / add-team / upload: check the subscription's limits, return a clear 402/403 with the limit and the upgrade path.
- Storage: sum document sizes per company against `max_storage_gb`.

**Phase 1 done when:** stranger signs up → pays test mode → adds users up to `max_users` → the (max+1)th add fails with an upgrade prompt. Automated test asserts the failed seat.

---

## Phase 2 — One sales loop (4–8 weeks)

**Status: ✅ DONE (code).** Deal, public web form, custom fields, quote→invoice, workflows, cadence, CRM email, tags/recycle/merge, and reminders are in the repo. UI unification is incremental (canonical sales surfaces exist; residual role-page drift may remain). The roadmap “30-day design partner” gate is live usage, not an open coding checklist.

**Goal (roadmap §11):** a design-partner company runs web form → cadence → quote → paid invoice for 30 days. No HR/stock work in this phase.

Build in dependency order — each is demoable alone:

1. **Deal object** (foundation for the rest). New `app/models/sales/deal.py`: amount, currency, expected_close, probability, pipeline_id, stage_id. Company-configurable stages (move stages out of the Python enum → a `pipeline_stages` table). This is the "money on the pipeline" the MD page currently fakes with `won * 10k` (§6.2).
2. **Public web form → lead.** Public router, no JWT, signed form id, honeypot, company branding. Frontend `/f/[slug]`. Captures `source`.
3. **Custom fields** on lead/deal/client (text/number/date/picklist). `custom_field_defs` + values table scoped by company_id. Needed before real customers, cheap to add early.
4. **Quote → invoice → payment link.** Quote model (PDF), accept/reject → invoice (already exists, add PDF + payment link via the Phase 1 adapter).
5. **Workflow engine v0.** `workflow_rules` table; trigger on lead created / stage changed / quote accepted; actions: assign round-robin, create task, notify, send email. In-request execution for v0; queue later.
6. **Cadence.** Sequence of follow-ups with due dates (day 1 SMS, day 3 call, day 7 email).
7. **Email from CRM.** SMTP send + log first; Gmail OAuth second.
8. **Tags, recycle bin (soft delete), merge duplicates** on email/phone.
9. **Reminders:** in-app (exists) + email; WhatsApp (Interakt/Gupshup) if India confirmed.

**Concurrent structural work — UI unification (§6.1):** collapse the five role apps into one object surface. Make `frontend/app/sales/leads/` canonical; manager/MD/purchase reuse the same components and only get wider row scope. Do this incrementally per object (leads first) rather than a big-bang rewrite.

**Phase 2 done when:** the end-to-end plumber demo runs and one design partner uses it live for 30 days.

---

## Phases 3–5 — pulled forward / remaining

Phases 3 and 4 were pulled ahead of the original “only after revenue / trial asks twice” gate by explicit decisions. Status is on the **Status board** at the top of this file.

- **Phase 3** — ✅ **DONE (code):** 3.1–3.9 logged below.
- **Phase 4** — ✅ **DONE (code):** 4.1–4.7 logged below.
- **Phase 5** — ✅ **DONE (code):** 5.1–5.10 logged below.
- **Phase 6** — ✅ **DONE (code):** **6.1–6.20**.
- **Phase 7** — 🚧 **IN PROGRESS:** **7.1–7.2 DONE (code)**, 7.3–7.12 pending (trial defense). Spec: [`superpowers/specs/2026-08-26-phase7-trial-defense-design.md`](./superpowers/specs/2026-08-26-phase7-trial-defense-design.md).

### Phase 3.1 — TOTP 2FA — DONE

Pulled forward ahead of the pull-based gate by explicit decision. Opt-in per-user TOTP + recovery codes + a company-admin mandate, full stack. Spec: [`superpowers/specs/2026-08-25-phase3-totp-2fa-design.md`](./superpowers/specs/2026-08-25-phase3-totp-2fa-design.md); plan: [`superpowers/plans/2026-08-25-phase3-totp-2fa.md`](./superpowers/plans/2026-08-25-phase3-totp-2fa.md). Executed subagent-driven with per-task review, direct on `main`. The first whole-branch review did not finish (session limit); a follow-up closed the forced-enrollment UI hole.

- **Endpoints:** `/api/auth/2fa/{setup,confirm,status,disable,recovery-codes/regenerate,verify}` and `GET`/`PATCH /api/company/security`. `/login` and `/login-otp` now return an MFA challenge (`{mfa_required, mfa_token}` or, for a mandated-but-unenrolled user, `{mfa_setup_required, setup_token}`) instead of session tokens when 2FA applies; `POST /2fa/verify` exchanges the challenge + a TOTP or single-use recovery code for the real tokens.
- **Crypto:** stdlib RFC 6238 TOTP (`app/utils/totp.py`, pinned to published RFC vectors — **no `pyotp`**); secret Fernet-encrypted at rest with a key derived from `SECRET_KEY` (`app/utils/totp_crypto.py`, uses the already-present `cryptography`). QR is **manual key entry** in v0 (no QR library, no external image host). Recovery codes: SHA-256 one-way, shown once, single-use.
- **Security fix (critical, caught in review):** `get_current_user` now decodes with `audience="crm"` so the short-lived `mfa`/`mfa_setup` challenge tokens can no longer be replayed as full session credentials. All legitimate session mints use the default `crm` audience; the `platform` token authenticates via its own dependency — both verified unaffected.
- **Enforcement:** rate-limited `confirm`/`disable`/`regenerate`/`verify` via the existing `auth_limiter`; mandate + status proven cross-tenant-isolated (`tests/tenancy/test_2fa_cross_tenant.py`, with a positive control).
- **Migration note:** `create_missing_tables.py` adds `users.totp_secret/totp_enabled/totp_confirmed_at`, `companies.require_2fa`, and the `mfa_recovery_codes` table. **No new pip dependency. No Alembic** (two pre-existing heads — same stance as Phases 0/1). **Run `create_missing_tables.py` on deploy.**
- **Verification:** backend 2FA tests plus expired-`mfa_token` and `/2fa/verify` rate-limit coverage; `next build` / Playwright smoke that `/settings/security?setup_token=&forced=1` is reachable without a session.
- **Forced-enrollment UI (gap closed):** mandate login issues a `setup_token` and **no session cookie**. `/settings/security` is a public path in Next middleware, `RouteGuard`, Layout (no chrome while logged out), and the axios 401 interceptor, so the enroll page is not bounced to `/login`. After recovery codes, the user is sent to `/login?enrolled=true` to complete the TOTP challenge. APIs still require a session or `X-Setup-Token`.
- **Documented residuals:** `mfa_token` has no `jti`/single-use, so it is replayable within its 5-min window (each replay still needs a fresh valid code; the recovery-code path is single-use); QR image deferred (manual entry only). Logout now bumps `token_version` (0.4) so a mid-session mandate still needs a new login after logout. Pre-existing, out of scope: `app/sales/orders/page.jsx` shares the `useSearchParams`-without-`Suspense` pattern (builds clean today because it renders dynamically) — worth wrapping if it ever prerenders. The original whole-branch review agent was killed by a session limit; this follow-up closed the forced-setup hole that review never reached.

### Phase 3.2 — Meetings + call log — DONE (code)

Pulled forward after 3.1 by explicit decision. Spec: [`superpowers/specs/2026-08-25-phase3-meetings-calls-design.md`](./superpowers/specs/2026-08-25-phase3-meetings-calls-design.md); plan: [`superpowers/plans/2026-08-25-phase3-meetings-calls.md`](./superpowers/plans/2026-08-25-phase3-meetings-calls.md). Two tables (`meetings`, `call_logs`); CRUD under `/api/meetings` and `/api/calls`; UI on lead + deal detail. No telephony, no calendar sync, no Alembic, no new pip deps.

- **Verification:** 16 new tests green (`test_meetings_calls_schema.py`, `test_meetings_calls_api.py`, `test_meetings_calls_cross_tenant.py`); `next build` clean. New tables via `create_all` — **run `create_missing_tables.py` on deploy.**
- **Residuals:** follow-ups with `channel=call` remain reminders, not logged calls; no calendar sync, attendees, or click-to-call.

### Phase 3.3 — Multiple pipelines — DONE (code)

Spec: [`superpowers/specs/2026-08-25-phase3-multiple-pipelines-design.md`](./superpowers/specs/2026-08-25-phase3-multiple-pipelines-design.md). Admin/MD create extra pipelines (default stages cloned); board switches by `pipeline_id`; deals created on the selected pipeline. Cannot delete the default pipeline or one that still has deals. No deal-move-across-pipelines.

### Phase 3.4 — Saved reports + simple dashboard builder — DONE (code)

Pulled forward after 3.3 by explicit decision. Spec: [`superpowers/specs/2026-08-25-phase3-saved-reports-design.md`](./superpowers/specs/2026-08-25-phase3-saved-reports-design.md); plan: [`superpowers/plans/2026-08-25-phase3-saved-reports.md`](./superpowers/plans/2026-08-25-phase3-saved-reports.md). Named `leads_invoices` reports (date range + filters), live run, CSV of the grid, one company dashboard of kpi/chart/table widgets. Canonical UI at `/reports`. No Alembic, no new pip deps.

- **Verification:** 15 new tests (`test_saved_reports_schema.py`, `test_saved_reports_api.py`, `test_saved_reports_cross_tenant.py`). New tables via `create_all` — **run `create_missing_tables.py` on deploy.**
- **Residuals:** one report type only; no scheduled email, no drag-drop grid, no per-user dashboards. `GET /api/md/reports/custom` still exists and now shares the runner.

### Phase 3.5 — Public API keys + quota — DONE (code)

Pulled forward after 3.4 by explicit decision. Spec: [`superpowers/specs/2026-08-25-phase3-public-api-keys-design.md`](./superpowers/specs/2026-08-25-phase3-public-api-keys-design.md); plan: [`superpowers/plans/2026-08-25-phase3-public-api-keys.md`](./superpowers/plans/2026-08-25-phase3-public-api-keys.md). Dedicated `/api/v1/` (leads, clients, deals, invoices) authenticated by company-issued `crm_live_` keys (`read`/`write`); JWT management at `/api/api-keys` (admin/MD); daily quota from `plans.max_api_requests_per_day` (Starter 1000 / Growth 10000 / Enterprise unlimited). UI at `/settings/api-keys`. No Alembic, no new pip deps.

- **Verification:** 14 new tests (`test_api_keys_schema.py`, `test_api_keys_api.py`, `test_api_keys_cross_tenant.py`). New tables via `create_all`; `plans.max_api_requests_per_day` via `create_missing_tables.py` + `backfill_api_quotas`. **Run `create_missing_tables.py` on deploy.**
- **Residuals:** integer public ids; no DELETE on CRM records via the public API; no invoice PATCH.

### Phase 3.6 — Import mapper + duplicate preview — DONE (code)

Leads-only CSV: map columns (with aliases), preview new/duplicate/invalid, commit inserts new rows and skips duplicates. Existing `POST /api/import/leads` unchanged. UI: Import CSV on the shared leads list. Spec: [`superpowers/specs/2026-08-25-phase3-import-mapper-design.md`](./superpowers/specs/2026-08-25-phase3-import-mapper-design.md).

- **Verification:** `test_import_mapper.py`, `test_import_mapper_cross_tenant.py`, legacy import tests green.
- **Residuals:** no undo, no client/deal import, no saved mapping templates.

### Phase 3.7 — GST-compliant invoice — DONE (code)

India GST v0: snapshot seller GSTIN from `company_settings.gst_number` and buyer GSTIN from `clients.gstin`. Intra-state → CGST+SGST; inter-state → IGST. No seller GSTIN → legacy lump `tax` (existing 18% invoice tests unchanged). Optional line HSN. Spec: [`superpowers/specs/2026-08-25-phase3-gst-invoice-design.md`](./superpowers/specs/2026-08-25-phase3-gst-invoice-design.md).

- **Verification:** `test_gst.py`, `test_gst_invoice_api.py`, plus existing `test_leads_invoices_flow`. New columns via `create_missing_tables.py` — **run on deploy.**
- **Residuals:** no PDF layout, no e-invoice/IRN, no HSN rate table.

### Phase 3.8 — WhatsApp Business templates — DONE (code)

Gupshup template send only. Company API key + source number (key never returned). Admin/MD CRUD templates; any company user can send to an in-company lead/client phone. Spec: [`superpowers/specs/2026-08-25-phase3-whatsapp-templates-design.md`](./superpowers/specs/2026-08-25-phase3-whatsapp-templates-design.md). UI: `/settings/whatsapp` and lead detail.

- **Verification:** `test_whatsapp_schema.py`, `test_whatsapp_api.py`, `test_whatsapp_cross_tenant.py`. New tables via `create_all`; settings columns via `create_missing_tables.py` — **run on deploy.**
- **Residuals:** no Interakt, no inbound webhook, no reminder auto-send, no free-text session messages.

### Phase 3.9 — Minimal Flutter sales path — DONE (code)

Existing `flutter_app/` already covered every role. This item is the **sales field path**: login lands on leads; bottom tabs are Leads / Follow-ups / Invoices / More. Invoice list reads `items`; detail shows GST lines when `tax_mode` is set. Other roles unchanged. Spec: [`superpowers/specs/2026-08-25-phase3-flutter-sales-path-design.md`](./superpowers/specs/2026-08-25-phase3-flutter-sales-path-design.md).

- **Verification:** `flutter_app/test/sales_home_test.dart` (home path, nav index, invoice parse). Flutter SDK was not installed in this environment — run `flutter test` locally.
- **Residuals:** other roles still have full shells.

### Phase 4.1 — Products price book + tax — DONE (code)

Sellable catalog (`products`) with per-product GST snapshots on quote/invoice lines; free-text lines fall back to company `tax_rate`; stock deducts on invoice create / quote accept when a product links `stock_item_id`. Spec: [`superpowers/specs/2026-08-25-phase4-products-price-book-design.md`](./superpowers/specs/2026-08-25-phase4-products-price-book-design.md); plan: [`superpowers/plans/2026-08-25-phase4-products-price-book.md`](./superpowers/plans/2026-08-25-phase4-products-price-book.md). UI: role Products pages, invoice product picker, deal quote line editor.

- **Verification:** `test_products_schema.py`, `test_products_api.py`, `test_product_lines.py`, `test_products_gst.py`, `test_gst.py`, `test_gst_invoice_api.py`, `test_quotes.py`, `test_products_cross_tenant.py`, `test_inventory_api.py`. New table/columns via `create_missing_tables.py` — **run on deploy.**
- **Residuals:** no price books, no HSN rate table, no `product_id` on public `/api/v1`.

### Phase 4.2 — Blueprint (required stages) — DONE (code)

Opt-in per pipeline. Adjacent open moves; Lost from any open; Won from last open;
required built-in fields on leave. Spec: [`superpowers/specs/2026-08-25-phase4-blueprint-design.md`](./superpowers/specs/2026-08-25-phase4-blueprint-design.md); plan: [`superpowers/plans/2026-08-25-phase4-blueprint.md`](./superpowers/plans/2026-08-25-phase4-blueprint.md).

- **Verification:** `test_blueprint_schema.py`, `test_blueprint_service.py`, `test_blueprint_api.py`, `test_blueprint_cross_tenant.py`.
- **Deploy:** `create_missing_tables.py` for `pipelines.blueprint_enabled` and `pipeline_stages.required_fields`.
- **Residuals:** no transition-edge graph, no custom-field requirements, no approvals. Blueprint does **not** block deal **create** with an arbitrary `stage_id` (including Won) — per spec; field gates apply on the first *leave*, so readers should not assume the pipeline is sealed on create.

### Phase 4.3 — Customer portal (view invoice/quote) — DONE (code)

Staff-minted magic links; hash at rest; public view-only invoice/quote pages.
Spec: [`superpowers/specs/2026-08-25-phase4-customer-portal-design.md`](./superpowers/specs/2026-08-25-phase4-customer-portal-design.md); plan: [`superpowers/plans/2026-08-25-phase4-customer-portal.md`](./superpowers/plans/2026-08-25-phase4-customer-portal.md).

- **Verification:** `test_portal_schema.py`, `test_share_links_service.py`, `test_portal_api.py`, `test_portal_cross_tenant.py`.
- **Deploy:** `create_missing_tables.py` for `share_token_hash` / `share_created_at` on `invoices` and `quotes`. `_MISSING_COLUMNS` / `add_missing_columns` issues a plain `ALTER TABLE ADD COLUMN` only — it does **not** add a UNIQUE constraint or index on `share_token_hash`. Fresh DBs created via `create_all` get `unique=True, index=True` from the model; **existing prod DBs must run manual DDL** for portal GET lookup performance:

  ```sql
  CREATE UNIQUE INDEX IF NOT EXISTS ix_invoices_share_token_hash ON invoices (share_token_hash);
  CREATE UNIQUE INDEX IF NOT EXISTS ix_quotes_share_token_hash ON quotes (share_token_hash);
  ```

  (Multiple NULLs are fine with UNIQUE INDEX in Postgres/SQLite.)

- **Residuals:** no expiry, no email of link, no accept/pay. Rate limiting: `portal_limiter` is wired on public portal routes at **60 requests / 60 seconds per IP**.

### Phase 4.4 — Forecasting (quota vs pipeline) — DONE (code)

Per-user monthly quotas compared to closed-won and weighted open pipeline. Spec: [`superpowers/specs/2026-08-25-phase4-forecasting-design.md`](./superpowers/specs/2026-08-25-phase4-forecasting-design.md); plan: [`superpowers/plans/2026-08-25-phase4-forecasting.md`](./superpowers/plans/2026-08-25-phase4-forecasting.md). UI: `/reports/forecast` (sidebar Forecast link for admin/md/manager/sales).

- **Verification:** `test_forecasting_schema.py`, `test_forecasting_service.py`, `test_forecasting_api.py`, `test_forecasting_cross_tenant.py`, `test_deals_board.py` (`test_board_weighted_forecast_arithmetic`).
- **Deploy:** `create_missing_tables.py` / `create_all` for `sales_quotas` — **run on deploy.**
- **Residuals:** UTC calendar months only (no company timezone). Unassigned deals (`assigned_to_id IS NULL`) excluded from per-user metrics. No forecast categories, team quotas, or quarterly/annual periods. Deals board UI unchanged (pipeline-level forecast only).

### Phase 4.5 — Territory assignment — DONE (code)

Route new unassigned leads to a team via `service_type` / `source` rules, then round-robin sales on that team; workflow RR remains fallback when no territory matches. Spec: [`superpowers/specs/2026-08-25-phase4-territory-assignment-design.md`](./superpowers/specs/2026-08-25-phase4-territory-assignment-design.md); plan: [`superpowers/plans/2026-08-25-phase4-territory-assignment.md`](./superpowers/plans/2026-08-25-phase4-territory-assignment.md). UI: `/settings/territories` (sidebar Settings → Territories for admin/md).

- **Verification:** `test_territory_schema.py`, `test_territory_service.py`, `test_territory_api.py`, `test_territory_cross_tenant.py`, `test_workflows.py`.
- **Deploy:** `create_missing_tables.py` / `create_all` for `territories` and `territory_rules` — **run on deploy.**
- **Residuals:** no geo/pincode; OR rules only (not AND); no reassign on lead update; manager cannot configure territories in v0; explicit `team_id` on lead create is not overridden by territory.

### Phase 4.6 — Sandbox — DONE (code)

Separate empty sandbox tenant (`is_sandbox` + `sandbox_parent_id`). Admin/MD create one sandbox per live company; dedicated `sandbox.{parent}.{token}@sandbox.local` admin (password once); destroy suspends + disables users. Billing checkout blocked. Spec: [`superpowers/specs/2026-08-25-phase4-sandbox-design.md`](./superpowers/specs/2026-08-25-phase4-sandbox-design.md); plan: [`superpowers/plans/2026-08-25-phase4-sandbox.md`](./superpowers/plans/2026-08-25-phase4-sandbox.md). UI: `/settings/sandbox` + amber banner when `is_sandbox`.

- **Verification:** `test_sandbox_schema.py`, `test_sandbox_service.py`, `test_sandbox_api.py`, `test_sandbox_cross_tenant.py` (13 tests).
- **Deploy:** `create_missing_tables.py` for `companies.is_sandbox` / `sandbox_parent_id`.
- **Residuals:** ~~no data clone~~ **closed by 5.9**; no in-session company switch, no credential email, no expiry.

### Phase 4.7 — SSO (Google / Microsoft) — DONE (code)

OAuth login for **existing** users only (match email; persist `oauth_identities`). Google + Microsoft; SAML deferred. Env: `PUBLIC_API_URL`, `GOOGLE_OAUTH_*`, `MICROSOFT_OAUTH_*`. Spec: [`superpowers/specs/2026-08-25-phase4-sso-design.md`](./superpowers/specs/2026-08-25-phase4-sso-design.md); plan: [`superpowers/plans/2026-08-25-phase4-sso.md`](./superpowers/plans/2026-08-25-phase4-sso.md). Login UI shows provider buttons when configured.

- **Verification:** `test_oauth_schema.py`, `test_oauth_service.py`, `test_oauth_api.py` (12 tests).
- **Deploy:** `create_all` / `create_missing_tables.py` for `oauth_identities`; set OAuth env + redirect URIs to `{PUBLIC_API_URL}/api/auth/oauth/{google|microsoft}/callback`.
- **Residuals:** no SAML, no SSO signup, no unlink UI, no Apple.

---

## Phase 6 — Competitor parity (what buyers still feel missing)

> After Phases 0–4, core CRM modules exist in code. This phase closes the gaps where
> **HubSpot, Pipedrive, Freshsales, and Kylas/LeadSquared** still win trials.
> Spec/plan per item before coding (same pattern as 3.x / 4.x). **Intent: build all 6.x.**

### Phase 6.1 — Gmail / Outlook sync + send/log — DONE (code)

Per-user mailbox OAuth (Gmail send+readonly / Graph Mail.Send+Mail.Read); send from CRM uses mailbox when connected else SMTP; inbound/outbound matching lead/client/deal emails logged on `email_logs`. Spec: [`superpowers/specs/2026-08-25-phase6-gmail-outlook-design.md`](./superpowers/specs/2026-08-25-phase6-gmail-outlook-design.md); plan: [`superpowers/plans/2026-08-25-phase6-gmail-outlook.md`](./superpowers/plans/2026-08-25-phase6-gmail-outlook.md). UI: `/settings/email`, lead + deal email panels.

- **Verification:** `tests/sales/test_mailbox.py` + existing `test_crm_email.py`.
- **Deploy:** `create_missing_tables.py` for `mailbox_connections` and `email_logs` columns; add OAuth redirect URIs `{PUBLIC_API_URL}/api/mailbox/oauth/{google|microsoft}/callback` (same client IDs as login SSO, extra mail scopes).
- **Residuals:** open/click tracking, attachments, Gmail historyId / Graph delta, shared inbox.

### Phase 6.2 — Google / Microsoft Calendar sync — DONE (code)

CRM→calendar only. Per-user `calendar_connections` (separate from mailbox). Create/update/delete of meetings push to Google Calendar or Outlook; missing `ends_at` defaults to 60 minutes. Calendar API failure does not fail the meeting write. Spec: [`superpowers/specs/2026-08-25-phase6-calendar-sync-design.md`](./superpowers/specs/2026-08-25-phase6-calendar-sync-design.md); plan: [`superpowers/plans/2026-08-25-phase6-calendar-sync.md`](./superpowers/plans/2026-08-25-phase6-calendar-sync.md). UI: `/settings/calendar` + meeting panel hint.

- **Verification:** `tests/sales/test_calendar_sync.py` + existing meetings tests.
- **Deploy:** `create_missing_tables.py` for `calendar_connections` and `meetings.calendar_*`; add OAuth redirect URIs `{PUBLIC_API_URL}/api/calendar/oauth/{google|microsoft}/callback` and enable Calendar API / Calendars.ReadWrite.
- **Residuals:** inbound sync, attendees, Meet/Teams conference links.

### Phase 6.3 — Click-to-call / telephony — DONE (code)

Exotel Connect only (Twilio deferred). Company SID + encrypted API token + ExoPhone; click-to-call dials agent (`users.phone` or `from_phone`) then customer; writes `call_logs` with `provider_call_id`; webhook updates duration/outcome. Spec: [`superpowers/specs/2026-08-25-phase6-click-to-call-design.md`](./superpowers/specs/2026-08-25-phase6-click-to-call-design.md). UI: `/settings/telephony`, Call on lead + meeting panel.

- **Verification:** `tests/sales/test_telephony.py` (8 tests).
- **Deploy:** `create_missing_tables.py`; set Exotel StatusCallback to `{PUBLIC_API_URL}/api/telephony/exotel/webhook`; agents need `users.phone`.
- **Residuals:** Twilio, inbound DID, recordings UI, WebRTC dialer.

### Phase 6.4 — Unified activity timeline — DONE (code)

Projected feed (no extra table): `GET /api/timeline/{lead|client|deal}/{id}` unions email, call, meeting, note, task, follow-up, WhatsApp, and audit, sorted by `occurred_at`. Missing parent → 404. Invoice/task/user keep audit-only. Spec: [`superpowers/specs/2026-08-25-phase6-activity-timeline-design.md`](./superpowers/specs/2026-08-25-phase6-activity-timeline-design.md). UI: `ActivityFeed` on lead + deal; compose panels keep forms and hide duplicate lists.

- **Verification:** `tests/sales/test_activity_timeline.py` (5 tests).
- **Residuals:** infinite scroll / kind filters.

### Phase 6.5 — One object UI (collapse role apps) — DONE (code)

Role prefixes stay (`/sales`, `/manager`, `/md`); object screens are shared components. Spec: [`superpowers/specs/2026-08-25-phase6-one-object-ui-design.md`](./superpowers/specs/2026-08-25-phase6-one-object-ui-design.md). Client record includes ActivityFeed. Deals in sales/manager/MD nav.

- **Verification:** `frontend/lib/objectPaths.test.cjs` (4 tests).
- **Residuals:** purchase invoice payment UI still separate (`/purchase/invoices`); MD `/md/clients` remains analytics (not a list); invoice *lists* still role-specific.

### Phase 6.6 — Portal pay + quote accept — DONE (code)

Magic-link customers can **Pay now** on a shared invoice and **Accept/Reject** a shared quote. Razorpay payment links when keys are set; otherwise stub `/p/pay/{token}`. Paid via webhook `payment_link.paid` / `payment.captured` (`notes.crm_invoice_id`) or stub complete. Spec: [`superpowers/specs/2026-08-25-phase6-portal-pay-design.md`](./superpowers/specs/2026-08-25-phase6-portal-pay-design.md).

- **Verification:** `tests/portal/test_portal_actions.py` + webhook invoice-paid test.
- **Deploy:** Razorpay keys + webhook URL `{PUBLIC_API_URL}/api/billing/webhook` with `payment_link.paid` / `payment.captured`.
- **Residuals:** Stripe; emailing the link from the server.

### Phase 6.7 — WhatsApp inbound + auto sequences — DONE (code)

Gupshup inbound `POST /api/whatsapp/webhook` (always 204). Match company by destination/`?source=` vs `whatsapp_source`; match lead/client by phone; log inbound with a 24h session. Cadence day-1 becomes WhatsApp when `whatsapp_cadence_template_id` is set; `POST /api/reminders/run` sends that template for pending `channel=whatsapp` follow-ups (including cadence rows with no owner). Session text: `POST /api/whatsapp/session-send`. Spec: [`superpowers/specs/2026-08-25-phase6-whatsapp-inbound-design.md`](./superpowers/specs/2026-08-25-phase6-whatsapp-inbound-design.md).

- **Verification:** `tests/sales/test_whatsapp_inbound.py`.
- **Deploy:** point Gupshup callback to `{PUBLIC_API_URL}/api/whatsapp/webhook?source=<whatsapp_source>`; run `create_missing_tables.py` for new columns.
- **Residuals:** Interakt; media inbound; webhook HMAC.

### Phase 6.8 — Mobile store release + mobile 2FA — DONE (code)

Flutter login honors TOTP challenges (`mfa_required` / `mfa_setup_required`), verify + enroll screens, Profile → 2FA, Bearer token in secure storage. Sales field path is still the v1 listing. Spec: [`superpowers/specs/2026-08-25-phase6-mobile-2fa-store-design.md`](./superpowers/specs/2026-08-25-phase6-mobile-2fa-store-design.md). Play/App copy and `flutter create` steps: [`flutter_app/store/STORE_RELEASE.md`](../flutter_app/store/STORE_RELEASE.md).

- **Verification:** `flutter_app/test/mfa_login_test.dart` + existing `sales_home_test.dart`. Flutter SDK was not in this environment — run `flutter test` locally.
- **Deploy residual:** generate `android/` + `ios/` with `flutter create`, sign, upload AAB/IPA from Play Console / App Store Connect (credentials not in repo).
- **Residuals:** no QR enroll UI; no App Store/Play upload from CI.

### Phase 6.9 — In-app onboarding — DONE (code)

Checklist on sales / manager / MD dashboards until complete or dismissed: sample leads, CSV import, mailbox, website form, quote. `POST /api/onboarding/sample-data` seeds 3 leads + 1 deal (idempotent). Spec: [`superpowers/specs/2026-08-25-phase6-onboarding-design.md`](./superpowers/specs/2026-08-25-phase6-onboarding-design.md).

- **Verification:** `tests/sales/test_onboarding.py`.
- **Deploy:** `create_missing_tables.py` for `company_settings.onboarding_dismissed`.
- **Residuals:** no product tour; dismiss is company-wide.

### Phase 6.10 — Postgres RLS (Phase 0.1) — DONE (code)

`SET LOCAL` via `set_config(..., true)` on each transaction (`after_begin`). Tenant tables with `company_id` get FORCE RLS; login/bootstrap tables excluded. Platform admin and public webhooks/portal/auth bypass. Spec: [`superpowers/specs/2026-08-25-phase6-postgres-rls-design.md`](./superpowers/specs/2026-08-25-phase6-postgres-rls-design.md).

- **Verification:** `tests/tenancy/test_rls.py` (SQLite no-op). Policies are not exercised in CI (no Postgres).
- **Deploy:** run `create_missing_tables.py` against Postgres so `enable_rls` installs policies.
- **Residuals:** `/api/v1` bypasses for the whole request (API key lookup); no second DB role.

### Phase 6.11 — Landing honesty — DONE

Removed fabricated testimonials, volume claims, Stripe/QB/Slack/Zapier strip, and footer `#` links. Copy matches shipped Gmail/Outlook/Calendar/WhatsApp/Razorpay + 14-day trial. Spec: [`superpowers/specs/2026-08-25-phase6-landing-honesty-design.md`](./superpowers/specs/2026-08-25-phase6-landing-honesty-design.md).

- **Verification:** `cd frontend && npm run test:landing`.
- **Residuals:** no pricing/legal pages; no real customer quotes yet.

### Phase 6.12 — Brand drift — DONE

Buyer-facing name is Perioxia CRM: auth footers, npm package `perioxia-crm-frontend`, OpenAPI `Perioxia CRM API`. Spec: [`superpowers/specs/2026-08-25-phase6-brand-drift-design.md`](./superpowers/specs/2026-08-25-phase6-brand-drift-design.md).

- **Verification:** `cd frontend && npm run test:brand`.
- **Residuals:** git directory may still be `CRM-`; README body still describes a generic multi-tenant OS.

### Phase 6.13 — Accounts vs Contacts — DONE

Optional `accounts` row (buyer company) with `clients.account_id`. Client remains the contact. Spec: [`superpowers/specs/2026-08-25-phase6-accounts-contacts-design.md`](./superpowers/specs/2026-08-25-phase6-accounts-contacts-design.md).

- **Verification:** `tests/sales/test_accounts.py`.
- **Deploy:** `create_missing_tables.py` (`accounts` table + `clients.account_id`).
- **Residuals:** free-text `clients.company` is not auto-migrated; no Account on Deal/Lead.

### Phase 6.14 — Saved filters / due views — DONE

`view=due_today|rotting` on deal list/board. Named per-user `saved_filters` (`/api/saved-filters`). Deals board pills + save/apply. Spec: [`superpowers/specs/2026-08-25-phase6-saved-filters-design.md`](./superpowers/specs/2026-08-25-phase6-saved-filters-design.md).

- **Verification:** `tests/sales/test_saved_filters.py`.
- **Deploy:** `create_missing_tables.py` for `saved_filters`.
- **Residuals:** deal-only; rotting is `updated_at` age, not last activity; no email nag.

### Phase 6.15 — Outbound webhooks — DONE

Company HTTPS endpoints with HMAC (`X-Perioxia-Signature`). Events: `lead.created`, `deal.stage_changed`, `invoice.paid`. Failed posts retry via `POST /api/webhooks/retry` (max 3). Spec: [`superpowers/specs/2026-08-25-phase6-outbound-webhooks-design.md`](./superpowers/specs/2026-08-25-phase6-outbound-webhooks-design.md).

- **Verification:** `tests/sales/test_outbound_webhooks.py`.
- **Deploy:** `create_missing_tables.py` (`webhook_endpoints`, `webhook_deliveries`).
- **Residuals:** no worker/queue (retry is on-demand); purchase “mark paid” path may not emit if it bypasses `invoice_pay`.

### Phase 6.16 — Invoice PDF + e-invoice/IRN — DONE

Stdlib GST tax-invoice PDF (`GET /api/invoices/{id}/pdf`) and IRN path when both GSTINs exist (`POST /api/invoices/{id}/einvoice`, SHA-256 stub, not live NIC). Spec: [`superpowers/specs/2026-08-25-phase6-invoice-pdf-irn-design.md`](./superpowers/specs/2026-08-25-phase6-invoice-pdf-irn-design.md).

- **Verification:** `tests/finance/test_invoice_pdf_irn.py`.
- **Deploy:** `create_missing_tables.py` (`invoices.irn/ack_no/ack_date/signed_qr`).
- **Residuals:** no live IRP/NIC call; no signed QR image; quote PDF not in this item.

### Phase 6.17 — Live chat / website widget → lead — DONE

Embeddable iframe widget (`/w/{slug}`) that creates a lead with `source=Website widget`. Not live agent chat. Spec: [`superpowers/specs/2026-08-25-phase6-website-widget-design.md`](./superpowers/specs/2026-08-25-phase6-website-widget-design.md).

- **Verification:** `tests/sales/test_website_widget.py`.
- **Residuals:** no two-way chat, no bot; snippet copy lives on the leads list.

### Phase 6.18 — SAML / enterprise SSO — DONE

Company IdP metadata; SP-initiated Redirect + POST ACS; email must match an existing user in that company. Spec: [`superpowers/specs/2026-08-25-phase6-saml-sso-design.md`](./superpowers/specs/2026-08-25-phase6-saml-sso-design.md).

- **Verification:** `tests/auth/test_saml_sso.py`.
- **Deploy:** `create_all` for `saml_configs`. ACS `{PUBLIC_API_URL}/api/auth/saml/{company_code}/acs`.
- **Residuals:** not exclusive-C14N XML-DSig (RSA over NameID+email); no SLO/JIT; unknown company code on start is HTTP 404.

### Phase 6.19 — GDPR / DPDP — DONE

Admin/MD export and erase PII on leads and clients; invoices kept. Staff `GET /api/privacy/me`. Trashed-lead retention days + on-demand apply. Spec: [`superpowers/specs/2026-08-25-phase6-gdpr-dpdp-design.md`](./superpowers/specs/2026-08-25-phase6-gdpr-dpdp-design.md).

- **Verification:** `tests/privacy/test_gdpr_dpdp.py`.
- **Deploy:** `create_missing_tables.py` (`company_settings.retention_days`, `privacy_requests`).
- **Residuals:** no scheduler; no invoice deletion; not a full DPDP consent/notice pack.

### Phase 6.20 — Alembic two-heads cleanup — DONE

The old two heads were already merged at `13a3c2d1e5b7`. Unique head is now `016_schema_catchup` (idempotent `create_all` + missing columns + RLS). Helper lives in `app/schema_sync.py` so importing it does not mutate the live DB. `create_missing_tables.py` still seeds plans when run as a script. Backend-root `tmp_*` / `check_*` / `test_*.py` one-offs removed. Spec: [`superpowers/specs/2026-08-25-phase6-alembic-heads-design.md`](./superpowers/specs/2026-08-25-phase6-alembic-heads-design.md).

- **Verification:** `tests/ops/test_alembic_heads.py`; `alembic heads` → `016_schema_catchup`.
- **Deploy:** `alembic upgrade head` and/or `python create_missing_tables.py` (both idempotent). Stamp existing prod DBs if Alembic version is behind: `alembic stamp 015_ai_reasoning` then upgrade, or upgrade through 016 (catch-up is idempotent).
- **Residuals:** 001–015 are not a full replay of today’s schema; 016 is the catch-up. No autogenerated table-by-table diff.

---

## Phase 5 — Paid add-ons (build after or interleaved with 6 if demanded)

### Phase 5.1 — Data enrichment — DONE

Domain-stub enrich (no Clearbit HTTP). Empty fields only. Spec: [`superpowers/specs/2026-08-26-phase5-data-enrichment-design.md`](./superpowers/specs/2026-08-26-phase5-data-enrichment-design.md).

- **Verification:** `tests/sales/test_enrichment.py`; `tests/ops/test_alembic_heads.py` (head `017_enrichment`).
- **Deploy:** `alembic upgrade head` and/or `python create_missing_tables.py`.
- **Residuals:** no live vendor; no plan entitlement; no client-contact enrich.

### Phase 5.2 — Lead / deal scoring — DONE (code)

Admin-configurable, deterministic point rules on leads **and** deals; one shared
pure engine + explainable breakdown. ML/predictive is deliberately left to 5.3.
Spec: [`superpowers/specs/2026-08-26-phase5-lead-deal-scoring-design.md`](./superpowers/specs/2026-08-26-phase5-lead-deal-scoring-design.md);
plan: [`superpowers/plans/2026-08-26-phase5-lead-deal-scoring.md`](./superpowers/plans/2026-08-26-phase5-lead-deal-scoring.md).

- **Model/engine:** `scoring_rules` (company-scoped, `entity_type` lead|deal, field/operator/value/points/is_active). Pure `app/services/scoring/engine.py` (`score_entity → {total, breakdown}`), total-safe (a bad rule never crashes a recompute). Field whitelist + per-field operator gating enforced at rule-create (400 on unknown field / invalid operator). Computed fields `days_since_last_contact` / `age_days` / `days_to_expected_close` with a `10**6` NULL sentinel. `app/services/scoring/recompute.py` persists `leads.score` / `deals.score`.
- **API:** `/api/scoring/rules` CRUD + `/api/scoring/recompute` (admin/MD, cross-tenant 404); `GET /api/leads/{id}/score` + `GET /api/deals/{id}/score` live breakdown (any company user). Score persisted on lead/deal create+update (+ deal stage move), and on any rule change (bulk recompute of that type). Lead/deal lists gain `score` + `?sort=score` + `?min_score=`. Privacy: lead export includes `score`, erase nulls it.
- **UI:** `/settings/scoring` rule CRUD (entity toggle, field→operator dropdowns, recompute button); `ScoreBadge` with expandable breakdown on lead + deal detail.
- **Verification:** `tests/sales/test_scoring_{schema,engine,recompute,api,detail,persist,cross_tenant}.py`, `tests/privacy/test_scoring_privacy.py`, `tests/ops/test_alembic_heads.py` — **34 new tests green.** (Suite has 3 pre-existing unrelated reds — accept-invite sanitize, api-key UTC-day quota, reminder due-follow-up — confirmed failing on baseline before this work.)
- **Migration note:** current unique head was **`018_token_version`** (the 5.1 spec text said `017_enrichment`; wrong). New revision **`019_scoring`** chains off `018_token_version`. New table via `create_all`; `leads/deals.score` + `score_updated_at` via `MISSING_COLUMNS`. **Run `alembic upgrade head` and/or `python create_missing_tables.py` on deploy.**
- **Residuals:** no scheduler — recency-based scores are "as of last recompute" (drift until next write / bulk recompute); no custom-field rules (whitelist only); no score history; scores may go negative by design; deals board UI unchanged (badge is on deal detail).

### Phase 5.3 — Predictive AI (convert / churn) — DONE (code)

Per-company **trained** deal win-probability + **derived** client churn risk, stdlib
only (no ML dep). Spec: [`superpowers/specs/2026-08-26-phase5-predictive-ai-design.md`](./superpowers/specs/2026-08-26-phase5-predictive-ai-design.md);
plan: [`superpowers/plans/2026-08-26-phase5-predictive-ai.md`](./superpowers/plans/2026-08-26-phase5-predictive-ai.md).

- **Convert (trained):** a log-odds scorecard (Naive-Bayes style, chosen over gradient-descent LR for small-data robustness — flagged in spec) fit from the company's closed deals (WON/LOST). Features `source` / `amount_band` / `has_client` / `has_owner`, smoothed win-rates; leakage-avoided (no current stage/probability). `< 10` closed deals or single-class → `model:"fallback"` (base rate, no fake confidence). Stored per company in `prediction_models` (params JSON); prediction computed **live** from the stored card — no per-deal column, no write hooks. `predict_deal` lazy-trains and never 500s.
- **Churn (derived):** stateless RFM over a client's invoices — recency ÷ the client's own median inter-invoice interval → risk 0–1 + band. Single invoice → recency-vs-180d; zero invoices → not a churn subject.
- **API:** `POST /api/predictions/train`, `GET /api/predictions/models` (admin/MD), `GET /api/predictions/churn` (ranked at-risk), `GET /api/deals/{id}/prediction`, `GET /api/clients/{id}/churn`. Company-scoped, foreign id → 404, positive-control tenancy tests.
- **UI:** `/settings/predictions` (train button, learned win-rates, at-risk-clients list); `PredictionBadge` (win % + factors) on deal detail; `ChurnBadge` (band + reasons) on client detail.
- **Verification:** `tests/sales/test_predict_{scorecard,churn,convert_service}.py`, `test_predictions_{api,detail,cross_tenant}.py`, `test_prediction_schema.py`, `tests/ops/test_alembic_heads.py` — **23 new tests green**; `next build` clean. (Same 3 pre-existing unrelated reds as 5.2 — confirmed on baseline, not from this work.)
- **Migration note:** new head **`020_predictions`** off `019_scoring`. New table via `create_all`; **no** new columns on existing tables. **Run `alembic upgrade head` and/or `python create_missing_tables.py` on deploy.**
- **Residuals:** no scheduled retrain (train on demand); no lead-convert model (deal win-prob is the convert signal; same engine extends later); no stored win-prob column / list sort; churn is client-level (not account); no neural/LLM. Scorecard needs ≥10 closed deals with both classes before it beats the base rate.

### Phase 5.4 — Tally / QuickBooks sync — DONE (code)

One-way CRM→accounting invoice push behind a stub Tally / QuickBooks adapter
(no live HTTP, same pattern as 5.1 enrich and 6.16 IRN). Spec:
[`superpowers/specs/2026-08-26-phase5-accounting-sync-design.md`](./superpowers/specs/2026-08-26-phase5-accounting-sync-design.md).

- **Model:** `accounting_connections` (one per company, `tally|quickbooks`,
  connected/disconnected) and `accounting_sync_items` (invoice mapping,
  `external_id` + `payload_hash` for idempotency). No new columns on `invoices`.
- **Engine:** `app/services/accounting/payloads.py` (Tally sales voucher /
  QBO Invoice JSON) + `service.py` (`connect` / `sync_invoice` / `sync_all`).
  Eligible statuses Pending/Paid/Overdue; Draft/Cancelled skipped. Unchanged
  hash is a no-op (`unchanged: true`).
- **API:** `/api/accounting/connection` GET/PUT/DELETE + `/sync` + `/items`
  (admin/MD); `GET|POST /api/invoices/{id}/accounting|sync` (same invoice
  scope as GET). Foreign invoice → 404. Sync while disconnected → 400.
- **UI:** `/settings/accounting`; Sync button + status on invoice detail.
- **Verification:** `tests/finance/test_accounting_{schema,payloads,service,api,invoice,cross_tenant}.py`,
  `tests/ops/test_alembic_heads.py` — **23 new tests green** plus Alembic head `021_accounting`.
- **Migration:** head **`021_accounting`** off `020_predictions`. New tables via
  `create_all`. **Run `alembic upgrade head` and/or `python create_missing_tables.py` on deploy.**
- **Residuals:** no live Tally XML-RPC / QBO OAuth; no pull from books; no
  ledger_entries export; no scheduler; no Zoho Books.

### Phase 5.5 — Custom modules — DONE (code)

Company-defined objects (not extra fields on leads). Spec:
[`superpowers/specs/2026-08-26-phase5-custom-modules-design.md`](./superpowers/specs/2026-08-26-phase5-custom-modules-design.md).

- **Model:** `custom_modules` / `custom_module_fields` / `custom_module_records`
  (`title` + JSON values). Caps 10 modules / 20 fields. Reserved slugs for
  built-in objects. Field types reused from custom fields (`text|number|date|picklist`).
- **API:** `/api/modules` CRUD (admin/MD create/patch/delete); any company user
  lists active modules and CRUD records. Foreign id → 404. Inactive module
  blocks writes.
- **UI:** `/settings/modules`; `/modules` + `/modules/[slug]`; sidebar lists
  active modules like ledgers.
- **Verification:** `tests/sales/test_custom_module{s,_schema,_service,_api,_cross_tenant}.py`
  — **14 new tests green** plus Alembic head `022_custom_modules`.
- **Migration:** head **`022_custom_modules`** off `021_accounting`. **Run
  `alembic upgrade head` and/or `python create_missing_tables.py` on deploy.**
- **Residuals:** no lookups to leads, no per-module ACL, no import, no workflows
  on custom records, no layouts.

### Phase 5.6 — Marketplace — DONE (code)

First-party app catalog + per-company install, not a third-party store
(roadmap §7). Spec:
[`superpowers/specs/2026-08-26-phase5-marketplace-design.md`](./superpowers/specs/2026-08-26-phase5-marketplace-design.md).

- **Catalog:** nine locked slugs (`scoring`, `predictions`, `accounting`,
  `custom_modules`, `email`, `calendar`, `whatsapp`, `telephony`,
  `webhooks`) in `app/services/marketplace/catalog.py`. Unknown slug → 400.
- **Model:** `marketplace_installs` unique `(company_id, app_slug)`.
  Install is idempotent; uninstall keeps the row as `uninstalled`.
- **API:** `/api/marketplace/apps` (any company user) +
  `POST …/apps/{slug}/install` and `DELETE …/apps/{slug}` (admin/MD) +
  `GET /installs`. Company B does not see A’s installs (404 on uninstall
  of an app B never installed).
- **UI:** `/settings/marketplace`; link from Settings.
- **Verification:** `tests/sales/test_marketplace_{schema,catalog,service,api,cross_tenant}.py`,
  `tests/ops/test_alembic_heads.py` — **14 new tests green** plus Alembic
  head `023_marketplace`.
- **Migration:** head **`023_marketplace`** off `022_custom_modules`.
  **Run `alembic upgrade head` and/or `python create_missing_tables.py` on deploy.**
- **Residuals:** no third-party developers, OAuth app store, billed add-on
  SKUs, or sandboxed code.

### Phase 5.7 — Email campaigns — DONE (code)

Integrate with existing CRM send (`deliver_and_log`), do not clone
Mailchimp/Zoho Campaigns (roadmap §7). Spec:
[`superpowers/specs/2026-08-26-phase5-campaigns-design.md`](./superpowers/specs/2026-08-26-phase5-campaigns-design.md).

- **Model:** `email_campaigns` (draft|sent, audience `leads|clients`)
  and `email_campaign_recipients`. No new columns on `email_logs`.
- **Send:** each eligible address goes through SMTP/mailbox. Skip
  empty emails; dedupe by address; cap **50**. Send-once. Zero
  eligible → 400.
- **API:** `/api/campaigns` GET any company user; POST/send/DELETE
  admin/MD. Foreign id → 404.
- **UI:** `/campaigns`; Settings card; sidebar link.
- **Verification:** `tests/sales/test_campaign_schema.py`,
  `test_campaigns_{service,api,cross_tenant}.py`,
  `tests/ops/test_alembic_heads.py` — **13 new tests green** plus Alembic
  head `024_campaigns`.
- **Migration:** head **`024_campaigns`** off `023_marketplace`.
  **Run `alembic upgrade head` and/or `python create_missing_tables.py` on deploy.**
- **Residuals:** no journeys, open/click tracking, designer, scheduled
  send, live ESP. **5.10** is the capped one-shot blast (no campaign row).

### Phase 5.8 — Helpdesk / cases — DONE (code)

Thin client requests + web-to-case, not Zoho Desk (roadmap §7). Spec:
[`superpowers/specs/2026-08-26-phase5-cases-design.md`](./superpowers/specs/2026-08-26-phase5-cases-design.md).

- **Model:** `support_cases` (`open|pending|closed`, source `crm|web`,
  optional `client_id`) and `web_to_case_forms` (one slug per company).
- **Web-to-case:** `GET/POST /api/public/cases/{slug}` with honeypot +
  rate limit (same as lead forms). Matching client email links the case.
- **API:** `/api/cases` any company user create/list/patch status;
  DELETE admin/MD. Foreign id → 404. `GET|PATCH /form` for the public
  slug.
- **UI:** `/cases`, client-detail panel, `/c/[slug]`, Settings card,
  sidebar. `/cases` (and `/campaigns`, `/modules`) are shared routes.
- **Verification:** `tests/sales/test_cases_{schema,service,api,cross_tenant}.py`,
  `test_web_to_case.py`, `tests/ops/test_alembic_heads.py` — **17 new
  tests green** plus Alembic head `025_cases`.
- **Migration:** head **`025_cases`** off `024_campaigns`.
  **Run `alembic upgrade head` and/or `python create_missing_tables.py` on deploy.**
- **Residuals:** no SLAs, agent workspace, email-to-case, CSAT, or
  customer ticket portal.

### Phase 5.9 — Deep sandbox data clone — DONE (code)

Clone a capped CRM snapshot into the 4.6 sandbox tenant at create.
Spec: [`superpowers/specs/2026-08-26-phase5-sandbox-clone-design.md`](./superpowers/specs/2026-08-26-phase5-sandbox-clone-design.md).

- **Copy:** pipelines/stages, products, custom fields, accounts, clients,
  leads (not deleted), deals, quotes, invoices, scoring rules, custom
  modules. **100 rows/table.** User FKs → sandbox admin. Share tokens
  and `team_id` cleared. New lead-form slug (parent public URL not
  copied).
- **Never copied:** users/passwords, billing, mailbox/OAuth/API keys,
  documents, email logs, webhooks, campaigns, cases.
- **API:** `POST /api/sandbox` 201 includes `cloned` counts. Parent
  rows unchanged; parent lead id 404 from sandbox.
- **UI:** settings copy + cloned totals after create.
- **Verification:** `tests/company/test_sandbox_clone.py` plus existing
  sandbox suite — **17 tests green** (4 new). No new Alembic head.
- **Residuals:** no re-sync, no file clone, no in-session switch.

### Phase 5.10 — Mass email (capped) — DONE (code)

One-shot blast through `deliver_and_log`, tighter caps than 5.7
campaigns. Spec:
[`superpowers/specs/2026-08-26-phase5-mass-email-design.md`](./superpowers/specs/2026-08-26-phase5-mass-email-design.md).

- **Caps:** 25 eligible recipients per POST; 100 successful sends per
  company per UTC day. Admin/MD only.
- **Target:** `audience=leads|clients` or explicit `lead_ids` /
  `client_ids` (exactly one). Foreign ids → 400.
- **Model:** `mass_email_blasts`. Recipients are existing `email_logs`.
- **API:** `GET|POST /api/mass-email`. Sales → 403.
- **UI:** `/mass-email`; Settings card; sidebar.
- **Verification:** `tests/sales/test_mass_email_{schema,service,api,cross_tenant}.py`,
  `tests/ops/test_alembic_heads.py` — **10 new tests green** plus Alembic
  head `026_mass_email`.
- **Migration:** head **`026_mass_email`** off `025_cases`.
  **Run `alembic upgrade head` and/or `python create_missing_tables.py` on deploy.**
- **Residuals:** no schedule, unsubscribe, CSV upload, or attachments.

---

## Phase 7 — Trial defense (thin edges vs HubSpot / Zoho / Pipedrive)

**Status: ⏳ PENDING.** Spec: [`superpowers/specs/2026-08-26-phase7-trial-defense-design.md`](./superpowers/specs/2026-08-26-phase7-trial-defense-design.md); index plan: [`superpowers/plans/2026-08-26-phase7-trial-defense.md`](./superpowers/plans/2026-08-26-phase7-trial-defense.md).

Phases 0–6 are in code. This phase closes **first-week trial** gaps. It does **not** clone HubSpot Marketing Hub or Zoho Desk.

**Intent: build 7.1–7.12 in order.** Spec + plan per item (same as 6.x). Live Tally/NIC fail closed without credentials.

### Phase 7.1 — Email open / click tracking — DONE (code)

`deliver_and_log` mints one opaque token per kind (open / click), stores only the SHA-256 hash on `email_logs`, and injects a 1×1 pixel plus click-wrapped links into the HTML actually sent — SMTP and mailbox (Gmail/Graph now send HTML). Stored `EmailLog.body` keeps the original text. Public `GET /api/public/track/o/{token}.gif` always returns a GIF (unknown token: no increment, no existence leak); `GET /api/public/track/c/{token}?u=&s=` verifies an HMAC over the target before a 302 and 404s otherwise, so the redirect cannot be reused as an open redirect. `open_count` / `click_count` ride on `serialize_email` and move by a single SQL `UPDATE … COALESCE + 1`, so concurrent hits cannot lose each other; hashes never leave the database. Tracking is off (no injection, NULL hashes) whenever `PUBLIC_API_URL` is empty, loopback, or scheme-less — the setting ships as `http://localhost:8000`, so an unconfigured install sends links unwrapped instead of rewriting them to localhost. Campaigns and mass email inherit it for free. Spec: [`superpowers/specs/2026-08-26-phase7-email-tracking-design.md`](./superpowers/specs/2026-08-26-phase7-email-tracking-design.md); plan: [`superpowers/plans/2026-08-26-phase7-email-tracking.md`](./superpowers/plans/2026-08-26-phase7-email-tracking.md).

- **Verification:** `tests/sales/test_email_tracking.py` (17 tests: pixel increment, click 302 + increment, original body preserved, unknown token GIF, unknown/tampered click 404, cross-tenant isolation, counts-not-hashes serialization, no-injection across 7 unusable bases including the shipped localhost default, non-loopback base injects, mailbox transport) + `tests/ops/test_alembic_heads.py` (single head `027_email_tracking`). Existing `test_crm_email.py`, `test_mailbox.py`, campaigns, mass email, and portal suites still pass; 3 suite failures (`test_accept_invite_internal_error_is_sanitized`, `test_quota_429_then_next_utc_day_allowed`, `test_due_follow_up_notifies_owner`) are pre-existing on `main` and unrelated.
- **Deploy:** `alembic upgrade head` (`027_email_tracking`) or `create_missing_tables.py` for `email_logs.open_count` / `click_count` / `open_token_hash` / `click_token_hash`. Then set `PUBLIC_API_URL` to this backend's **public, non-loopback** origin (`.env.example` carries it): tracking stays off — links sent unwrapped, hashes NULL — while it is empty or still `localhost`, and production boot now warns in that case.
- **Known limit:** a tenant who can send a tracked email holds a valid click token and can therefore mint a signed redirect on this origin for any target. Inherent to click tracking; named in the spec non-goals.
- **Residuals:** per-hit event log (first-open time, user agent), unique-vs-total opens, bot/scanner suppression, per-link click attribution, attachment and reply tracking, tracking UI beyond the two counts.

### Phase 7.2 — Meeting booking + inbound calendar — DONE (code)

Public `/book/{slug}` writes a `meetings` row attributed to the configured host (60-minute default, guest in notes, in-company email lead match only). Config is `company_settings.booking_slug` + `booking_host_user_id`, live when both are set; admin/MD writes, members read. After commit, `sync_meeting_outbound` pushes to the host calendar; a mocked provider failure still returns 201. Inbound is JWT `POST /api/calendar/sync` over now→+14 days, upsert by `(company_id, calendar_event_id)`, never delete; conference URL stored only when the provider supplies `hangoutLink` / Graph `joinUrl`. Disconnected/errored calendar → 400; provider ≥400 → 502 and no fake row. Spec: [`superpowers/specs/2026-08-26-phase7-booking-calendar-design.md`](./superpowers/specs/2026-08-26-phase7-booking-calendar-design.md); plan: [`superpowers/plans/2026-08-26-phase7-booking-calendar.md`](./superpowers/plans/2026-08-26-phase7-booking-calendar.md). UI: `/book/[slug]` + settings booking block + **Pull events from calendar**.

- **Verification:** `tests/sales/test_booking_calendar.py` (40 tests: config round-trip + 403, slug/host 400s, public GET/404, POST attribution/duration/notes, lead match vs foreign, honeypot, 429, mocked push + failure still 201, Google/Graph inbound upsert, no-delete, 400/502 no-write, cross-tenant) + `tests/ops/test_alembic_heads.py` (single head `028_booking_calendar`, `down_revision == 027_email_tracking`). Related `test_calendar_sync.py`, `test_meetings_calls_api.py`, web-to-case, public lead form, and cases API still pass. Full suite: 771 passed, 3 failed (`test_accept_invite_internal_error_is_sanitized`, `test_quota_429_then_next_utc_day_allowed`, `test_due_follow_up_notifies_owner`) — same pre-existing trio named under 7.1, unrelated.
- **Deploy:** `alembic upgrade head` (`028_booking_calendar`) or `create_missing_tables.py` for `company_settings.booking_slug` / `booking_host_user_id` and `meetings.conference_url`. Booking goes live when an admin sets slug + host; `FRONTEND_URL` should be the public origin for the copyable link. Inbound needs the same Google/Microsoft OAuth client credentials as 6.2 plus a per-user connect.
- **Residuals:** availability/timezone, guest ICS/email, reschedule/cancel, round-robin, webhook/cron inbound, all-day import, delete-on-vanish, attendees, composite `(company_id, calendar_event_id)` index on upgrades.

### Phase 7.3 — Store-listed mobile — PENDING

`flutter_app/store/STORE_RELEASE.md`; android/ios from `flutter create`; listing copy. Secrets not in git. 6.8 MFA path already exists.

### Phase 7.4 — Hindi UI — PENDING

Sales loop (leads, deals, invoices, quotes). Not 28 locales.

### Phase 7.5 — Live Tally — PENDING

Real adapter when configured; 5.4 stub remains the offline/test path.

### Phase 7.6 — Live GST IRN — PENDING

IRP/NIC when GSTINs + creds exist; no fake registered IRN.

### Phase 7.7 — Price books — PENDING

Named books; quote/invoice lines can use a book price.

### Phase 7.8 — Next-activity nag — PENDING

Open deal needs a next activity; rotting from last timeline touch; `due_today` email.

### Phase 7.9 — Quote → sales order → invoice — PENDING

Accepted quote can mint SO; SO → invoice.

### Phase 7.10 — Deal / discount approvals — PENDING

Threshold → pending until admin/MD approve.

### Phase 7.11 — Import undo + clients/deals CSV — PENDING

Mapper beyond leads; last-batch undo.

### Phase 7.12 — Reports + schedule — PENDING

Deals + GST invoice reports; scheduled CSV email to admins.

**Phase 7 done when:** tracked open visible; public booking writes a meeting; store build path documented/shippable; Hindi on sales UI; Tally/IRN live when configured; price book; deal nag; quote→SO→invoice; import undo; scheduled report.

---

## Cross-cutting cleanups (do alongside, not as a phase)

From roadmap §6 — also tracked as **6.11**, **6.12**, and backend debris:

- Remove **fabricated testimonials** and unshipped landing claims (§6.1) — **6.11**.
- Fix **brand drift** — **6.12**.
- Backend-root `tmp_*.py` / `check_*.py` / `test_*.py` one-offs — **6.20** (deleted).

---

## Sequencing summary

```
Phase 0–4 ✅ (code)  →  Phase 6 ✅ (code)  →  Phase 5 ✅ (code)  →  Phase 7 (trial defense) ⏳
```

**Verification checkpoints (roadmap §11):**
- Phase 0: tenancy tests green. ✅ (RLS = **6.10** done in code).
- Phase 1: payment + seat limit. ✅
- Phase 2–4: sales loop + Standard + Professional extras. ✅ (code)
- Phase 5–6: add-ons + competitor parity. ✅ (code)
- **Next:** **7.3** store-listed mobile (7.2 meeting booking + inbound calendar is in code). Phase 7 done when the spec’s “Done when” list holds.