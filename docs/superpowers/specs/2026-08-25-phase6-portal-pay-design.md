# Phase 6.6 — Portal pay + quote accept (design)

> Extends Phase 4.3 view-only magic links.

## Problem

Customers can view a shared invoice/quote but cannot pay or accept. Staff already have JWT `POST /quotes/{id}/accept` and a stub `POST /invoices/{id}/payment-link`.

## Decisions (locked)

1. **Same share token** — no customer login. `POST /api/portal/quotes/{token}/accept|reject` and `POST /api/portal/invoices/{token}/pay`.
2. **Accept/reject** reuse the staff quote lifecycle (draft only; accept creates the invoice). Actor for stock/ledger is the quote’s company (`created_by_id` when present).
3. **Pay** is idempotent: return existing `payment_url` if set. Razorpay payment link when `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` are set; otherwise stub `/p/pay/{token}`. Paid/cancelled invoices → 400.
4. **Mark paid** via Razorpay `payment_link.paid` / `payment.captured` on the existing `/api/billing/webhook` (`notes.crm_invoice_id`), or stub complete `POST /api/portal/pay-stub/{pay_token}` only when `payment_url` is the stub.
5. Public GET DTOs gain `can_accept` / `can_reject` / `payable` / `payment_url` (never hashes).

## Non-goals

Customer accounts, Stripe, partial payments, auto-emailing the link, changing staff accept semantics.
