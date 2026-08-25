# Phase 6.6 — Portal pay + quote accept

**Goal:** Customers pay a shared invoice and accept/reject a shared quote.

## Files

- `backend/app/services/sales/quote_lifecycle.py` — accept/reject
- `backend/app/services/finance/invoice_pay.py` — payment URL + mark paid
- `backend/app/routers/public/portal.py` — public POSTs
- billing webhook + `WebhookResult.crm_invoice_id`
- frontend `/p/invoice`, `/p/quote`, `/p/pay/[token]`

## Tests

`backend/tests/portal/test_portal_actions.py`, webhook invoice paid.
