# Phase 3.6 — Import mapper Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Map CSV columns to lead fields, preview duplicates, commit new rows only.

**Spec:** `docs/superpowers/specs/2026-08-25-phase3-import-mapper-design.md`

## Global Constraints

- Leads only; skip duplicates/invalid on commit
- Keep `POST /api/import/leads`
- 2 MB / 500 row caps unchanged
- No Alembic, no new pip deps, no `company_id` in body

---

### Task 1: Parser + preview/commit API

**Files:** `backend/app/services/sales/lead_import.py`, `backend/app/routers/ops/imports.py`
**Tests:** `backend/tests/ops/test_import_mapper.py`, `backend/tests/tenancy/test_import_mapper_cross_tenant.py`

### Task 2: Leads list UI

**Files:** `frontend/components/leads/LeadImportModal.jsx`, `frontend/components/leads/LeadsIndexPage.jsx`
