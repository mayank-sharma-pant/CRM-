# Phase 6.14 — Saved filters / due views (design)

> Companion to [IMPLEMENTATION_PLAN.md](../../IMPLEMENTATION_PLAN.md) Phase 6.14.
> Pipedrive lite: named views + “my deals due today” + rotting nag.

## Problem

The deals board is unfiltered. Reps cannot pin “due today” or a rotting list, and
cannot save a named combination of pipeline/stage/view.

## Decisions (locked)

1. **Built-in `view` on list + board:** `due_today` | `rotting`. Invalid view → 400.
   - `due_today`: `expected_close` = today (UTC date) **and** `assigned_to_id` = caller.
   - `rotting`: `closed_at` is null **and** `updated_at` older than **14 days**.
2. **`saved_filters` table** — per user, tenant `company_id`, `name`, `object_type`
   (`deal` only for now), `filters` JSON: optional `view`, `pipeline_id`, `stage_id`,
   `assigned_to_id`. Unknown keys → 400.
3. **CRUD** `/api/saved-filters`. Other user’s id → 404.
4. **UI** on `DealsBoard`: All / Due today / Rotting; save current; apply saved.
5. No Alembic. New table via `create_all`. No new pip deps.

## Non-goals

Lead filters, shared-company filters, rotting email nags, custom date ranges.
