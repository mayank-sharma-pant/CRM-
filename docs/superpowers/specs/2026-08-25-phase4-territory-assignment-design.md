# Phase 4.5 — Assignment by territory (design)

> Companion to [IMPLEMENTATION_PLAN.md](../../IMPLEMENTATION_PLAN.md) Phase 4 and
> [PRODUCT_ROADMAP.md](../../PRODUCT_ROADMAP.md) §4.2 / §8 Phase 4
> (“Assignment by territory”).
> Grounded in the code as of 25 Aug 2026 (verified, not assumed).
> Builds on existing team round-robin in `app/services/sales/workflow.py`
> (`assign_round_robin`).

## Problem

Leads are assigned manually or by company-wide / team round-robin workflow.
There is no way to route a new lead to a **team** based on attributes like
`service_type` or `source` (the fields leads already have — no city/state today).

## Decisions (locked in brainstorming)

1. **Named territories** with rules matching `service_type` and/or `source` (exact,
   case-insensitive). No geo/pincode in v0.
2. Match → set `lead.team_id` to the territory’s team → **round-robin** among that
   team’s active sales users (same load sort as `_assign_round_robin`).
3. Run on **lead create** (authenticated API + public form) when `assigned_to_id`
   is null; call **before** `run_workflows(..., "lead_created")` so existing RR
   workflow is a fallback when no territory matches (or no-ops if already assigned).
4. **Approach:** `territories` + `territory_rules` tables; service
   `assign_lead_by_territory`; admin/MD CRUD. No Alembic; `create_all`. No new pip deps.

## Non-goals

Geography/pincode, deal/client territories, workflow-only assignment mode,
AND across multiple fields on one rule, auto-reassign when lead fields change,
manager-owned territory CRUD, replacing teams.

## Data model

### `territories`

| column | type | notes |
|---|---|---|
| id | Integer PK | |
| company_id | Integer FK, not null, indexed | |
| name | String(255), not null | |
| team_id | Integer FK teams, not null | must belong to same company |
| priority | Integer, not null, default 100 | **lower runs first** |
| is_active | Boolean, not null, default true | |
| created_at / updated_at | DateTime | |

### `territory_rules`

| column | type | notes |
|---|---|---|
| id | Integer PK | |
| company_id | Integer FK, not null, indexed | denormalized for scoping |
| territory_id | Integer FK territories, not null, indexed | cascade delete with territory |
| match_field | String(32), not null | allowlist: `service_type`, `source` |
| match_value | String(255), not null | trimmed; empty rejected |

A territory matches a lead if **any** of its rules match (OR). Matching:
`str(getattr(lead, field) or "").strip().lower() == match_value.strip().lower()`.
Blank lead field never matches.

Among matching active territories, pick the one with smallest `(priority, id)`.

## Assignment algorithm

`assign_lead_by_territory(db, lead) -> None`:

1. If `lead.assigned_to_id` is set → return.
2. Load active territories for `lead.company_id` ordered by `priority`, `id`, with rules.
3. Find first territory that matches (OR rules).
4. If none → return (workflow RR may still assign).
5. Set `lead.team_id = territory.team_id`.
6. Round-robin: active users with `role == "sales"` and `TeamMembership` for that
   team; pick lowest open lead count (same as `_assign_round_robin`). If no
   candidates → leave `assigned_to_id` null but keep `team_id` set.

Prefer extracting shared RR helper used by workflow + territory to avoid drift;
if extraction is large, call a new `round_robin_sales_on_team(db, company_id, team_id)`
from both places in the same change set.

## Call sites

- `create_lead` in `app/routers/sales/leads.py` — after flush, before `run_workflows`.
- Public form submit in `app/routers/public/lead_forms.py` — same order.

Do **not** run on lead PATCH / status change in v0.

## APIs

Prefix `/api/territories`. Never take `company_id` from body. Writes: **admin / md** only.
Reads: admin/md (and optionally manager read-only — v0: same write roles for list, or all company users read list — prefer **any authenticated company user can GET list**; only admin/md mutate).

| method | path | behaviour |
|---|---|---|
| `GET` | `/api/territories` | list with nested `rules` |
| `POST` | `/api/territories` | create `{name, team_id, priority?, is_active?, rules?: [...]}` |
| `PATCH` | `/api/territories/{id}` | update name/team/priority/is_active |
| `DELETE` | `/api/territories/{id}` | delete territory + rules; **204** |
| `POST` | `/api/territories/{id}/rules` | add `{match_field, match_value}` |
| `DELETE` | `/api/territories/{id}/rules/{rule_id}` | delete rule; **204** |

Invalid `match_field` / empty `match_value` / foreign `team_id` → **400**.
By-id miss / cross-tenant → **404**.

## Frontend

- Page: `frontend/app/settings/territories/page.jsx` (admin/md).
- Sidebar link under Settings for admin/md.
- List territories; create form (name, team select, priority); rules editor per territory.
- Loading / error / empty / success.

## Testing

- Schema: tables exist; cascade/company_id present.
- Service: match by service_type; priority; OR rules; skip if assigned; RR within team; no match leaves assignee null.
- API: CRUD + rules; sales 403 on write; cross-tenant 404.
- Integration: create lead with matching service_type gets team + assignee; public form path; workflow RR still works when no territory.

## Deploy

New tables via `create_all` / `create_missing_tables.py`. Run create script on deploy.

## Done when

1. Admin can define a territory → team with a `service_type` rule.
2. New lead with that `service_type` lands on that team with a sales assignee.
3. Unmatched leads still get company RR if the workflow rule is on.
4. Cross-tenant tests green.

## Residuals

- No geo fields; no reassign on update.
- OR rules only (not AND).
- Manager cannot configure territories in v0.
