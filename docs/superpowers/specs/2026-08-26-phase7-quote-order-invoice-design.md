# Phase 7.9 — Quote → sales order → invoice (design)

> Companion to [IMPLEMENTATION_PLAN.md](../../IMPLEMENTATION_PLAN.md) Phase 7.9
> and [the phase-7 spec](./2026-08-26-phase7-trial-defense-design.md).

## Problem

Accepting a quote today mints an invoice directly (Phase 2). Zoho’s money chain is
**quote → sales order → invoice**: accept commits the order; invoicing is a separate
step (fulfillment/billing). Purchase-side PO flows stay unchanged.

## Grounding (verified)

- `accept_quote` in `quote_lifecycle.py` creates `Invoice` + items, deducts stock,
  sets `quotes.invoice_id`.
- Portal accept uses the same lifecycle helper.
- `frontend/app/sales/orders/` lists invoices (sourced orders), not a distinct SO table.
- Alembic head: `032_next_activity_nag`.

## Decisions (locked)

1. **New tables:** `sales_orders`, `sales_order_items`. Mirror quote header/lines
   (amounts, GST snapshots, product lines).
2. **`quotes.sales_order_id`** nullable FK. **`quotes.invoice_id`** set only after
   SO → invoice conversion (unchanged column, new timing).
3. **Accept quote** creates an **open** sales order; **no invoice**, **no stock
   deduct**. Status `accepted`; `run_workflows(..., "quote_accepted")` unchanged.
4. **`POST /api/sales-orders/{id}/invoice`** converts an open order: creates invoice
   + items, deducts stock (moved from old accept), sets `sales_orders.invoice_id`,
   `sales_orders.status = invoiced`, `quotes.invoice_id`. Idempotent guard: already
   invoiced → 400.
5. **Tenancy:** company-scoped; foreign id → 404.
6. **Portal:** accept returns SO (no invoice until staff converts — portal pay stays
   on invoice share link after conversion).
7. **No cancel SO endpoint in v0.** Purchase orders untouched.

## API

| method | path | notes |
|--------|------|--------|
| GET | `/api/sales-orders` | optional `deal_id`, `client_id`, `status` |
| GET | `/api/sales-orders/{id}` | detail + items |
| POST | `/api/sales-orders/{id}/invoice` | convert open SO → invoice |

Quote serialize adds `sales_order_id`.

Alembic **`033_sales_orders`** off `032_next_activity_nag`.

## UI

- Deal detail: accept quote → show order; **Create invoice** when SO open and no invoice.
- Quote list on deal: show `sales_order_id` / invoice state.

## Testing

`tests/sales/test_sales_orders.py`: accept → SO; convert → invoice + stock;
double convert 400; company scope.

Update quote/portal/GST tests for two-step flow.

## Residuals

No SO cancel, no partial invoicing, no standalone SO create (quote-only in v0).
