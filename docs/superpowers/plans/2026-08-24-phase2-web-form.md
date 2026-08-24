# Public web form → lead — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** A stranger can submit `/f/{slug}` and a `Lead` appears in that company’s sales list (unassigned, `source=Website`) with no JWT on public routes.

**Architecture:** `lead_forms` table (one per company, opaque slug). Public router `/api/public/forms` has no auth. Authenticated `/api/lead-forms` copies the URL. Signup seeds a default form like the default pipeline.

**Tech Stack:** FastAPI, SQLAlchemy, pytest, Next.js (JSX), existing `RateLimiter`.

**Spec:** `docs/superpowers/specs/2026-08-24-phase2-web-form-design.md`

## Global Constraints

- No Alembic; `Base.metadata.create_all` + export model from `app/models/sales/__init__.py`.
- Public GET/POST never return `company_id`, lead id, or team lists.
- Honeypot `website` non-empty → 201 `{ok: true}` and no insert.
- Inactive form / unknown slug / company not `active`|`trial` / expired trial → 404.
- Rate limit: 10 POSTs / 600s / IP / slug via `app/utils/rate_limit.py`.
- PATCH `/api/lead-forms` is admin/md only.
- Tests: `cd backend && python -m pytest`.

### Task 1: Tests + model + public/auth routers + seed + UI

Implement the spec in one vertical slice. Tests in `backend/tests/sales/test_public_lead_form.py` must cover every bullet in the spec’s Tests section. Frontend: `frontend/app/f/[slug]/page.jsx` and copy-link + team select on `frontend/app/sales/leads/page.jsx`. Add `/f/` to public paths in `frontend/services/api.js`.
