# What’s Remaining in This Project (Frontend, Backend, DB)

This document lists **incomplete or missing** work across the stack. What’s already done (auth, multi-tenant, leads/tasks/clients/follow-ups/ledgers/admin, seed, etc.) is not repeated here.

---

## 1. Database (PostgreSQL)

| Item | Status | Detail |
|------|--------|--------|
| **Legacy `database/schema.sql`** | Deprecated | Uses UUID, old structure (businesses, etc.). Do **not** use. App and migrations use `backend/app/models` + `database/apply_schema_local_service_crm.sql` (or Alembic). |
| **Leave requests** | Missing | No `leave_requests` (or similar) table. Frontend Settings → Leave calls `/leaves` APIs that don’t exist. To support leave: add table (e.g. `user_id`, `start_date`, `end_date`, `type`, `status`, `approved_by_id`, `company_id`), then add backend API. |
| **Notes table** | Present | `notes` exists (lead_id, client_id, content, created_by_id). No `company_id`; access is via lead/client, which are company-scoped. No change required for multi-tenant. |
| **Companies table** | Done | Exists with default row (id=1). Used for multi-tenant. |
| **Alembic vs raw SQL** | Optional | You can keep using `apply_schema_local_service_crm.sql` for a fresh DB. For incremental changes, prefer Alembic migrations (e.g. `002_add_company_multi_tenant.py`). New features (e.g. leave) should get a new migration. |

**Summary (DB):** Only real “remaining” DB work is **leave requests** if you want that feature; otherwise schema is in good shape.

---

## 2. Backend (FastAPI)

### 2.1 Missing APIs (frontend expects them)

| API | Frontend use | Backend status | Action |
|-----|--------------|----------------|--------|
| **POST /api/auth/request-otp** | Login page “OTP” tab – Send Code | Not implemented | Either add (email OTP send + store) or remove OTP from login UI. |
| **POST /api/auth/login-otp** | Login page – Verify & Sign in | Not implemented | Same as above; implement with request-otp or remove OTP. |
| **POST /api/leads/{id}/notes** | Sales lead detail – “Add note” | Not implemented | Add route: create `Note(lead_id=id, content=..., created_by_id=current_user.id)`, ensure lead is company-scoped (e.g. `ensure_company_access(lead, current_user)`). Optionally **GET /api/leads/{id}/notes** for listing. |
| **GET /api/leaves** | Settings → Leave | Not implemented | No leave model/routes. Implement leave model + CRUD (and approve if needed), or hide/redirect Leave page. |
| **POST /api/leaves** | Settings → Leave – create request | Not implemented | Same as above. |
| **POST /api/leaves/{id}/approve** | Settings → Leave – approve | Not implemented | Same as above. |

### 2.2 Platform (super-admin) routes

| API | Frontend use | Backend status | Action |
|-----|--------------|----------------|--------|
| **GET /platform/companies** | Platform → Companies list | Not implemented | Frontend calls `http://localhost:8000/platform/companies` and `platform_token`. Backend has no `/platform` router. Either: (1) Add a `platform` router under `/platform` (e.g. list companies from `companies` table, only for Platform Admin), or (2) Point frontend to existing admin/company data and use `/api/admin/*` with Platform Admin role. |
| **POST /platform/auth/login** | Platform login page | Not implemented | Frontend expects a separate platform login. Either add `/platform/auth/login` (e.g. same as `/api/auth/login` but returns token for platform admin only) or use main `/api/auth/login` and redirect platform UI to it. |

So: **Platform** (companies list, platform login) is UI-only; backend has no dedicated platform routes. Either add `/platform/*` or refactor frontend to use `/api/admin/*` and main auth.

### 2.3 Other backend gaps

| Item | Detail |
|------|--------|
| **GET /api/users/** | Implemented. Returns users scoped by company/team for task assignee etc. No change needed. |
| **GET /api/users/me** | Implemented. Returns current user profile including `company_id`. |
| **Reports overview** | Sales Reports page can use an “overview” endpoint for charts; currently uses `/leads/dashboard` and degrades if no overview. Optional: add something like `GET /api/leads/overview?period=...` for time-series if you want those charts. |
| **AI assistants** | Manager/MD/Purchase AI assistant pages are placeholders (no real AI). Backend has no AI endpoints. Either integrate an LLM API or leave as placeholder. |

---

## 3. Frontend (Next.js)

### 3.1 Features that will 404 or fail

| Page / flow | Issue | Fix |
|-------------|--------|-----|
| **Login – OTP tab** | Calls `request-otp` and `login-otp` which don’t exist | Add backend OTP or remove OTP tab. |
| **Sales → Lead detail → Add note** | Calls `POST /leads/{id}/notes` → 404 | Add backend `POST /api/leads/{id}/notes` (and optionally GET). |
| **Settings → Leave** | All leave APIs missing → 404 | Add leave backend + DB or hide/redirect this page. |
| **Platform → Companies** | Calls `GET /platform/companies` → 404 | Add platform router or use admin API + main auth. |
| **Platform login** | Calls `POST /platform/auth/login` → 404 | Add platform login or use main login. |

### 3.2 Placeholder / non-functional (no backend)

| Item | Detail |
|------|--------|
| **AI assistant (Manager / MD / Purchase)** | Placeholder text; no real AI. Either connect to an AI API or keep as UI-only. |
| **Admin audit – date range** | Marked as “placeholder” in code; filter may not apply. |
| **Some search/filter inputs** | Some are UI-only (e.g. local filter only); no backend search params. Optional to wire. |

### 3.3 Hardcoded / config

| Item | Detail |
|------|--------|
| **Platform API base** | Platform pages use `http://localhost:8000` directly (e.g. `fetch('http://localhost:8000/platform/companies')`). Prefer `NEXT_PUBLIC_API_URL` (or a platform-specific env) so it works in production. |
| **Main app API** | Uses `api.js` and `NEXT_PUBLIC_API_URL`; that’s correct. |

---

## 4. Summary checklist

- **DB:** Add leave-request table (and migration) only if you want the Leave feature.
- **Backend:**  
  - **Must-fix for existing UI:** Lead notes API (`POST /leads/{id}/notes`, optional GET).  
  - **Optional / product choice:** OTP auth, Leave API, Platform routes (`/platform/companies`, `/platform/auth/login`), reports overview, AI.
- **Frontend:**  
  - Either remove or back with backend: OTP login, Leave page, Platform companies + login.  
  - Use env for API base in platform pages; optionally wire search/filters and audit date range to backend.

Once lead notes (and, if you want, leave + platform) are implemented and frontend is adjusted, the remaining work is product-driven (AI, extra reports, etc.) rather than structural.
