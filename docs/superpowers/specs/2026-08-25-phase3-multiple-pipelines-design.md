# Phase 3.3 — Multiple pipelines (design)

> Extends [Phase 2 deals spec](./2026-08-24-phase2-deals-design.md). Tables already exist;
> v0 used a single default pipeline. This spec is the product feature: a company can run
> two (or more) deal pipelines and work each board separately.

## Goal

An admin/MD creates a second named pipeline (with the same default stages as the first).
The deals board switches between pipelines. Deals created while a pipeline is selected
land in that pipeline. Company B cannot mutate company A’s pipelines.

**Done when:** create pipeline B → board for B is empty of A’s deals → create a deal on B
→ it appears only on B’s board → default pipeline still has its original deals; cross-tenant
PATCH/DELETE of a pipeline is 404.

## Non-goals

Moving a deal between pipelines, per-pipeline permissions, cloning custom stages,
lead-status pipelines, MD dashboard rewiring.

## API (additions on `/api/deals`)

- `POST /pipelines` admin/md — `{name, is_default?}`. Seeds the five default stages.
  Setting `is_default=true` clears `is_default` on the company’s other pipelines.
- `PATCH /pipelines/{id}` admin/md — `{name?, is_active?, is_default?}`. Same default uniqueness.
  Cannot clear the last default (`is_default=false` with no other default → 400).
- `DELETE /pipelines/{id}` admin/md — 204. 400 if the pipeline is default, or if any deal
  still references it. 404 if not in company.
- `GET /board?pipeline_id=` — if `pipeline_id` is set and not in-company → 404.
  Response includes `pipeline_id` and `pipeline_name`.
- `GET /pipelines` seeds the default pipeline if the company has none (so the UI always has a row).

Sales: 403 on create/update/delete pipeline. GET remains open to all roles.

## Frontend

`frontend/app/sales/deals/page.jsx`: pipeline `<select>`, fetch board+stages with that id,
create deal with `pipeline_id`. Admin/MD: “New pipeline” (name prompt). Show kanban columns
even when the selected pipeline has zero deals.

## Tests

Create second pipeline; board isolation; create deal onto selected pipeline; sales 403;
cannot delete default or pipeline-with-deals; cross-tenant mutate 404 + owner positive control.
