# Outbound webhooks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Signed customer webhooks for lead.created, deal.stage_changed, invoice.paid.

**Architecture:** Endpoints + deliveries tables; httpx POST; hooks after lead create, deal stage, invoice paid.

**Tech Stack:** FastAPI, httpx, HMAC-SHA256.

**Spec:** `docs/superpowers/specs/2026-08-25-phase6-outbound-webhooks-design.md`

## Global Constraints

No Alembic. No new pip deps. 404 for other-tenant endpoints. Emit never raises to the caller.

---

## Task 1

- [ ] `tests/sales/test_outbound_webhooks.py` (fail first).
- [ ] Models, service, router, hooks, settings UI.
