# Phase 5.9 — Deep sandbox data clone (design)

> Companion to [IMPLEMENTATION_PLAN.md](../../IMPLEMENTATION_PLAN.md) Phase 5.9.
> Extends [phase4-sandbox-design.md](./2026-08-25-phase4-sandbox-design.md).

## Problem

Phase 4.6 sandbox is an **empty** sibling company. Admins still cannot
try workflows, quotes, or invoices against realistic rows without
retyping live data. 5.9 copies a capped snapshot of the parent’s CRM
records into the sandbox at create time. Live rows stay on the parent.

## Decisions (locked)

1. **Clone on create** — `POST /api/sandbox` copies data after the
   sandbox company + admin exist. No second endpoint. Empty parent →
   empty clone (plus default pipeline/form/workflow seeds as today).

2. **What is copied** (capped at `MAX_CLONE_ROWS = 100` per table,
   oldest id first): pipelines + stages, products (stock_item_id
   cleared), custom field defs + values, accounts, clients, leads
   (not deleted), deals, quotes + items, invoices + items (portal
   share tokens cleared), scoring rules, custom modules + fields +
   records.

3. **What is never copied** — users/passwords, teams, billing,
   mailbox/calendar/OAuth/API keys/SAML, documents, email logs,
   webhooks, WhatsApp/telephony secrets, campaigns, cases, audit,
   notifications, refresh tokens.

4. **ID remap** — new rows in the sandbox. `company_id` = sandbox.
   User FKs (`assigned_to_id`, `created_by_id`, …) → sandbox admin if
   set, else null. `team_id` null. Parent FKs remapped via per-table
   id maps. Unmapped optional FK → null; required unmapped FK → skip
   that row.

5. **Seeds after clone** — if no pipeline was copied, run
   `ensure_default_pipeline`. Always mint a **new** lead-form slug
   (never copy the public URL). Keep default workflow rules seed.

6. **Isolation** — parent row counts unchanged. Sandbox GET of a
   parent lead id → 404. No new tables / no Alembic head.

7. **API** — 201 body gains `cloned: {leads, clients, …}` counts.
   Existing fields unchanged.

8. **UI** — settings copy says live records are copied (capped), not
   “empty company”. Show `cloned` totals after create when present.

## Non-goals

In-session company switch, incremental re-sync, cloning files/blobs,
cloning users as logins, SSO into sandbox, nested sandboxes.
