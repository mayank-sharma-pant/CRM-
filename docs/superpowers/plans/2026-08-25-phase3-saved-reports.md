# Phase 3.4 — Saved reports + dashboard builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist named leads/invoices reports, re-run them, export CSV, and pin widgets on one company dashboard.

**Architecture:** JSON-filter `saved_reports` plus get-or-create `dashboards` / `dashboard_widgets`. Live execution via a shared runner used by `GET /api/md/reports/custom`.

**Tech Stack:** FastAPI, SQLAlchemy, existing TestClient suite, Next.js app router, no new pip deps.

**Spec:** `docs/superpowers/specs/2026-08-25-phase3-saved-reports-design.md`

## Global Constraints

- No Alembic; tables via `Base.metadata.create_all` / `create_missing_tables.py`
- No new pip dependencies
- Do not accept `company_id` from request bodies
- Cross-tenant access is 404, not 403, paired with a positive control
- Mutate reports/widgets: admin or MD only
- Report type v0 is only `leads_invoices`
- Do not replace `/manager/reports` or role cockpits

---

### Task 1: Schema

**Files:**
- Create: `backend/app/models/sales/saved_report.py`
- Create: `backend/app/models/sales/dashboard.py`
- Modify: `backend/app/models/core/enums.py`
- Modify: `backend/app/models/sales/__init__.py`
- Test: `backend/tests/sales/test_saved_reports_schema.py`

- [ ] Failing schema tests, then models, then green.

### Task 2: Shared runner + saved-report API + dashboard API

**Files:**
- Create: `backend/app/services/sales/report_runner.py`
- Create: `backend/app/routers/sales/reports.py`
- Create: `backend/app/routers/sales/dashboards.py`
- Modify: `backend/app/main.py`
- Modify: `backend/app/routers/management/md.py` (delegate custom report)
- Test: `backend/tests/sales/test_saved_reports_api.py`
- Test: `backend/tests/tenancy/test_saved_reports_cross_tenant.py`

- [ ] Failing API/tenancy tests, then implementation, then green.

### Task 3: Frontend

**Files:**
- Create: `frontend/app/reports/page.jsx`
- Modify: `frontend/components/RouteGuard.jsx` (SHARED_PATHS)
- Modify: `frontend/components/Sidebar.jsx`
- Modify: `frontend/app/md/reports/page.jsx` (Save)

- [ ] Canonical `/reports` page + nav + MD Save; `next build` clean.
