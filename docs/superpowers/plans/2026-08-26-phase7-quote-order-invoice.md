# Phase 7.9 — Quote → sales order → invoice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Zoho-style money chain — accept quote mints sales order; convert order to invoice (stock deduct on convert).

**Architecture:** `sales_orders` + `sales_order_items`; refactor `accept_quote` → SO; `convert_sales_order_to_invoice`; `/api/sales-orders` router; deal detail UI.

**Tech Stack:** FastAPI, SQLAlchemy, Alembic, Next.js.

**Spec:** [`docs/superpowers/specs/2026-08-26-phase7-quote-order-invoice-design.md`](../specs/2026-08-26-phase7-quote-order-invoice-design.md)

## Global Constraints

- Company-scope all rows; foreign id → 404.
- Stock deduct on invoice conversion only (moved from accept).
- Portal accept creates SO; invoice pay unchanged (after staff converts).
- Alembic head `033_sales_orders` off `032_next_activity_nag`.

---

### Task 1: Models + migration

- `app/models/sales/sales_order.py`
- `quotes.sales_order_id`; `SalesOrderStatus` enum
- Alembic `033_sales_orders`
- Update `test_alembic_heads.py`

### Task 2: Lifecycle + API

- Refactor `quote_lifecycle.accept_quote` → `create_sales_order_from_quote`
- `sales_order_lifecycle.convert_sales_order_to_invoice`
- `app/routers/sales/sales_orders.py`, mount in main
- Quote serialize adds `sales_order_id`

### Task 3: Tests

- `tests/sales/test_sales_orders.py`
- Update quote, portal, GST tests for two-step flow

### Task 4: Frontend + docs

- `DealDetailPage` accept → SO; **Create invoice** button
- IMPLEMENTATION_PLAN 7.9 DONE, resume 7.10
