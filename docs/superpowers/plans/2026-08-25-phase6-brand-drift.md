# Brand drift Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Buyer-facing names say Perioxia CRM, not CRM Inc / local-service-crm.

**Architecture:** Forbidden-string test, then string replacements.

**Tech Stack:** Existing frontend + FastAPI.

**Spec:** `docs/superpowers/specs/2026-08-25-phase6-brand-drift-design.md`

## Global Constraints

Do not rename the git repository. No new dependencies.

---

## Task 1

- [ ] Add `frontend/lib/brandDrift.test.cjs`.
- [ ] Replace CRM Inc / package / FastAPI title until the test passes.
- [ ] Mark 6.12 DONE in IMPLEMENTATION_PLAN.
