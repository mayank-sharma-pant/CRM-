# Phase 6.4 — Unified activity timeline (design)

> Companion to [IMPLEMENTATION_PLAN.md](../../IMPLEMENTATION_PLAN.md) Phase 6.4.

## Problem

Lead detail builds a timeline in the browser from notes, tasks, audit, meetings, and calls.
Email and WhatsApp keep their own lists. Pipedrive wins with one record history.

## Decisions (locked)

1. **Projected feed, no new table.** `GET /api/timeline/{lead|client|deal}/{id}` unions company-scoped rows.
2. **Kinds:** `email`, `call`, `meeting`, `note`, `task`, `follow_up`, `whatsapp`, `audit`.
3. **Parent 404** if the record is not in the caller’s company (same as object GET).
4. **Sort** by `occurred_at` descending; `limit` (default 50, max 200) after merge.
5. **UI:** one `ActivityFeed` on lead and deal. Compose panels keep forms; hide duplicate history lists (`hideHistory`).
6. Keep `events` in the JSON as the same `items` array for the old lead page until it switches.

## Item shape

`{ id, kind, title, body, occurred_at, source_id }` — `id` is `"{kind}:{source_id}"`.

## Non-goals

Write-on-read denormalized `activities` table, invoice/task entity timelines (existing audit path can stay), filters UI, infinite scroll.
