# Data enrichment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Domain-stub enrich for leads and accounts (empty fields only).

**Architecture:** `app/services/sales/enrichment.py` parses email/website host, fills blank CRM fields, stamps `enriched_at`. Routes on existing lead/account routers. Alembic 017 re-runs `apply_schema`.

**Tech Stack:** FastAPI, SQLAlchemy, pytest, existing Next.js detail pages.

**Spec:** `docs/superpowers/specs/2026-08-26-phase5-data-enrichment-design.md`

## Global Constraints

No new pip/npm deps. Company-scope misses are 404. Password `"pw"`. Pytest: `backend/.venv/bin/pytest` from `backend/`.

---

## Task 1

- [x] `tests/sales/test_enrichment.py` (fail first).
- [x] Service, columns, routes, GET serialize, privacy erase, Alembic 017, UI, IMPLEMENTATION_PLAN.
