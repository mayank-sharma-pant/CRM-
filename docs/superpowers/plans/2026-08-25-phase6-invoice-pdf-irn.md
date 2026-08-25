# Invoice PDF + IRN Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Downloadable GST invoice PDF and an IRN path when both GSTINs exist.

**Architecture:** Stdlib PDF bytes; einvoice JSON + SHA-256 IRN; invoice columns.

**Tech Stack:** FastAPI, existing GST snapshot fields.

**Spec:** `docs/superpowers/specs/2026-08-25-phase6-invoice-pdf-irn-design.md`

## Global Constraints

No new pip deps. No Alembic. 404 for other-tenant invoices.

---

## Task 1

- [x] `tests/finance/test_invoice_pdf_irn.py` (fail first).
- [x] PDF + einvoice services, routes, UI download/IRN.
