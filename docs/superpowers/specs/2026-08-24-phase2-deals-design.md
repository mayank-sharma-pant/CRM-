# Phase 2 · Sub-project 1 — Deal object & configurable pipeline

> Design spec. Companion to [IMPLEMENTATION_PLAN.md](../../IMPLEMENTATION_PLAN.md) Phase 2, item 1.
> Grounded in the code as of 24 Aug 2026 (verified, not assumed).
> Scope: **only** the Deal object + pipeline foundation. Web form, custom fields,
> quotes, workflow, cadence, email, etc. are later Phase-2 sub-projects with their own spec→plan cycles.

## Problem

There is no money-pipeline object. `Lead.status` is a hardcoded Python enum
(`New → Contacted → Qualified → Proposal → Converted → Lost`, `app/models/core/enums.py:44`)
that doubles as the pipeline. The MD "pipeline" (`app/routers/management/md.py:136`) is
**lead counts per stage** — no amount, no forecast. Revenue only appears once an `Invoice`
is `Paid`. So the roadmap's "money on the pipeline" does not exist; the Deal object introduces it.

## Decisions (locked in brainstorming)

1. **Separate Deal, Lead stays top-of-funnel** (Zoho/HubSpot model). Lead keeps its
   qualification statuses; a Deal is the money opportunity, linked to a lead and/or client.
2. **Self-contained scope.** Ship the Deal model, CRUD API, a deal-pipeline (kanban/list)
   view, and amount-weighted forecast on the deal surface only. **MD/manager dashboards stay
   on lead counts** this round.
3. **One default pipeline per company for v0**, but `pipelines` + `pipeline_stages` tables
   and `Deal.pipeline_id` exist so multi-pipeline (roadmap Phase 3) is a data change, not a migration.
4. **Stages carry `stage_type` (`open`/`won`/`lost`)** and a `default_probability`, so forecasts
   and win-rate are computable.

## Data model

All three are **new tables** — `Base.metadata.create_all` (via `create_missing_tables.py`)
creates them; no `ALTER`, nothing added to `_MISSING_COLUMNS`. Alembic still has two
pre-existing heads — untouched, same decision as Phase 1.

New enum in `app/models/core/enums.py`:

```python
class DealStageType(str, enum.Enum):
    OPEN = "open"
    WON = "won"
    LOST = "lost"
```

### `pipelines` — `app/models/sales/pipeline.py`
| column | type | notes |
|---|---|---|
| id | Integer PK | |
| company_id | Integer FK→companies, indexed, not null | tenancy anchor |
| name | String(255), not null | |
| is_default | Boolean, default False | one default per company |
| is_active | Boolean, default True | |
| created_at / updated_at | DateTime | server_default/onupdate |

### `pipeline_stages` — same file
| column | type | notes |
|---|---|---|
| id | Integer PK | |
| company_id | Integer FK→companies, indexed, not null | tenancy anchor (denormalized for scope/tests) |
| pipeline_id | Integer FK→pipelines, not null | |
| name | String(255), not null | |
| position | Integer, not null | ordering within pipeline |
| stage_type | Enum(DealStageType), default OPEN | non-native enum, `values_callable` (match existing pattern) |
| default_probability | Integer, default 0 | 0–100 |
| is_active | Boolean, default True | |
| created_at | DateTime | |

### `deals` — `app/models/sales/deal.py`
| column | type | notes |
|---|---|---|
| id | Integer PK | |
| company_id | Integer FK→companies, indexed, not null | tenancy anchor |
| title | String(255), not null | |
| amount | Numeric(12,2), default 0 | money — Numeric, not Float (match Invoice) |
| currency | String(3), default "INR" | |
| pipeline_id | Integer FK→pipelines, not null | |
| stage_id | Integer FK→pipeline_stages, not null | |
| probability | Integer, nullable | null → falls back to stage.default_probability |
| expected_close | Date, nullable | |
| closed_at | DateTime, nullable | set when moved into a won/lost stage; cleared if moved back to open |
| lead_id | Integer FK→leads, nullable | provenance |
| client_id | Integer FK→clients, nullable | set later (quote→invoice sub-project) |
| assigned_to_id | Integer FK→users, nullable | ownership — mirrors Lead |
| created_by_id | Integer FK→users, nullable | |
| team_id | Integer FK→teams, nullable | role row-scope — mirrors Lead |
| source | String(100), nullable | mirrors Lead |
| created_at / updated_at | DateTime | |

Ownership columns intentionally mirror `Lead` so existing role row-scoping,
`apply_company_scope`, and `ensure_company_access` (`app/utils/dependencies.py`) apply unchanged.

## Seeding — lazy, per tenant

`ensure_default_pipeline(db, company_id)` in `app/services/sales/pipeline_seed.py`. Idempotent: if the company has no pipeline,
create a default pipeline + these stages:

| position | name | stage_type | default_probability |
|---|---|---|---|
| 1 | Qualification | open | 10 |
| 2 | Proposal | open | 40 |
| 3 | Negotiation | open | 70 |
| 4 | Won | won | 100 |
| 5 | Lost | lost | 0 |

Called on first deal list/create so it covers **both** existing tenants and new signups
without a backfill migration. Also called at signup (`app/routers/auth/auth.py`) for cleanliness.

## API — `app/routers/sales/deals.py`, prefix `/api/deals`

Registered in `app/main.py` alongside the other sales routers. Schemas in
`app/schemas/sales/deal.py` (`DealCreate`, `DealUpdate`, `DealStageUpdate`, `DealResponse`,
`PipelineResponse`, `StageResponse`, `PipelineBoardResponse`).

| method + path | purpose | notes |
|---|---|---|
| `GET /api/deals` | list, filter by pipeline_id/stage_id/assignee | role row-scoped via `apply_company_scope` + team logic (mirror leads) |
| `POST /api/deals` | create | pipeline_id optional→default; stage_id optional→first stage; validates ownership |
| `GET /api/deals/{id}` | read | `ensure_company_access` |
| `PATCH /api/deals/{id}` | update fields | |
| `PATCH /api/deals/{id}/stage` | kanban move | sets stage_id, applies stage default probability if deal.probability is null, sets/clears closed_at on won/lost↔open transition; **audit-logged** via `log_activity` |
| `DELETE /api/deals/{id}` | delete | scoped |
| `GET /api/deals/pipeline` | board view | stages with their deals, per-stage totals, **weighted forecast** |
| `GET /api/deals/pipelines` | list pipelines | all roles |
| `GET /api/deals/stages` | list stages | all roles (UI needs it) |
| `POST/PATCH/DELETE stages` | configure stages | **admin/md only** — the company-configurable-stages requirement |

**Forecast:** weighted pipeline value = `Σ(deal.amount × effective_probability / 100)`
over **open** deals (stage_type == open), where `effective_probability = deal.probability
if not null else stage.default_probability`. Won value = `Σ(amount)` where stage_type == won.

**Validation / errors:**
- `stage_id` must belong to the deal's `pipeline_id` → 400 otherwise.
- negative `amount` → 400.
- moving into a won/lost stage does **not** auto-create a Client or Invoice in this
  sub-project (deferred — see below).

## Deliberate deferrals (flagged, not smuggled)

1. **Won does not auto-create a Client/Invoice.** That convert step belongs to
   sub-project 4 (quote → invoice → payment link). This keeps the Deal unit self-contained.
2. **MD/manager dashboards stay on lead counts.** Rewiring `md.py:136` (and manager
   equivalents) to sum real deal money is a follow-up sub-project.
3. **Multi-pipeline UI** is not built; the schema supports it, v0 uses the single default pipeline.

## Frontend

New `frontend/app/sales/deals/` — `page.jsx` (kanban board + list toggle) and
`[id]/page.jsx` (deal detail), mirroring the existing `frontend/app/sales/leads/`
component patterns and the `sales/layout.jsx`. Minimal surface; the broad five-role
UI unification (roadmap §6.1) stays a separate Phase-2 concern.

## Testing (TDD)

- `backend/tests/sales/test_deals.py`:
  - CRUD happy path + validation (bad stage/pipeline pairing → 400, negative amount → 400).
  - stage move sets `closed_at` on won/lost and clears it on move back to open; applies
    stage default probability when deal.probability is null.
  - **explicit weighted-forecast arithmetic** — assert the computed number against a
    hand-derived expected value (not just "non-zero").
  - `ensure_default_pipeline` idempotent (calling twice yields one pipeline, five stages).
  - role row-scope: sales sees own/team deals only; manager/md/admin wider (mirror leads tests).
  - stage config endpoints: admin/md can create/reorder; sales gets 403.
- Extend `backend/tests/tenancy/`: deals read/patch/delete/stage by-id → company B admin
  gets **404** (not 403), each paired with a **positive control** (company A owner succeeds),
  matching the Phase-0 gate style.

## Deploy note

Run `create_missing_tables.py` on deploy — it creates the three new tables via `create_all`.
No new columns on existing tables, so `_MISSING_COLUMNS` is unchanged. `razorpay` install
note from Phase 1 is unaffected.

## Done when

A deal can be created, moved across configurable stages via the board, and the board
returns a correct weighted forecast; cross-tenant access to deals returns 404; full suite green.
