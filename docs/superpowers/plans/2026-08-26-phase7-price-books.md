# Phase 7.7 — Price books Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Named price books with per-product prices and a company default; quote/invoice lines resolve book price when product_id is set.

**Architecture:** `price_books` + `price_book_entries` tables; extend `resolve_sale_lines` with optional `price_book_id`; CRUD router; settings UI + CreateOrderModal picker.

**Tech Stack:** FastAPI, SQLAlchemy, Alembic, Next.js.

**Spec:** [`docs/superpowers/specs/2026-08-26-phase7-price-books-design.md`](../specs/2026-08-26-phase7-price-books-design.md)

## Global Constraints

- Company-scope all rows; foreign id → 404 on book routes, 400 on create with bad book.
- Explicit `unit_price` on a line always overrides book price.
- Product write roles for book writes (purchase/md/admin).
- Alembic head `031_price_books` off `030_einvoice_live`.

---

### Task 1: Models + migration

- Create `app/models/sales/price_book.py`
- Export in `models/sales/__init__.py`
- Alembic `031_price_books`
- Update `test_alembic_heads.py`

### Task 2: Service + resolve_sale_lines

- Create `app/services/sales/price_books.py` (default book lookup, entry map, set_default)
- Extend `resolve_sale_lines(..., price_book_id=None)`
- Tests in `test_price_books.py` (resolution + service)

### Task 3: API + quote/invoice wiring

- Create `app/routers/sales/price_books.py`, mount in main
- Add `price_book_id` to QuoteCreate / InvoiceCreate
- API tests in `test_price_books.py`

### Task 4: Frontend + docs

- `frontend/app/settings/price-books/page.jsx`
- Settings home card
- `CreateOrderModal` book selector + payload
- IMPLEMENTATION_PLAN 7.7 DONE, resume 7.8
