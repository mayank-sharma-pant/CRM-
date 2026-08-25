# Phase 6.5 — One object UI (design)

> Companion to IMPLEMENTATION_PLAN.md Phase 6.5 / roadmap “Unify UI”.

## Problem

Leads already share `LeadsIndexPage` / `LeadDetailPage`. Clients, deals, and invoices still fork by role: copied detail pages, missing Deals nav, empty client activity.

## Decisions (locked)

1. **Canonical URLs stay role-prefixed** (`/sales/…`, `/manager/…`, `/md/…`). Do not introduce bare `/leads`. Role prefix is chrome; the component is one object.
2. **One component per object record and list** (where the list is the same job). Role pages are `export { default } from '…'`.
3. **MD `/md/clients` analytics stays** — it is not a client list. `/md/clients/[id]` uses the shared client record page.
4. **Purchase invoice record-payment** stays on `/purchase/invoices/[id]` (different API). Sales/manager invoice detail share one component.
5. **Deals** appear in sales/manager/MD nav; same board + detail.
6. Path helpers in `frontend/lib/objectPaths.cjs` (tested). `leadsPaths.js` re-exports.

## Non-goals

Merging dashboards, collapsing MD invoice analytics into the sales list, rewriting purchase invoice payments, moving to unprefixed `/leads`.
