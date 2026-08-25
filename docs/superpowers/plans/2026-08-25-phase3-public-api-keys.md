# Phase 3.5 — Public API keys Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Company-issued read/write API keys, dedicated `/api/v1/` REST for leads/clients/deals/invoices, plan-based daily quota.

**Architecture:** `api_keys` hashed at rest; `get_api_principal` (not a User); `/api/v1` routers scoped by `company_id`; `api_usage_daily` + `plans.max_api_requests_per_day`; JWT management at `/api/api-keys`.

**Tech Stack:** FastAPI, SQLAlchemy, existing TestClient suite, Next.js, no new pip deps.

**Spec:** `docs/superpowers/specs/2026-08-25-phase3-public-api-keys-design.md`

## Global Constraints

- No Alembic; tables via `create_all`; plan column via `create_missing_tables.py`
- No new pip dependencies
- Do not accept `company_id` from request bodies
- Cross-tenant access is 404 with a positive control
- Mint/revoke: admin or MD; max 10 live keys
- Public prefix `/api/v1/` only; JWT cookie ignored; `read` cannot POST/PATCH
- Quota 429 not 402; Starter 1000 / Growth 10000 / Enterprise NULL
- Token shown once; SHA-256 of full `crm_live_` + 64 hex; prefix first 8 hex of secret

---

### Task 1: Schema + quota column backfill

**Files:**
- Create: `backend/app/models/core/api_key.py`
- Modify: `backend/app/models/core/enums.py`, `backend/app/models/core/__init__.py`, `backend/app/models/billing/plan.py`, `backend/app/services/billing/seed.py`, `backend/create_missing_tables.py`
- Test: `backend/tests/sales/test_api_keys_schema.py`

- [ ] Failing schema tests, then models + seed/backfill, then green.

### Task 2: Management API, principal, quota, public v1

**Files:**
- Create: `backend/app/services/sales/api_keys.py` (mint/hash/quota)
- Create: `backend/app/utils/api_principal.py`
- Create: `backend/app/routers/admin/api_keys.py`
- Create: `backend/app/routers/public/v1.py` (leads, clients, deals, invoices)
- Modify: `backend/app/main.py`, `backend/app/routers/admin/platform.py`, `backend/app/routers/billing/__init__.py`
- Test: `backend/tests/sales/test_api_keys_api.py`
- Test: `backend/tests/tenancy/test_api_keys_cross_tenant.py`

- [ ] Failing API/tenancy tests, then implementation, then green.

### Task 3: Frontend settings page

**Files:**
- Create: `frontend/app/settings/api-keys/page.jsx`
- Modify: `frontend/app/settings/page.jsx`, `frontend/services/api.js`

- [ ] Admin/MD link + mint-once modal + revoke; sales denied; `next build` if feasible.
