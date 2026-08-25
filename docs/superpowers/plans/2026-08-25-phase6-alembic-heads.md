# Alembic heads Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One Alembic head; catch-up revision; remove backend-root junk scripts.

**Spec:** `docs/superpowers/specs/2026-08-25-phase6-alembic-heads-design.md`

---

## Task 1

- [x] `tests/ops/test_alembic_heads.py` (fail first).
- [x] `016_schema_catchup`, `app/schema_sync.py`, thin `create_missing_tables.py`, delete junk scripts.
