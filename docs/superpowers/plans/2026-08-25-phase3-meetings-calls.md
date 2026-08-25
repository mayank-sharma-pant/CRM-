# Meetings + Call Log Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a sales user schedule meetings and log calls on a lead or deal, show them on the record timeline, and prove company B cannot touch company A’s rows.

**Architecture:** Two tenant-scoped tables (`meetings`, `call_logs`) with CRUD routers under `/api/meetings` and `/api/calls`. Parent FKs (`lead_id`/`client_id`/`deal_id`) must resolve in-company. Frontend fetches by parent id and merges into existing lead/deal detail UI.

**Tech Stack:** FastAPI, SQLAlchemy, Pydantic v2, Next.js App Router, axios, Tailwind. Tests: pytest + FastAPI `TestClient` (in-memory SQLite).

**Spec:** [docs/superpowers/specs/2026-08-25-phase3-meetings-calls-design.md](../specs/2026-08-25-phase3-meetings-calls-design.md)

## Global Constraints

- **No new pip dependency. No Alembic.** New tables via `create_all`. Do not add to `_MISSING_COLUMNS` (these are new tables, not new columns on old tables).
- **IDOR-safe:** never take `company_id` from the body; derive from `get_current_user`.
- **404 on by-id miss** (including cross-tenant), not 403, matching Phase 0.
- Test password for helper-created users is `"pw"`. Reset `auth_limiter._buckets.clear()` at the start of login-heavy tests.

---

### Task 1: Models + schema tests

**Files:**
- Modify: `backend/app/models/core/enums.py`
- Create: `backend/app/models/sales/meeting.py`, `backend/app/models/sales/call_log.py`
- Modify: `backend/app/models/sales/__init__.py`
- Test: `backend/tests/sales/test_meetings_calls_schema.py`

- [ ] Write failing schema tests, then models until they pass.

---

### Task 2: Parent helper + meetings/calls API

**Files:**
- Create: `backend/app/services/sales/activity_parents.py`
- Create: `backend/app/routers/sales/meetings.py`, `backend/app/routers/sales/calls.py`
- Modify: `backend/app/main.py` (include routers)
- Test: `backend/tests/sales/test_meetings_calls_api.py`

- [ ] Failing API tests first, then routers.

---

### Task 3: Cross-tenant tests

**Files:**
- Test: `backend/tests/tenancy/test_meetings_calls_cross_tenant.py`

- [ ] Owner positive control + B denied on GET/PATCH/DELETE for both resources.

---

### Task 4: Frontend lead + deal surfaces

**Files:**
- Create: `frontend/components/activity/MeetingCallPanel.jsx`
- Modify: `frontend/components/leads/LeadDetailPage.jsx`
- Modify: `frontend/app/sales/deals/[id]/page.jsx`

- [ ] Log call / schedule meeting; timeline merge; four data states on the panel (loading/error/empty/success).
