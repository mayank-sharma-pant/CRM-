# Phase 7.11 — Import undo + clients/deals CSV (design)

> Companion to [IMPLEMENTATION_PLAN.md](../../IMPLEMENTATION_PLAN.md) Phase 7.11.

## Problem

3.6 ships lead CSV mapper/preview/commit only. No undo; no clients/deals import.

## Decisions (locked)

1. **`import_batches` + `import_batch_items`** track the latest commit per company.
2. **`POST /api/import/undo`** reverses the **most recent non-undone batch** for the company.
3. **Undo behavior:**
   - **Leads:** soft-delete (`deleted_at`)
   - **Clients:** hard-delete when unused (no invoices, quotes, deals, sales orders)
   - **Deals:** hard-delete when unused (no quotes, sales orders, tasks)
   - Rows that cannot be removed are **skipped**; batch still marked undone.
4. **Clients/deals** use same preview/commit + mapping pattern as leads (2 MB / 500 rows).
5. **Client fields:** name (required), email, phone, company, address, gstin.
6. **Deal fields:** title (required), amount, client_email or client_name (required to link),
   expected_close, source. Duplicate = same title + client.
7. Lead commit paths record a batch (mapper commit + legacy import).

Alembic **`035_import_batches`** off `034_deal_discount_approvals`.

## API

- `POST /import/clients/preview|commit`
- `POST /import/deals/preview|commit`
- `GET /import/last`
- `POST /import/undo`

## UI

Import CSV on clients + deals lists; undo last import when a batch exists.
