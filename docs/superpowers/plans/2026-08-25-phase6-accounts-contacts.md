# Accounts vs Contacts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Optional B2B Account linked to Client contacts.

**Architecture:** `accounts` table + `clients.account_id`; `/api/accounts`; role-prefixed UI.

**Tech Stack:** FastAPI, SQLAlchemy, Next.js.

**Spec:** `docs/superpowers/specs/2026-08-25-phase6-accounts-contacts-design.md`

## Global Constraints

No Alembic. No new pip/npm deps. 404 not 403 for other-tenant account ids.

---

## Task 1: API

- [ ] `backend/tests/sales/test_accounts.py` (fail first).
- [ ] Model, `_MISSING_COLUMNS`, router, client `account_id`.

## Task 2: UI

- [ ] `accountsHomePath` + pages + client picker + sidebar.
