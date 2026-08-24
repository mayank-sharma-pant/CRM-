# Phase 2 · Sub-project 2 — Public web form → lead

> Design spec. Companion to [IMPLEMENTATION_PLAN.md](../../IMPLEMENTATION_PLAN.md) Phase 2, item 2.
> Critical path after Deal (item 1): **form → quote/pay → cadence**. Custom fields are later.
> Grounded in the code as of 24 Aug 2026.

## Problem

Leads can only be created by a logged-in user (`POST /api/leads` requires JWT). There is no public capture surface. The Phase 2 plumber demo starts with “web form → lead”; that path does not exist.

`Company` has `company_code` (3-char, unique) but no public slug. Using `company_code` as the form URL would make every tenant enumerable. `Lead.source` already exists (free string) and is the right place to stamp `"Website"`.

## Decisions (locked)

1. **Opaque slug, not company id / company_code.** Each company gets one default `LeadForm` with a `secrets.token_urlsafe(16)` slug. Guessing another company’s form is infeasible. This is the “signed form id” in the implementation plan — a high-entropy id, not HMAC of a sequential integer (HMAC of an enumerable id still leaks that ids exist if we return distinct errors).
2. **One default form per company for v0.** Auto-create on signup (same pattern as `ensure_default_pipeline`). Authenticated users can `GET` the form (to copy the public URL) and `PATCH` headline / active flag / default team. No form-builder UI, no multiple forms.
3. **Create a real `Lead` row** in that company: `status=Active`, `source` from the form default (`"Website"`), `assigned_to_id=None`, `created_by_id=None`, `team_id=form.default_team_id`. Unassigned + team is how sales already sees “open” leads (`leads.py` list scope). If `default_team_id` is null, the lead is company-visible to admin/md only until assigned — managers/sales with an active team will not list it. **v0 requires `default_team_id` when the company has any team;** otherwise null is allowed (solo admin).
4. **Honeypot, not CAPTCHA.** Body field `website` (bots fill it). If non-empty: return **201** with a fake `{ok: true}` and **do not insert a lead**. Same status as success so scrapers cannot probe.
5. **Rate limit** with the existing in-memory `RateLimiter` (`app/utils/rate_limit.py`): 10 POSTs / 10 minutes / IP / slug. Over limit → 429. Same process-local limitation as login (good enough for v0; not multi-worker accurate).
6. **Suspended / non-active / non-trial company → 404** on GET and POST (do not advertise that the company exists). Expired trial: 404.
7. **Same-origin frontend.** Public page lives at `frontend/app/f/[slug]/page.jsx` (no sales/manager layout, no JWT). It calls `/api/public/forms/{slug}` via the existing Next rewrite (empty axios baseURL). Add `/f/` to the 401-redirect public-path list in `frontend/services/api.js` so a stray 401 does not bounce visitors to `/login`.

## Data model

New table `lead_forms` — `app/models/sales/lead_form.py`. Created via `Base.metadata.create_all` (no Alembic; same decision as deals). Export from `app/models/sales/__init__.py`.

| column | type | notes |
|---|---|---|
| id | Integer PK | |
| company_id | Integer FK→companies, indexed, not null, **unique** | one form per company in v0 |
| slug | String(64), unique, indexed, not null | `token_urlsafe(16)` |
| name | String(255), not null | default `"Website"` |
| headline | String(255), nullable | shown on the public page |
| is_active | Boolean, default True | inactive → 404 on public routes |
| default_team_id | Integer FK→teams, nullable | see decision 3 |
| default_source | String(100), default `"Website"` | copied onto `Lead.source` |
| created_at / updated_at | DateTime | |

No new columns on `leads`. `Lead.source` already holds `"Website"`.

## Public API (no JWT)

Prefix: `/api/public/forms`. Router: `app/routers/public/lead_forms.py`, registered in `main.py`.

### `GET /api/public/forms/{slug}`

Returns only branding. 404 if missing, inactive, or company not `active`/`trial` (and trial not expired).

```json
{ "headline": "Get a quote", "company_name": "Acme Plumbing", "name": "Website" }
```

Never returns `company_id`, team ids, or user lists.

### `POST /api/public/forms/{slug}/submit`

Body:

```json
{
  "name": "Ravi",
  "phone": "9876543210",
  "email": "ravi@example.com",
  "company": "Ravi Homes",
  "service_type": "Waterproofing",
  "notes": "Leak in bathroom",
  "website": ""
}
```

Validation (400):
- `name` required, 1–255 chars
- at least one of `phone` or `email`
- `website` honeypot: if non-empty, fake 201, no insert

Success 201: `{ "ok": true }` only. **Do not return the lead id** (that would leak sequencing / existence).

Creates `Lead` with `apply_company_scope` unused (no user); set `company_id` from the form’s company after the company-status check. Do **not** call `get_current_user`.

## Authenticated API (JWT, company-scoped)

Prefix: `/api/lead-forms` (authenticated, next to deals).

- `GET /api/lead-forms` → the company’s form (create default if missing, same as lazy pipeline seed). Response includes `slug`, `headline`, `is_active`, `default_team_id`, `public_path` (`/f/{slug}`).
- `PATCH /api/lead-forms` → admin/md only (403 otherwise): `headline`, `is_active`, `default_team_id` (must be a team in this company). Slug is immutable after create.

Signup (`auth.py`, after pipeline seed): `ensure_default_lead_form(db, new_company.id)` in a try/except that logs and does not fail signup.

## Frontend

- **Public:** `frontend/app/f/[slug]/page.jsx`
  - Four states: loading, error (invalid/expired link), success (thank-you), form
  - Fields: name*, phone, email, company, service type, notes, hidden `website`
  - Submit via `fetch('/api/public/forms/'+slug+'/submit')` — not the JWT axios instance if that instance would attach cookies; cookies on a public page are fine but must not require them
  - Minimal Perioxia-neutral styling; show `headline` + `company_name` from GET
- **Internal copy-link:** on `frontend/app/sales/leads/page.jsx` only: “Website form”, copy `origin + /f/{slug}` from `GET /api/lead-forms`. Admin/md also get a team `<select>` bound to `PATCH /api/lead-forms` `{ default_team_id }` so new leads land on a team sales can actually list. Headline/active stay API-only in v0.

## Tests

`backend/tests/sales/test_public_lead_form.py` (and a tenancy case):

- Submit with valid slug creates a lead in **that** company with `source="Website"`, `assigned_to_id is None`
- Company B cannot `GET /api/leads/{id}` for that lead (404)
- Unknown slug → 404
- Inactive form → 404
- Honeypot `website="http://spam"` → 201 and lead count unchanged
- Missing name → 400; phone and email both empty → 400
- 11th POST from same IP inside the window → 429
- Authenticated `GET /api/lead-forms` returns slug for the caller’s company only
- Sales `GET /api/leads` with `X-Team-Id` of the form’s default team **includes** the new unassigned lead; a sales user on a **different** team does **not**

## Out of scope (this sub-project)

- Custom fields, file uploads, reCAPTCHA, Google Ads params
- Multiple forms / A/B pages / embed JS widget
- Notifications/email to sales on submit (that is cadence / reminders)
- Creating a Deal from the form
- Changing CORS; public page is same-origin

## Done when

A stranger opens `/f/{slug}`, submits name+phone, and the company’s sales user (on the form’s team) sees an Active Website lead in the list. Tests above green. No JWT on the public routes.

## Follows this spec

Implementation plan: to be written at `docs/superpowers/plans/2026-08-24-phase2-web-form.md` after this spec is approved.
