# Phase 7.11 — Import undo + clients/deals CSV Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extend CSV import beyond leads; record import batches; undo the most recent batch per company.

**Architecture:** `import_batches` + `import_batch_items` tables; shared CSV helpers; entity-specific import services; undo reverses leads (soft-delete) and clients/deals (hard-delete when unused).

**Tech Stack:** FastAPI, SQLAlchemy, Alembic, Next.js.

**Spec:** [`docs/superpowers/specs/2026-08-26-phase7-import-undo-design.md`](../specs/2026-08-26-phase7-import-undo-design.md)

## Global Constraints

- 2 MB / 500 rows per upload (same as leads).
- Undo skips rows that cannot be removed (invoiced clients, linked deals).
- Company-scoped batches; `GET /import/last` + `POST /import/undo`.
- Alembic head `035_import_batches` off `034_deal_discount_approvals`.

---

### Task 1: Models + migration

- Create `app/models/sales/import_batch.py` (`ImportBatch`, `ImportBatchItem`)
- Alembic `035_import_batches`
- Update `test_alembic_heads.py`

### Task 2: Import services + batch recording

- `app/services/sales/csv_import.py` — shared CSV parse/preview helpers
- `app/services/sales/client_import.py`, `deal_import.py`
- `app/services/sales/import_batch.py` — record batch, undo last
- Wire lead commit paths to record batches

### Task 3: API + tests

- Extend `app/routers/ops/imports.py`:
  - `POST /import/clients/preview|commit`
  - `POST /import/deals/preview|commit`
  - `GET /import/last`, `POST /import/undo`
- Tests: `tests/ops/test_import_undo_clients_deals.py`

### Task 4: Frontend + docs

- `CsvImportModal.jsx` + `useImportUndo` hook
- Import + undo on clients, deals board, leads list
- IMPLEMENTATION_PLAN 7.11 DONE, resume 7.12
