# Phase 7 — Trial defense Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close first-week trial gaps vs HubSpot Free / Zoho CRM / Pipedrive without cloning Marketing Hub or Desk.

**Architecture:** Twelve numbered items (7.1–7.12). Each item gets its own spec + plan before code, same as Phase 6. This file is the phase index and the 7.1 kickoff; later items are not implemented from this file alone.

**Tech Stack:** FastAPI, SQLAlchemy, Alembic (chain off current head `026_mass_email` unless a later migration lands first), Next.js, Flutter, existing Fernet/`deliver_and_log`/calendar/accounting/einvoice adapters.

**Spec:** [`docs/superpowers/specs/2026-08-26-phase7-trial-defense-design.md`](../specs/2026-08-26-phase7-trial-defense-design.md)

## Global Constraints

- No Marketing Hub, Zoho Desk, Salesforce objects, live-chat product, or secrets in git.
- Missing vendor credentials fail closed (4xx/5xx), never a fake success.
- Company-scope every new table; foreign id → 404; add cross-tenant tests.
- Widget remains lead-capture; copy must not say live agent chat.
- Spec + plan per 7.x before that item’s code.
- Prefer stdlib / existing deps; new pip packages only if the item spec names them.

---

### Task 1: Phase 7 is the resume point in repo docs

**Files:**
- Modify: `docs/IMPLEMENTATION_PLAN.md` (status board, Phase 7 checklist, sequencing)
- Modify: `docs/PRODUCT_ROADMAP.md` §8 Phase 7 + §11 checkpoint
- Create: spec + this plan (already written with this task)

**Interfaces:**
- Consumes: Phases 0–6 marked done in code
- Produces: Status board row **7 — Trial defense** PENDING; **Resume next: 7.1**

- [x] **Step 1: Write the phase spec**

Locked items 7.1–7.12 and non-goals in
`docs/superpowers/specs/2026-08-26-phase7-trial-defense-design.md`.

- [x] **Step 2: Write this index plan**

- [x] **Step 3: Patch IMPLEMENTATION_PLAN.md and PRODUCT_ROADMAP.md**

Checklist 7.1–7.12 all PENDING. Sequencing ends at Phase 7, not “no numbered work.”

- [x] **Step 4: Stop. Do not code 7.1 in the same change as the docs unless the user asked to implement 7.1.**

---

### Task 2: Item 7.1 — Email open / click tracking (first code item)

**Do not start until Task 1 docs are merged in the working tree and a 7.1 spec exists.**

**Files (expected; confirm in the 7.1 spec):**
- Modify: `backend/app/models/sales/email_log.py`
- Modify: `backend/app/services/sales/crm_email.py` (`deliver_and_log`)
- Create: tracking pixel + redirect router (public, no JWT, token in path)
- Modify: `backend/app/schema_sync.py` / Alembic after `026_mass_email`
- Test: `backend/tests/sales/test_email_tracking.py` + cross-tenant (token must not leak other companies’ logs)

**Interfaces:**
- Consumes: `deliver_and_log(...)` in `app/services/sales/crm_email.py`
- Produces: public GET that increments open or click; `email_logs.open_count` / `click_count` (exact columns in 7.1 spec)

- [ ] **Step 1: Write `docs/superpowers/specs/2026-08-26-phase7-email-tracking-design.md`**

Lock: 1×1 pixel in HTML body; outbound links rewritten with HMAC or random token; bot/user-agent ignore list optional; no attachment tracking.

- [ ] **Step 2: Write the 7.1 item plan with TDD steps**

- [ ] **Step 3: Execute that item plan (subagent-driven or inline)**

---

### Task 3–13: Items 7.2–7.12

Each item: spec → item plan → TDD → tests green → next.

| Task | Item | Seed files to read first |
|------|------|--------------------------|
| 3 | 7.2 booking + inbound calendar | `app/services/sales/` calendar, `app/models/sales/` meeting, 6.2 spec |
| 4 | 7.3 store mobile | `flutter_app/store/STORE_RELEASE.md`, 6.8 spec |
| 5 | 7.4 Hindi | `frontend/` sales pages; add i18n the repo already uses if any |
| 6 | 7.5 live Tally | `app/services/accounting/`, 5.4 spec |
| 7 | 7.6 live IRN | `app/services/finance/einvoice.py`, 6.16 spec |
| 8 | 7.7 price books | `app/models/` products, 4.1 spec |
| 9 | 7.8 next-activity nag | deals board, timeline 6.4, saved filters 6.14 |
| 10 | 7.9 quote → SO → invoice | quotes, invoices, `frontend/app/sales/orders/` |
| 11 | 7.10 approvals | purchase approval flow; deals/quotes |
| 12 | 7.11 import undo | 3.6 import mapper |
| 13 | 7.12 reports schedule | 3.4 saved reports |

- [ ] **For each:** spec, plan, implement, verify, then the next item only.

---

## Self-review (plan vs spec)

| Spec item | Plan task |
|-----------|-----------|
| 7.1 tracking | Task 2 |
| 7.2–7.12 | Tasks 3–13 |
| Non-goals / widget honesty | Global constraints |
| Live vendors fail-closed | Global constraints |
| Per-item spec before code | Task 2 Step 1 + Tasks 3–13 |
