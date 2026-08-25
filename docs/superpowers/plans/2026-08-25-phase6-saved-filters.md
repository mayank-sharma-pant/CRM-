# Saved filters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Named deal views plus due-today and rotting filters.

**Architecture:** `view` query on deals list/board; `saved_filters` CRUD; DealsBoard pills.

**Tech Stack:** FastAPI, SQLAlchemy, Next.js.

**Spec:** `docs/superpowers/specs/2026-08-25-phase6-saved-filters-design.md`

## Global Constraints

No Alembic. No new deps. 404 for other-user filters.

---

## Task 1

- [ ] `tests/sales/test_saved_filters.py` (fail first).
- [ ] Service + deals `view` + `/api/saved-filters` + DealsBoard UI.
