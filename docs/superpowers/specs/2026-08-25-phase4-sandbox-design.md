# Phase 4.6 — Sandbox (design)

> Companion to [IMPLEMENTATION_PLAN.md](../../IMPLEMENTATION_PLAN.md) Phase 4 and
> [PRODUCT_ROADMAP.md](../../PRODUCT_ROADMAP.md) §8 Phase 4 (“Sandbox”).
> Grounded in the code as of 25 Aug 2026 (verified, not assumed).
> Scope: **only** a separate empty sandbox tenant for admin experiments —
> no deep data clone, no JWT company override, no nested sandboxes.

## Problem

Admins need a place to try pipelines, workflows, forms, and CRM records without
touching live company data. Zoho’s Sandbox is a config/data playground. We have
no such tenant today — every mutation hits the production `company_id`.

`User.email` is globally unique and each user has one `company_id`, so “switch
company in the same session” would require JWT overrides across every scope helper.
v0 avoids that.

## Decisions (locked)

1. **Sandbox = a separate `Company` row** with `is_sandbox=true` and
   `sandbox_parent_id` → live parent. Full tenancy isolation via existing
   `apply_company_scope` / `company_id` — no changes to scope helpers.
2. **Empty CRM data** — seed default pipeline (and the same signup seeds:
   default lead form + workflow rules). Do **not** clone leads, deals, clients,
   invoices, or users from the parent.
3. **One sandbox admin user** created with a synthetic email
   `sandbox.{parent_id}.{token8}@sandbox.local` and a random password returned
   **once** on create. Operator logs in as that user (second browser / logout).
4. **At most one live sandbox per parent** — application-enforced: reject create
   if a non-suspended child with `sandbox_parent_id=parent.id` already exists.
5. **Admin / MD only** on the parent may create or destroy. Sandbox cannot create
   another sandbox.
6. **Destroy** — disable sandbox users; set sandbox company `status=suspended`;
   set `sandbox_parent_id=NULL` so the parent may create a new one later.
7. **Billing** — sandbox companies cannot `POST /checkout` (or equivalent pay).
   Attach a Starter `active` subscription with no provider charge so seat limits
   still have a plan row (same pattern as limits fallback).
8. **Approach:** two columns on `companies` via `_MISSING_COLUMNS`; service +
   `/api/sandbox` router; `/auth/me` exposes `is_sandbox`; settings UI + layout
   banner. No Alembic. No new pip deps.

## Non-goals

Deep clone of production data, JWT/`cid` acting-as override, SSO into sandbox,
auto-sync from parent, nested sandboxes, platform-admin sandbox tooling,
partial unique DB indexes (enforce in app), emailing credentials, sandbox expiry.

## Data model

### `companies` (new columns)

| column | type | notes |
|---|---|---|
| is_sandbox | Boolean, not null, default false | |
| sandbox_parent_id | Integer, nullable, FK → companies.id, index | set on sandbox rows; null on live / destroyed |

Both via `_MISSING_COLUMNS` + matching SQLAlchemy attributes.

## APIs (JWT)

Who may call create/destroy/status writes: **admin** or **md** of a **non-sandbox**
company. `GET` status: any authenticated company user (read-only).

| method | path | behaviour |
|---|---|---|
| `GET` | `/api/sandbox` | Status for caller’s company |
| `POST` | `/api/sandbox` | Create sandbox (parent only); **201** with credentials once |
| `DELETE` | `/api/sandbox` | Destroy linked sandbox (callable from parent **or** from inside the sandbox as its admin/md) |

Never take `company_id` / `sandbox_parent_id` from the body.

### `GET /api/sandbox` response

```json
{
  "is_sandbox": false,
  "sandbox": null
}
```

When parent has an active (non-suspended) sandbox:

```json
{
  "is_sandbox": false,
  "sandbox": {
    "id": 12,
    "name": "Acme (Sandbox)",
    "company_code": "AB1",
    "status": "active",
    "admin_email": "sandbox.5.a1b2c3d4@sandbox.local"
  }
}
```

When caller is already in a sandbox:

```json
{
  "is_sandbox": true,
  "parent_company_id": 5,
  "parent_name": "Acme",
  "sandbox": { "id": 12, "name": "Acme (Sandbox)", "company_code": "AB1", "status": "active", "admin_email": "..." }
}
```

### `POST /api/sandbox` response (201)

```json
{
  "id": 12,
  "name": "Acme (Sandbox)",
  "company_code": "XY9",
  "admin_email": "sandbox.5.a1b2c3d4@sandbox.local",
  "password": "<once>",
  "login_hint": "Log out and sign in with the sandbox admin email to use the sandbox."
}
```

Errors:

- Already has sandbox → **400** `"sandbox already exists"`
- Caller company is sandbox → **400** `"cannot create sandbox from a sandbox"`
- Not admin/md → **403**

### `DELETE /api/sandbox`

- From parent: destroy the child sandbox (if any); **204**. Idempotent if none.
- From sandbox: destroy self; **204**.
- Not admin/md → **403**

Destroy steps: set all sandbox-company users `status=disabled` / `is_active=false`;
set company `status=suspended`, `sandbox_parent_id=NULL`.

## Create steps (service)

1. Validate caller company is not sandbox; no existing non-suspended child.
2. Create `Company(name=f"{parent.name} (Sandbox)", status=active, is_sandbox=True, sandbox_parent_id=parent.id, company_code=generate_company_code(...))`.
3. Create admin `User` with synthetic email, random 16-char password, role=admin, status=active, employee_num=1.
4. Attach Starter plan `Subscription(status="active", provider="none")` if Starter exists.
5. `ensure_default_pipeline`, `ensure_default_lead_form`, `ensure_default_workflow_rules` (same as signup; swallow/log seed failures like signup).
6. Commit; return credentials (raw password only in this response).

## `/auth/me`

Add `is_sandbox: bool` (false if no company). Load from `Company.is_sandbox` for
`current_user.company_id`. Frontend AuthContext / layout use this for a banner.

## Frontend

- `/settings/sandbox` — admin/md: show status, Create, Destroy; after create show
  email+password once with copy hint.
- Sidebar Settings → Sandbox (admin/md), same pattern as Territories.
- When `user.is_sandbox` (from `/me`): persistent top banner
  “Sandbox — changes do not affect production.”

## Testing

- Schema: columns exist; can persist sandbox company.
- Service/API: create → login as sandbox admin → see isolated empty leads;
  parent still sees own leads; second create → 400; create-from-sandbox → 400;
  destroy → sandbox users cannot login; parent can create again; checkout on
  sandbox → 400; cross-tenant GET sandbox status cannot see other companies’
  sandboxes.
- No new pip deps. No Alembic.

## Residuals (explicit)

No data clone, no in-session switch, no credential email, no auto-expiry,
no platform-admin list of sandboxes beyond normal company list.
