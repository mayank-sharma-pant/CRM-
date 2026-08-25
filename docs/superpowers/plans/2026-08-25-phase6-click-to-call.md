# Click-to-call (Exotel) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Click Call on a lead/deal; Exotel dials the agent then the customer; `call_logs` is written and updated from the webhook.

**Architecture:** Encrypted Exotel creds on `company_settings`; `place_exotel_call` (httpx, mocked in tests); webhook matches `provider_call_id`.

**Tech Stack:** FastAPI, httpx, Fernet, Next.js. No new pip deps.

**Spec:** [docs/superpowers/specs/2026-08-25-phase6-click-to-call-design.md](../specs/2026-08-25-phase6-click-to-call-design.md)

## Global Constraints

- Exotel only. No Alembic. Test password `"pw"`. pytest from `backend/` `.venv/bin/pytest`.
