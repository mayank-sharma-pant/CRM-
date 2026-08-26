# Phase 7.10 — Deal / discount approvals (design)

> Companion to [IMPLEMENTATION_PLAN.md](../../IMPLEMENTATION_PLAN.md) Phase 7.10
> and [the phase-7 spec](./2026-08-26-phase7-trial-defense-design.md).

## Problem

Purchase can approve outbound invoices, but there is no Zoho-style gate when a **deal
amount** is large or a **quote line** is heavily discounted off list/book price.

## Decisions (locked)

1. **Company thresholds** on `company_settings`:
   - `deal_approval_amount_threshold` (Numeric, nullable — disabled when null)
   - `discount_approval_percent_threshold` (Float, nullable)
2. **`approval_status`** on `deals` and `quotes`: `pending` | `approved` | `rejected`
   (null = no approval gate). `approved_by_id`, `approved_at` on both.
3. **Deal:** when amount ≥ threshold (on create/update by non admin/md) → `pending`.
   Moving to **won or lost** blocked while `pending` or `rejected`. Admin/md approve/reject.
4. **Quote:** on create, max line discount vs list/book price ≥ threshold → `pending`.
   **Accept** blocked while `pending` or `rejected`. Discount only on `product_id` lines.
5. **Approvers:** admin and md only. Purchase invoice approval unchanged.
6. **API:** `GET/PUT /api/settings/approvals`; `GET /api/approvals/pending`;
   `POST /api/deals/{id}/approve|reject`, `POST /api/quotes/{id}/approve|reject`.
7. Notify admin/md when an entity enters `pending`.

Alembic **`034_deal_discount_approvals`** off `033_sales_orders`.

## Residuals

No multi-step approval chains, no discount on free-text lines, thresholds not per-role.
