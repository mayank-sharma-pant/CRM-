# Phase 6.20 — Alembic heads + schema catch-up (design)

> Companion to [IMPLEMENTATION_PLAN.md](../../IMPLEMENTATION_PLAN.md) Phase 6.20.

## Problem

Phases 0–6 avoided new Alembic revisions because the graph had two heads.
`13a3c2d1e5b7` already merged those branches; current head is `015_ai_reasoning`.
Prod still applies schema via `create_missing_tables.py` import-time side effects,
so a new Alembic revision cannot be the deploy path.

## Decisions (locked)

1. **Keep a single head.** Guard with a test on `ScriptDirectory.get_heads()`.
2. **`016_schema_catchup`** revises `015_ai_reasoning`. Upgrade runs idempotent
   `create_all` + `add_missing_columns` + `enable_rls` (same as today’s script).
   Downgrade is a no-op (cannot drop the CRM).
3. **Extract** `add_missing_columns` / apply helper so importing Alembic does not
   mutate the live DB (move side effects out of import of the helper module).
4. Delete backend-root `tmp_*.py` / `check_*.py` / `test_*.py` one-offs.

## Non-goals

Autogenerate a full diff of every table since 015; rewriting 001–015; dropping
`create_missing_tables.py` (it can keep calling the same helper).
