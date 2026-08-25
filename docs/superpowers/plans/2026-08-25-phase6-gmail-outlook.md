# Gmail / Outlook mailbox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Users connect Gmail or Outlook, send from CRM via that mailbox, and inbound/outbound mail matching a lead/client/deal is logged on the record.

**Architecture:** `mailbox_connections` (encrypted refresh token) + mail-scoped OAuth distinct from login SSO. Send prefers mailbox then SMTP. Pull sync last 50 / 7 days; match participant emails to CRM records.

**Tech Stack:** FastAPI, httpx, SQLAlchemy, Fernet (`totp_crypto`), Next.js. pytest + TestClient + monkeypatched providers.

**Spec:** [docs/superpowers/specs/2026-08-25-phase6-gmail-outlook-design.md](../specs/2026-08-25-phase6-gmail-outlook-design.md)

## Global Constraints

- No new pip deps. No Alembic. New table via model + create_all; `email_logs` columns via `_MISSING_COLUMNS`.
- Reuse `GOOGLE_OAUTH_*` / `MICROSOFT_OAUTH_*`. Empty client id ⇒ provider off.
- Test password `"pw"`. Reset `auth_limiter` when needed.
- pytest from `backend/` with `.venv/bin/pytest`.

### File map

| File | Responsibility |
|---|---|
| `backend/app/models/sales/mailbox.py` | connection model |
| `backend/app/models/sales/email_log.py` | extra columns |
| `backend/create_missing_tables.py` | `_MISSING_COLUMNS` |
| `backend/app/services/sales/mailbox.py` | OAuth, tokens, match, sync, send |
| `backend/app/routers/sales/mailbox.py` | HTTP |
| `backend/app/services/sales/crm_email.py` | mailbox-aware send + serialize |
| `backend/app/routers/sales/emails.py` | deal_id + auto-sync |
| `frontend/app/settings/email/page.jsx` | connect UI |
| `frontend/components/leads/LeadEmailPanel.jsx` | log direction + connect hint |
| `docs/IMPLEMENTATION_PLAN.md` | 6.1 log |

---

### Task 1: Models + matching + OAuth/send/sync + APIs

TDD: write `backend/tests/sales/test_mailbox.py` first; implement until green.

### Task 2: Frontend settings + email panel + deal panel

### Task 3: Docs
