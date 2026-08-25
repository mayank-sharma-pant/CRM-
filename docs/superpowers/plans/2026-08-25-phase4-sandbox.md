# Sandbox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admin/MD create one empty sandbox tenant company for experiments, log in as a dedicated sandbox admin, and destroy it — without touching live CRM data.

**Architecture:** Two columns on `companies` (`is_sandbox`, `sandbox_parent_id`). Service creates sibling company + synthetic admin + Starter subscription + pipeline/form/workflow seeds. Router at `/api/sandbox`. Billing checkout blocked for sandboxes. `/auth/me` exposes `is_sandbox`. Settings UI + banner.

**Tech Stack:** FastAPI, SQLAlchemy, Next.js, axios, Tailwind. pytest + TestClient.

**Spec:** [docs/superpowers/specs/2026-08-25-phase4-sandbox-design.md](../specs/2026-08-25-phase4-sandbox-design.md)

## Global Constraints

- No new pip deps. No Alembic. Columns via `_MISSING_COLUMNS` + model attrs.
- Never take `company_id` from body. Cross-tenant → 404 where by-id. Bad state → 400. Forbidden role → 403.
- Writes: admin/md only. GET status: any company user.
- One non-suspended sandbox per parent (app-enforced).
- Test password `"pw"`. Reset `auth_limiter._buckets.clear()`.
- pytest via `backend/.venv/bin/pytest` from `backend/`.
- `git add` only task files (commits optional unless user asked).

### File map

| File | Responsibility |
|---|---|
| `backend/app/models/core/company.py` | `is_sandbox`, `sandbox_parent_id` |
| `backend/create_missing_tables.py` | `_MISSING_COLUMNS` |
| `backend/app/services/company/sandbox.py` | create / status / destroy helpers |
| `backend/app/routers/company/sandbox.py` | HTTP API |
| `backend/app/main.py` | include router `/api/sandbox` |
| `backend/app/schemas/admin/user.py` | `MeResponse.is_sandbox` |
| `backend/app/routers/auth/auth.py` | populate `is_sandbox` on `/me` |
| `backend/app/routers/billing/__init__.py` | block checkout for sandbox |
| `frontend/app/settings/sandbox/page.jsx` | UI |
| `frontend/components/Sidebar.jsx` | nav link |
| `frontend/components/Layout.jsx` | sandbox banner (shared shell) |
| `frontend/app/admin/layout.jsx` | sandbox banner (admin shell) |
| `docs/IMPLEMENTATION_PLAN.md` | Phase 4.6 log |

---

### Task 1: Schema columns

**Files:**
- Modify: `backend/app/models/core/company.py`
- Modify: `backend/create_missing_tables.py`
- Test: `backend/tests/company/test_sandbox_schema.py`

- [ ] **Step 1: Failing schema test** — `companies` has `is_sandbox`, `sandbox_parent_id`; can persist a sandbox child.

- [ ] **Step 2: RED**

- [ ] **Step 3: Add columns** — `is_sandbox = Column(Boolean, default=False, nullable=False)`; `sandbox_parent_id = Column(Integer, ForeignKey("companies.id"), nullable=True, index=True)`. `_MISSING_COLUMNS`: `("companies", "is_sandbox", "BOOLEAN DEFAULT FALSE")`, `("companies", "sandbox_parent_id", "INTEGER")`.

- [ ] **Step 4: GREEN**

---

### Task 2: Sandbox service

**Files:**
- Create: `backend/app/services/company/sandbox.py` (and `__init__.py` if needed)
- Test: `backend/tests/company/test_sandbox_service.py`

**Produces:**

```python
def find_active_sandbox(db, parent_id: int) -> Company | None: ...
def create_sandbox(db, *, parent: Company) -> tuple[Company, User, str]:
    """Returns (sandbox_company, admin_user, raw_password). Raises ValueError."""
def destroy_sandbox(db, *, sandbox: Company) -> None: ...
def sandbox_status_payload(db, *, company: Company) -> dict: ...
```

Create: new company, admin with `sandbox.{parent.id}.{secrets.token_hex(4)}@sandbox.local`, Starter active subscription provider=`none`, seeds like signup. Destroy: disable users; suspend; clear `sandbox_parent_id`.

- [ ] **Step 1–4: TDD** — create ok; second create raises; create-from-sandbox raises; destroy clears parent link and disables users.

---

### Task 3: API + me + billing guard

**Files:**
- Create: `backend/app/routers/company/sandbox.py`
- Modify: `backend/app/main.py`, `auth.py` `/me`, `schemas/admin/user.py`, `billing/__init__.py`
- Test: `backend/tests/company/test_sandbox_api.py`, `backend/tests/company/test_sandbox_cross_tenant.py`

- [ ] **Step 1: API tests** — POST 201 + login as sandbox admin; GET status; DELETE; sales GET ok but POST 403; checkout from sandbox 400; `/me` has `is_sandbox`.

- [ ] **Step 2–4: Implement router + wire + guards → GREEN**

---

### Task 4: Frontend

**Files:**
- Create: `frontend/app/settings/sandbox/page.jsx`
- Modify: `Sidebar.jsx`, `Layout.jsx`, `admin/layout.jsx`

- [ ] Settings page Create/Destroy/credentials; Sidebar Sandbox under Settings for admin+md; banner when `user.is_sandbox`.

---

### Task 5: Docs

**Files:**
- Modify: `docs/IMPLEMENTATION_PLAN.md` — mark 4.6 DONE; update status board next=4.7.
