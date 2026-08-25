# Phase 5.4 — Tally / QuickBooks sync (design)

> Companion to [IMPLEMENTATION_PLAN.md](../../IMPLEMENTATION_PLAN.md) Phase 5.4.

## Problem

CRM invoices stay internal. India buyers expect Tally; some want QuickBooks.
Live Tally XML-RPC / QBO OAuth needs vendor keys, extra deps, and a multi-week
integration. 5.4 ships the **adapter + mapping + one-way invoice push** so a
live provider can drop in later without rewriting CRM.

## Decisions (locked)

1. **Stub providers only** — no HTTP, no new pip/npm deps. `TallyStubProvider`
   and `QuickBooksStubProvider` build a canonical payload and a deterministic
   `external_id` (`sha256(provider|company_id|invoice_number)` hex, 32 chars).
   Same shape as 6.16's IRN stub: real envelope, fake wire.

2. **One-way CRM → accounting.** Push invoices. No pull of Tally/QBO books, no
   ledger-entry export, no customer/item master sync.

3. **Eligible statuses** — `Pending`, `Paid`, `Overdue`. `Draft` and
   `Cancelled` are skipped (`status: "skipped"`), never pushed.

4. **Connection** — one row per company in `accounting_connections`:
   `id, company_id, provider (tally|quickbooks), status (disconnected|connected),
   connected_at, last_sync_at, last_error`. Stub "Connect" sets `connected`
   without OAuth. Sync while disconnected → HTTP 400.

5. **Mapping** — `accounting_sync_items`:
   `id, company_id, entity_type ('invoice'), entity_id, provider, external_id,
   status (synced|skipped|failed), payload_hash, last_synced_at`.
   Unique `(company_id, entity_type, entity_id)`. Switching provider overwrites
   the row. Unchanged `payload_hash` is idempotent (`unchanged: true`, same
   `external_id`). Changed hash re-pushes, keeps the same `external_id`.

6. **No columns on `invoices`.** Mapping table is the source of truth.

7. **Schema** — models imported from `app.models.finance`; Alembic
   `021_accounting` (`down_revision: 020_predictions`) calls `apply_schema`.
   New tables via `create_all`. No `MISSING_COLUMNS` entries.

8. **Routes**
   - `GET/PUT/DELETE /api/accounting/connection` — admin/MD. PUT body
     `{provider: "tally"|"quickbooks"}` connects. DELETE disconnects.
     Missing row → GET `{provider: null, status: "disconnected"}`.
   - `POST /api/accounting/sync` — admin/MD bulk-push eligible invoices.
     Returns `{pushed, skipped, unchanged, failed, items}`.
   - `GET /api/accounting/items` — admin/MD list of mapping rows.
   - `GET /api/invoices/{id}/accounting` — any user who can GET the invoice.
   - `POST /api/invoices/{id}/sync` — same scope as GET invoice. 404 other
     tenant. 400 if disconnected or unknown invoice already handled as 404.

9. **Tenancy** — every query through `apply_company_scope` / `_get_invoice_scoped`.
   Foreign invoice id → **404**. RLS auto-covers `company_id` tables.

10. **UI** — `/settings/accounting` (admin/MD): pick provider, Connect /
    Disconnect, Sync now, last items. Invoice detail: accounting badge + Sync
    button when connected.

## Non-goals

Live Tally / QBO HTTP, OAuth, webhook inbound, Zoho Books, payments/credits
sync, scheduled sync, plan entitlement, ledger_entries export, overwrite of
CRM invoices from the books.
