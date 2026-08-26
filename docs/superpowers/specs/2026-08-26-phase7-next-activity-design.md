# Phase 7.8 — Next-activity nag (design)

> Companion to [IMPLEMENTATION_PLAN.md](../../IMPLEMENTATION_PLAN.md) Phase 7.8
> and [the phase-7 spec](./2026-08-26-phase7-trial-defense-design.md).
> Extends [6.14 saved filters](./2026-08-25-phase6-saved-filters-design.md).

## Problem

6.14 added `due_today` / `rotting` views, but rotting uses `deals.updated_at` (not
real activity), there is no Pipedrive-style **mandatory next activity** on open
deals, and `due_today` has no email nag.

## Grounding (verified)

- `Meeting.deal_id`, `CallLog.deal_id`, `EmailLog.deal_id` exist; `Task` has no
  `deal_id` yet.
- `activity_timeline` projects email/call/meeting/audit for deals.
- `apply_deal_view` rotting: `updated_at < 14 days`.
- `run_due_reminders` emails for due tasks/follow-ups only.
- Stage move: `PATCH /deals/{id}/stage` with blueprint checks.

## Decisions (locked)

1. **`tasks.deal_id`** nullable FK. Tasks/meetings on a deal count as next activity.
2. **Next activity** = earliest future incomplete task (`due_date` ≥ start of UTC
   today) OR scheduled meeting (`starts_at` ≥ now) linked to the deal.
3. **Mandatory on forward stage moves:** when target stage position is greater than
   current **or** target is won/lost, open deals must have a next activity or
   stage move → **400** `"Schedule a next task or meeting before moving this deal"`.
   Same-stage and backward moves allowed without.
4. **Rotting view** uses **last timeline touch**: max timestamp across deal-linked
   email, call, meeting, task, and deal audit rows; fallback `deals.created_at`.
   Open deals with touch older than 14 days match (replaces `updated_at`).
5. **Due-today email:** extend `run_due_reminders` — open deals with
   `expected_close` = today (UTC) and `assigned_to_id` set; in-app notify + email
   once per day via new `deals.due_reminded_at` (cleared when `expected_close`
   changes). Respects existing `task_reminders_enabled` company flag.
6. **Deal API** adds `next_activity`, `last_touch_at`, `missing_next_activity`
   on serialize (when `db` passed). No new table.

## API / UI

- `POST /api/tasks` accepts optional `deal_id` (in-company deal).
- Deal board cards show **No next step** badge when `missing_next_activity`.
- Deal detail: small form to add next task (title + due date) when missing.

## Testing

`tests/sales/test_deal_next_activity.py`: next activity detection; stage block/allow;
rotting by email touch not updated_at; due email once; task with deal_id.

Alembic **`032_next_activity_nag`** off `031_price_books`.

## Residuals

No follow-up-on-deal, no auto-prompt after completing activity, rotting threshold
not configurable, no separate deal-reminder settings flag.
