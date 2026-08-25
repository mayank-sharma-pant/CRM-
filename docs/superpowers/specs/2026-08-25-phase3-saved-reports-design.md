# Phase 3.4 — Saved reports + simple dashboard builder (design)

> Part of [PRODUCT_ROADMAP.md](../../PRODUCT_ROADMAP.md) §4.1 (“Standard reports”) and
> [IMPLEMENTATION_PLAN.md](../../IMPLEMENTATION_PLAN.md) Phase 3.
> Phase 3 is a menu of independent sub-projects; **this spec covers only saved reports and a
> one-dashboard widget board.** Pulled forward by explicit decision after 3.3. Grounded in the
> code as of 25 Aug 2026.

## Goal

A company can **name and save** the existing leads/invoices report (date range, source,
service type, group-by), **re-run** it later, **download CSV**, and **pin widgets** of those
saved reports onto one company dashboard.

**Done when:** admin/MD saves a report with a date range → GET run returns the same KPI/chart/grid
shape as `GET /api/md/reports/custom` → CSV of the grid downloads → a widget on the default
dashboard renders that report → company B GET/PATCH/DELETE of A’s report or widget is 404 with a
positive control that A still succeeds.

## Non-goals (YAGNI)

Custom SQL, arbitrary entity/column pickers, scheduled email, sharing links, per-user dashboards,
drag-drop grid libraries, forecasting, replacing role dashboards (`/sales/reports`, MD cockpit).

## Decisions

1. **One report type in v0:** `leads_invoices` — the existing MD custom report. Filters are
   stored JSON, executed live (not a snapshot).
2. **One dashboard per company**, auto-created on first GET. Widgets reference a saved report
   and a visualization (`kpi` | `chart` | `table`). Order is an integer `position`.
3. **Roles:** any authenticated company user may list, get, run, CSV, and view the dashboard.
   Create/update/delete of reports and widgets is **admin or MD**. Sales 403 on mutate.
4. **No Alembic, no new pip deps.** New tables via `Base.metadata.create_all`.
5. **Do not accept `company_id` from the body.** Scope from the session user.

## Data model

New enums in `app/models/core/enums.py`:

```python
class SavedReportType(str, enum.Enum):
    LEADS_INVOICES = "leads_invoices"

class DashboardWidgetViz(str, enum.Enum):
    KPI = "kpi"
    CHART = "chart"
    TABLE = "table"
```

### `saved_reports` — `app/models/sales/saved_report.py`

| column | type | notes |
|--------|------|-------|
| id | Integer PK | |
| company_id | Integer FK→companies, indexed, not null | tenancy |
| name | String(255), not null | stripped, non-empty |
| report_type | Enum(SavedReportType), not null | non-native, `values_callable` |
| filters | JSON, not null | see shape below |
| created_by_id | Integer FK→users, nullable | |
| created_at / updated_at | DateTime | server_default / onupdate |

Filters JSON (unknown keys ignored; missing keys default):

```json
{
  "start_date": "YYYY-MM-DD or null",
  "end_date": "YYYY-MM-DD or null",
  "source": "string or null (null/All = no filter)",
  "service_type": "string or null",
  "group_by": "date | source | service_type"
}
```

`group_by` default `"date"`. Invalid `group_by` or bad date format → 400.

### `dashboards` — `app/models/sales/dashboard.py`

| column | type | notes |
|--------|------|-------|
| id | Integer PK | |
| company_id | Integer FK, unique, not null | one row per company |
| name | String(255), not null | default `"Company dashboard"` |
| created_at / updated_at | DateTime | |

### `dashboard_widgets` — same file

| column | type | notes |
|--------|------|-------|
| id | Integer PK | |
| company_id | Integer FK, indexed, not null | tenancy |
| dashboard_id | Integer FK→dashboards, not null | |
| saved_report_id | Integer FK→saved_reports, not null | must be same company |
| visualization | Enum(DashboardWidgetViz), not null | |
| title | String(255), nullable | override display name |
| position | Integer, not null, default 0 | sort ascending |
| created_at | DateTime | |

Deleting a saved report deletes its widgets in the same request (application-level).

## API

Prefix `/api/reports` and `/api/dashboards`.

Saved reports:

- `POST /api/reports` admin/md — `{name, report_type, filters}` → 201
- `GET /api/reports` — `{items, total}` company-scoped
- `GET /api/reports/{id}` — definition
- `PATCH /api/reports/{id}` admin/md — `{name?, report_type?, filters?}`
- `DELETE /api/reports/{id}` admin/md — 204
- `GET /api/reports/{id}/run` — live result `{kpis, chartData, gridData}` (same keys as MD custom)
- `GET /api/reports/{id}/csv` — `text/csv` of `gridData` columns:
  Invoice, Client, Date, Source, Product, Status, Amount

Dashboard:

- `GET /api/dashboards/default` — get-or-create; `{id, name, widgets: [...]}` widgets include nested
  `report` `{id, name, report_type}` (not the live run)
- `POST /api/dashboards/default/widgets` admin/md — `{saved_report_id, visualization, title?, position?}` → 201
- `PATCH /api/dashboards/default/widgets/{id}` admin/md
- `DELETE /api/dashboards/default/widgets/{id}` admin/md — 204

Cross-tenant GET/PATCH/DELETE by id → 404. Foreign `saved_report_id` on widget create → 400.

`GET /api/md/reports/custom` stays; it calls the shared runner so saved-report run and MD UI cannot drift.

## Frontend

Canonical page `frontend/app/reports/page.jsx` (shared RouteGuard path `/reports`):

- Filter bar matching MD custom (start/end date, source, service type, group-by)
- Save as named report (admin/md)
- List saved reports; load filters; Run; Download CSV
- Dashboard: add current/selected report as a widget (kpi/chart/table); reorder (position);
  remove; each widget runs its report and shows the chosen viz

Nav: MD + admin + manager get a “Saved reports” item → `/reports`. Do not replace
`/manager/reports` (sales performance). Existing `/md/reports` keeps working and gains Save.

## Tests

Schema: tables exist with `company_id`; persist a report + dashboard + widget.

API: create/list/run/csv/patch/delete; sales 403 on mutate; widget CRUD on default dashboard;
delete report removes widgets; invalid filters 400.

Tenancy: B cannot GET/PATCH/DELETE A’s report or widget (404); A’s positive control succeeds.
