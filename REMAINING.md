# Remaining Work — 3 Phases (No Docker)

**Out of scope:** Docker is not used in this project. Run backend with `uvicorn`, frontend with `npm run dev` or `npm run build && npm run start`. Docker files in the repo can be removed if desired.

---

## Phase 1 — Must-have (Core)

High-impact items: correctness, security, and main user flows.

### Backend

- [ ] **Pagination on remaining list endpoints**  
  Add `skip`/`limit` (and return `total`) to:  
  Admin: `GET /api/admin/users`, `/teams`, `/approvals`, `/audit-log`, `/invites`  
  Purchase: `GET /api/purchase/sales`, `GET /api/purchase/invoices`  
  MD: `GET /api/md/leads`, `/clients`, `/invoices`, `/employee-lookup`, `/points`  
  Update frontend to use `.items` or existing keys + pagination where needed.

- [ ] **Rate limiting on auth**  
  Add per-IP or per-email limits on `/api/auth/login`, `/request-otp`, `/login-otp`, `/signup`, and platform login to reduce brute-force and OTP abuse.

- [ ] **Password change (authenticated)**  
  Add `POST /api/auth/change-password` (current user changes own password with current password + new password). Optional later: password reset via email (needs SMTP).

### Frontend

- [ ] **Connect md/employee-lookup to real API**  
  Replace hardcoded `EMPLOYEE_DATABASE` and `setTimeout` with calls to `GET /api/md/employee-lookup` and `GET /api/md/employee-lookup/{user_id}`.

- [ ] **Remove dead / mock-only code**  
  - Remove unused `LEAD_DATA` constant from `frontend/app/sales/leads/[id]/page.jsx`.  
  - Delete orphaned `frontend/app/sales/clients/data.js` (nothing imports it).  
  - Replace MD pages’ silent fallback to mock data on API failure with a visible error state (and retry where appropriate).

---

## Phase 2 — Important

User experience and data integrity.

### Backend

- [ ] **Ledger: updated_at / updated_by**  
  Add `updated_at` and `updated_by` to `LedgerEntry` (model + migration) and set them when entries are updated.

- [ ] **Optional: GET /api/invoices list**  
  Add company-scoped `GET /api/invoices` with pagination if you want sales/company to list invoices from the main invoices API (otherwise listing stays via manager/purchase/md).

### Frontend

- [ ] **User-visible error handling**  
  In ~45+ places that only `console.log`/`console.error` on failure, add a visible error state (e.g. banner or toast) and optional retry. Priority: sales, manager, admin, purchase, MD, platform, settings/leave, finance/ledgers, TaskModal, LeadModal.

- [ ] **Finance ledger:** On fetch error, show error state + retry instead of falling back to local mock in `SharedLedgerPage`.

### Cross-cutting

- [ ] **Admin settings:** Pipeline/notifications are mock; either add backend support or remove/hide that UI.

---

## Phase 3 — Polish

Nice-to-have and cleanup.

### Backend

- [ ] **Wire Pydantic schemas to endpoints**  
  Use existing schemas in `app/schemas/` as `response_model` and request bodies on routers instead of ad-hoc dicts (consistent API contracts and validation).

- [ ] **JWT scope/audience (optional)**  
  If platform and CRM share the same backend, add `aud` or scope claims so tokens are not reused across contexts.

- [ ] **Simplify get_current_active_user**  
  `get_current_user` already enforces active/disabled; consider using it directly in `require_admin`, `require_admin_or_md`, `require_company_user` and removing the redundant `get_current_active_user` where possible.

### Frontend

- [ ] **Lucide/Recharts:** Fix any missing or broken imports if they appear at runtime.

### Other

- [ ] **Migration 007 (SQLite):** Current 007 uses `postgresql_using`; only relevant if you need to run migrations on SQLite (add a SQLite-friendly path if so).
- [ ] **Production:** Set `NEXT_PUBLIC_API_URL` so the frontend can reach the backend in production.

---

## Summary

| Phase | Focus | Main items |
|-------|--------|------------|
| **1** | Must-have | Pagination (admin/purchase/md), rate limiting, password change, md/employee-lookup → real API, remove dead code & mock fallbacks |
| **2** | Important | Ledger updated_at/updated_by, optional GET /api/invoices, user-visible errors, finance ledger & admin settings |
| **3** | Polish | Pydantic schemas on endpoints, JWT scope, dependency cleanup, Lucide/Recharts, migration/production notes |

---

## Completed (reference)

- Earlier Phase 2 & 3 (invoice endpoint, body params, invoice_number unique, OTP secrets, null-safe dates, leave precedence, Numeric money, pagination on core lists, deprecation fixes, OTP in DB).
- Security/tenant/disabled-user fixes; README and env example cleanup.
