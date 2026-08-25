# Phase 4.4 — Forecasting (quota vs pipeline) (design)

> Companion to [IMPLEMENTATION_PLAN.md](../../IMPLEMENTATION_PLAN.md) Phase 4 and
> [PRODUCT_ROADMAP.md](../../PRODUCT_ROADMAP.md) §4.1 / §8 Phase 4
> (“Forecasting (quota vs pipeline)”).
> Grounded in the code as of 25 Aug 2026 (verified, not assumed).
> Extends Phase 2 deals board weighted `open_forecast` with **per-user monthly quotas**.

## Problem

The deals board already computes company/pipeline **weighted open forecast**
(`amount × effective probability`). There is no **quota** and no
**quota vs closed-won vs pipeline** view. Roadmap calls that out as missing
versus Zoho Professional.

## Decisions (locked in brainstorming)

1. **Quota targets + compare** to closed-won and weighted open pipeline (not forecast categories alone).
2. **Per user, monthly** period (`year` + `month`).
3. Metrics vs quota: **closed_won** (Won deals with `closed_at` in month) **and** **open_weighted** (current open deals, board math).
4. **Approach:** new `sales_quotas` table + forecast report API + UI. No Alembic; `create_all` for the new table. No new pip deps. UTC calendar months in v0.

## Non-goals

Forecast categories on deals (commit / best case / pipeline), team-native quotas,
quarterly/annual periods, currency conversion, expected_close–based open filtering,
quota history audit log, email digests, AI predictions.

## Data model

### `sales_quotas`

| column | type | notes |
|---|---|---|
| id | Integer PK | |
| company_id | Integer FK companies, not null, indexed | tenant |
| user_id | Integer FK users, not null, indexed | quota owner (must be same company) |
| year | Integer, not null | e.g. 2026 |
| month | Integer, not null | 1–12 |
| amount | Numeric(12,2), not null, default 0 | target |
| created_at / updated_at | DateTime | server defaults |

**UniqueConstraint** `(company_id, user_id, year, month)`.

## Metric definitions

For a given company, user, `year`, `month` (UTC):

### `closed_won`

Sum of `Deal.amount` where:

- `company_id` matches
- `assigned_to_id == user_id`
- current stage `stage_type == won` (or was closed — use current stage Won + `closed_at` set)
- `closed_at` ≥ start of month UTC and `<` start of next month UTC

### `open_weighted`

Sum over deals where:

- `company_id` matches
- `assigned_to_id == user_id`
- stage `stage_type == open` and stage/deal active as board does
- `effective_probability = deal.probability if not None else stage.default_probability or 0`
- contribution = `amount * effective_probability / 100`

Same formula as `deals.py` board. Do **not** filter by `expected_close` in v0.

### Ratios

- `closed_pct` = `closed_won / quota` when quota > 0, else `null`
- `pipeline_pct` = `open_weighted / quota` when quota > 0, else `null`

Unassigned deals (`assigned_to_id IS NULL`) do **not** count toward any user’s metrics.

## APIs

Prefix: `/api/forecasting` (new router). Never take `company_id` from body.

### Quotas

| method | path | who | behaviour |
|---|---|---|---|
| `GET` | `/api/forecasting/quotas?year=&month=` | scoped | list quotas for period in caller's visible user set |
| `PUT` | `/api/forecasting/quotas` | write roles | upsert `{user_id, year, month, amount}` |
| `DELETE` | `/api/forecasting/quotas/{id}` | write roles | delete; 404 cross-tenant |

**Write roles:** `admin`, `md`; `manager` only if target `user_id` is an active member of manager’s **active team**. Sales: no writes.

**Read quotas / report:**

- `admin` / `md`: all company users (active)
- `manager`: self + active team members
- `sales`: self only

### Report

| method | path | behaviour |
|---|---|---|
| `GET` | `/api/forecasting/report?year=&month=` | rows for users in scope |

Each row:

```json
{
  "user_id": 1,
  "full_name": "...",
  "email": "...",
  "quota": "10000.00",
  "closed_won": "2500.00",
  "open_weighted": "4000.00",
  "closed_pct": 0.25,
  "pipeline_pct": 0.4,
  "quota_id": 12
}
```

Users with no quota row still appear with `quota: "0.00"` and `quota_id: null` so managers see pipeline without a target.

Invalid month (not 1–12) or missing year/month → **400**.

By-id miss / cross-tenant → **404**.

## Service

`app/services/sales/forecasting.py`:

- `month_bounds(year, month) -> (start, end_exclusive)` UTC
- `effective_probability(deal, stage) -> int`
- `closed_won_for_user(...)`, `open_weighted_for_user(...)`
- `build_report(db, *, company_id, users, year, month) -> list[dict]`

Keep board math in one place: either import a shared helper extracted from deals board later, or duplicate the one-liner `amount * eff / 100` with a comment pointing at the board — prefer a tiny shared `weighted_amount(deal, stage)` in `forecasting.py` used only here in v0 (board refactor out of scope).

## Frontend

- Page: `frontend/app/reports/forecast/page.jsx` (and role wrappers or link from existing `/reports` if that is the shared hub).
- Month/year controls; table: user, quota, closed won, weighted pipeline, % columns.
- Admin/MD/manager: inline edit quota (PUT) when allowed; sales: read-only own row.
- Loading / error / empty / success states.

Sidebar: add “Forecast” under Reports for roles that can open `/reports`.

## Testing

- Schema: table + unique constraint
- Service: closed_won month bounds; open_weighted probability fallback; unassigned excluded
- API: upsert, report numbers, sales cannot PUT, manager cannot set outside team, cross-tenant 404
- Board arithmetic regression: existing `test_board_weighted_forecast_arithmetic` still green

## Deploy

New table via `create_all` / `create_missing_tables.py` (no column ALTERs). Run create script on deploy.

## Done when

1. Admin can set a monthly quota for a sales user.
2. Report shows quota, closed_won, open_weighted for that month.
3. Role scoping and cross-tenant tests green.
4. No forecast categories / team quotas shipped.

## Residuals

- UTC months only; no company timezone.
- Unassigned deals ignored.
- Board UI still shows pipeline-level forecast only (unchanged).
- Quota unique index exists on the model for fresh DBs.
