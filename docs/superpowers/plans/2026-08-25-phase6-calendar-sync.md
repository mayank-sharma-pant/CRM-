# Calendar sync (CRM → Google/Microsoft) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Connected users get CRM meetings created/updated/deleted on Google or Outlook calendar.

**Architecture:** `calendar_connections` + mail-style OAuth; `sync_meeting_outbound` after meeting mutate; provider HTTP mocked in tests.

**Tech Stack:** FastAPI, httpx, SQLAlchemy, Fernet, Next.js.

**Spec:** [docs/superpowers/specs/2026-08-25-phase6-calendar-sync-design.md](../specs/2026-08-25-phase6-calendar-sync-design.md)

## Global Constraints

- No new pip deps. No Alembic. CRM request stays 2xx if calendar push fails.
- Same OAuth env as SSO. pytest from `backend/` `.venv/bin/pytest`. Test password `"pw"`.
