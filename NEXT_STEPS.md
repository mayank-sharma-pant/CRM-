# What to Do Next

## Current status (verified)

- **Backend**: FastAPI + PostgreSQL (psycopg3), Python 3.14–compatible; runs on port 8000.
- **Database**: Schema applied to `local_service_crm`; seed script run with `company_id=1` for multi-tenant.
- **Auth**: Login, JWT, company-scoped users; protected routes return 401 without token.
- **Frontend**: Next.js build succeeds.
- **Tests**: `backend/tests/test_api.py` — health, root, 401 on protected, login + `/api/auth/me`.

## Run the stack daily

1. **Backend** (from project root):
   ```bash
   cd backend && source .venv/bin/activate && uvicorn app.main:app --reload --port 8000
   ```
2. **Frontend** (from project root):
   ```bash
   cd frontend && npm run dev
   ```
3. Open: `http://localhost:3000` → login with e.g. `alex.j@company.com` / `sales123`.

## Run tests

- Backend must be running on port 8000.
  ```bash
  cd backend && .venv/bin/pytest tests/ -v
  ```
- To skip live API tests: `SKIP_LIVE=1 pytest tests/ -v`.

## Suggested next steps (priority)

1. **Manual UI check** – Log in as each role (admin, md, purchase, manager, sales), click through leads, tasks, clients, follow-ups, ledgers; confirm no console/network errors.
2. **Environment** – Replace `SECRET_KEY` and DB password in `.env` for non-local use; never commit `.env`.
3. **Platform admin** – Use `admin@company.com` (no `company_id`) to test cross-company visibility if you add a second company.
4. **Optional** – Add more pytest tests (e.g. create lead, update task), or E2E with Playwright/Cypress for critical flows.
5. **Deploy** – When ready: build frontend (`npm run build`), run backend with a production ASGI server (e.g. gunicorn + uvicorn workers) and set `CORS_ORIGINS` to your frontend origin.

## Seed credentials (after `python -m scripts.seed`)

| Role    | Email               | Password   |
|---------|---------------------|------------|
| Admin   | admin@company.com   | admin123   |
| MD      | md@company.com      | md123      |
| Purchase| purchase@company.com| purchase123|
| Manager | mike.b@company.com  | manager123 |
| Sales   | alex.j@company.com  | sales123   |
