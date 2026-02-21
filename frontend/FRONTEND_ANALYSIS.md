# Frontend analysis – what was wrong and what was fixed

This document summarizes the full frontend analysis and the issues that were fixed or that still need backend/product decisions.

---

## Critical issues (fixed)

### 1. **Next.js API rewrite pointed to wrong port**
- **Issue:** `next.config.mjs` rewrote `/api/*` to `http://localhost:5000`. The backend is FastAPI on port **8000**.
- **Fix:** Rewrite destination updated to `http://localhost:8000/api/:path*`.
- **Impact:** Any code using relative `/api/...` (e.g. `fetch('/api/...')`) would have hit the wrong port; the main app uses `api.js` (axios with `NEXT_PUBLIC_API_URL`), so it was already correct. The rewrite is now consistent.

### 2. **Backend ledgers router import error**
- **Issue:** `backend/app/routers/ledgers.py` used `from app.utils.auth import get_current_user`, but there is no `app.utils.auth` module (only `dependencies` and `security`).
- **Fix:** Changed to `from app.utils.dependencies import get_current_user`.
- **Impact:** Without this, the app would fail at startup when loading the ledgers router.

### 3. **Sidebar “Settings” link 404**
- **Issue:** Sidebar linked to `/settings`. The only existing page is `/settings/leave`.
- **Fix:** Sidebar link changed to `/settings/leave`.
- **Impact:** Clicking Settings no longer 404s.

### 4. **Sales Reports page called non‑existent APIs**
- **Issue:** Reports used `/reports/dashboard` and `/reports/overview`, which do not exist.
- **Fix:** Default dashboard endpoint set to `/leads/dashboard`. Response is normalized to the shape the Reports page expects (`totalLeads`, `convertedLeads`, etc.). Overview is optional; if no overview endpoint is provided, charts that depend on it show empty data.
- **Impact:** Sales Reports page loads and shows metrics from the leads dashboard; overview charts are empty until a real overview API exists.

### 5. **TaskModal user list API**
- **Issue:** TaskModal called `api.get('/users/list')`. Backend has `GET /api/users/`, which returns a stub message, not a list.
- **Fix:** TaskModal now calls `api.get('/users/')` and safely handles non‑array response (`Array.isArray(data) ? data : (data?.users || [])`).
- **Impact:** No crash when opening the task modal; assignee dropdown may be empty until the backend implements a real user list.

### 6. **Leads list date parsing could throw**
- **Issue:** `getEngagementSignal` used `parseISO()` on `lead.next_task`, `lead.last_response_at`, `lead.last_contacted_at` without checking for null or invalid strings.
- **Fix:** Introduced `safeParseISO()` and used it for all date fields; invalid/missing dates are skipped.
- **Impact:** Leads list no longer crashes on bad or missing date values.

---

## Remaining issues (frontend/backend mismatch or missing backend)

### 1. **OTP login (UI exists, backend does not)**
- **Where:** Login page has “OTP Login” and uses `requestOTP` and `loginOTP` from `AuthContext`.
- **Backend:** No `/auth/request-otp` or `/auth/login-otp` endpoints.
- **Effect:** Choosing OTP and clicking “Send Code” or “Verify & Sign in” will result in 404 or network errors.
- **Options:** Remove OTP from the login UI until backend supports it, or add the corresponding auth endpoints.

### 2. **Add note on lead detail (endpoint missing)**
- **Where:** `app/sales/leads/[id]/page.jsx` calls `api.post(\`/leads/${id}/notes\`, null, { params: { content } })`.
- **Backend:** Leads router has no `POST /leads/{id}/notes`. Notes exist as a model and can be linked to leads, but there is no dedicated route for “add note to lead”.
- **Effect:** “Add note” fails with 404.
- **Options:** Add something like `POST /api/leads/{lead_id}/notes` (or a generic notes API that accepts `lead_id`), or change the UI to update lead’s `notes` field via `PUT /leads/{id}` if that fits the product.

### 3. **Leave requests (entire feature missing in backend)**
- **Where:** `app/settings/leave/page.jsx` uses `api.get('/leaves')`, `api.post('/leaves', payload)`, `api.post(\`/leaves/${leaveId}/approve\`, { status })`.
- **Backend:** No `/leaves` routes or leave model.
- **Effect:** Leave request page will 404 or fail on every action.
- **Options:** Implement leave model + API in the backend, or hide/redirect the Leave page until the feature exists.

### 4. **User list for task assignment**
- **Where:** TaskModal (and any other “assign to user” UI) needs a list of users.
- **Backend:** `GET /api/users/` returns a stub `{ message: "..." }`, not a list. Admin has `GET /api/admin/users` (real list).
- **Effect:** Task assignee dropdown stays empty for non‑admin or when using `/users/`.
- **Options:** Implement a proper `GET /api/users/` (or e.g. `/api/users/list`) that returns a list of users (optionally scoped by team/role), and use it in TaskModal.

### 5. **Auth “/me” and users “/me”**
- **Auth:** `GET /api/auth/me` is implemented and used by `AuthContext` for current user. Correct.
- **Users:** `GET /api/users/me` in `users.py` returns a stub. Not used by the main auth flow; only auth’s `/me` is used. No frontend fix needed; can be fixed in backend if something else relies on it.

---

## What is working as intended

- **Auth (password):** Login, signup, logout, token in localStorage, axios header, 401 redirect to `/login`.
- **API base URL:** `api.js` uses `NEXT_PUBLIC_API_URL` (default `http://localhost:8000`); no hardcoded wrong port.
- **Role redirect after login:** Login page redirects by `user.role` to the correct dashboard (sales, manager, md, purchase, admin).
- **Layout:** Public routes (`/`, `/login`, `/signup`) render without sidebar; others get sidebar + TopBar. Sidebar uses `user?.role` and pathname to show the right nav; finance ledgers are loaded from `financeService.getAuthorizedLedgers()` (backend `/api/ledgers`).
- **Leads:** List, create (LeadModal with `POST /leads`), detail, update status, convert to client. Create uses fields that match backend `LeadCreate` (name, email, phone, company, source, service_type, notes).
- **Tasks:** List via `/tasks/list`, create via `POST /tasks/` with query params (matches backend). Update status via `PUT /tasks/:id`.
- **Follow‑ups:** `/follow-ups`, `/follow-ups/today`, `/follow-ups/overdue`, and update status; backend has these routes.
- **Finance ledgers:** `financeService` calls `/ledgers/`, `/ledgers/:slug`, POST/PUT/DELETE; backend ledgers router has these (and now uses the correct `get_current_user` import).
- **Manager / MD / Purchase / Admin:** Pages call the expected endpoints under `/manager/*`, `/md/*`, `/purchase/*`, `/admin/*`; backend has corresponding routers.
- **Sales dashboard:** Uses `/leads` and `/tasks/list`; metrics and priority tasks are computed on the frontend from that data.
- **Sales reports:** Now use `/leads/dashboard` with normalized shape; overview is optional and degrades gracefully.

---

## Recommendations

1. **Environment:** Ensure backend runs on port 8000 and frontend uses `NEXT_PUBLIC_API_URL=http://localhost:8000` (or your deployed API URL) in production.
2. **OTP login:** Either remove the OTP tab from the login page or add `/auth/request-otp` and `/auth/login-otp` (and email/send logic) in the backend.
3. **Lead notes:** Add `POST /leads/{lead_id}/notes` (or equivalent) and use it from the lead detail page, or switch the UI to updating lead’s `notes` via `PUT /leads/{id}`.
4. **Leave feature:** Implement leave model and API, or hide/redirect `/settings/leave` until then.
5. **User list:** Implement a real user list endpoint (e.g. `GET /api/users/` or `/api/users/list`) and use it in TaskModal and anywhere else that needs “assign to user”.
6. **Route protection (optional):** Layout does not redirect unauthenticated users; 401 from API triggers redirect to `/login`. For a stricter UX, you can add a client-side guard: when `!user && !loading` and path is not public, redirect to `/login`.

---

## Files changed in this pass

| File | Change |
|------|--------|
| `frontend/next.config.mjs` | Rewrite destination 5000 → 8000 |
| `frontend/components/Sidebar.jsx` | Settings link `/settings` → `/settings/leave` |
| `frontend/components/leads/TaskModal.jsx` | Use `GET /users/` and handle non‑array response |
| `frontend/app/sales/reports/page.jsx` | Use `/leads/dashboard`, normalize shape, optional overview |
| `frontend/app/sales/leads/page.jsx` | Safe date parsing in `getEngagementSignal` |
| `backend/app/routers/ledgers.py` | `app.utils.auth` → `app.utils.dependencies` for `get_current_user` |
