# GDPR / DPDP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Export, erase, and retention for lead/client PII.

**Spec:** `docs/superpowers/specs/2026-08-25-phase6-gdpr-dpdp-design.md`

## Global Constraints

No new pip deps. No Alembic. 404 cross-tenant. Keep invoices.

---

## Task 1

- [x] `tests/privacy/test_gdpr_dpdp.py` (fail first).
- [x] Service, routes, settings UI, export/erase on lead and client detail.
