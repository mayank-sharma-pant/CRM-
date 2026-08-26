# Phase 7.6 — Live GST IRN Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 6.16 SHA-256 IRN stub with a live NIC/IRP-shaped HTTP adapter when company credentials are set; keep the stub when unset; never write a fake IRN on live failure.

**Architecture:** Credentials on `CompanySettings` (Exotel pattern). `einvoice_transport.py` does auth + generate via `httpx`. `generate_irn` branches live vs stub. Settings routes + thin UI. Alembic `030_einvoice_live`.

**Tech Stack:** FastAPI, SQLAlchemy, Alembic, httpx, Fernet (`totp_crypto`), Next.js settings page.

**Spec:** [`docs/superpowers/specs/2026-08-26-phase7-live-irn-design.md`](../specs/2026-08-26-phase7-live-irn-design.md)

## Global Constraints

- No NIC/GSP secrets in git; tests monkeypatch httpx.
- Missing credentials → stub; live failure → 502, no IRN write.
- Prefer stdlib + existing deps; no new pip packages.
- Company-scope invoices; foreign id → 404.
- Single Alembic head `030_einvoice_live` off `029_tally_live`.

---

### Task 1: Transport (auth + generate) + unit tests

**Files:**
- Create: `backend/app/services/finance/einvoice_transport.py`
- Create: `backend/tests/finance/test_einvoice_live.py` (part A)

**Interfaces:**
- Produces: `EinvoicePushError`, `auth_token(...) -> str`, `generate_live_irn(...) -> dict`

- [x] **Step 1: Write failing transport tests**
- [x] **Step 2: RED**
- [x] **Step 3: Implement `einvoice_transport.py`** per spec.
- [x] **Step 4: GREEN** — transport tests pass.

---

### Task 2: Model columns + migration + signed_qr widen

**Files:**
- Modify: `backend/app/models/core/company_settings.py`
- Modify: `backend/app/models/finance/invoice.py` (`signed_qr` → Text)
- Modify: `backend/app/schema_sync.py` (`MISSING_COLUMNS`)
- Create: `backend/alembic/versions/030_einvoice_live.py`
- Modify: `backend/tests/ops/test_alembic_heads.py`

- [x] **Step 1: Add columns + MISSING_COLUMNS + revision `030_einvoice_live`**

- [x] **Step 2: Heads test expects `030_einvoice_live`, chain from `029_tally_live`**

- [x] **Step 3: GREEN** — `pytest backend/tests/ops/test_alembic_heads.py -v`

---

### Task 3: `generate_irn` live branch + settings connection API

**Files:**
- Modify: `backend/app/services/finance/einvoice.py`
- Modify: `backend/app/routers/finance/invoices.py` (add `mode` to response)
- Create: `backend/app/services/finance/einvoice_settings.py` (serialize / save / live_configured)
- Create: `backend/app/routers/finance/einvoice_settings.py` (or `einvoice.py` router)
- Modify: app router include
- Extend: `backend/tests/finance/test_einvoice_live.py` (part B)
- Existing: `backend/tests/finance/test_invoice_pdf_irn.py` must stay green

**Interfaces:**
- Consumes: transport + CompanySettings columns
- Produces: `generate_irn` returns invoice; router adds `mode`; GET/PUT `/api/einvoice/connection`

- [x] **Step 1: Failing integration tests** — stub mode no HTTP + `mode=="stub"`; live success; live 502 leaves irn null; idempotent no HTTP; PUT encrypts; GET omits secrets; bad scheme 400.

- [x] **Step 2: Implement service + routes → GREEN**

- [x] **Step 3: Confirm `test_invoice_pdf_irn.py` still passes** (may need to accept optional `mode` key only).

---

### Task 4: Frontend settings + docs

**Files:**
- Create: `frontend/app/settings/einvoice/page.jsx`
- Modify: `frontend/app/settings/page.jsx` (card/link)
- Modify: `docs/IMPLEMENTATION_PLAN.md` (7.6 DONE, resume 7.7)
- Modify: phase-7 trial-defense resume if needed

- [x] **Step 1: Settings page** — form + live/stub badge; admin/MD gate; mirror telephony/accounting patterns.

- [x] **Step 2: `next build` clean (or page compiles); backend suite for einvoice + heads green**

- [x] **Step 3: Mark 7.6 DONE (code) in IMPLEMENTATION_PLAN; Resume next → 7.7**

---

## Self-review (plan vs spec)

| Spec | Task |
|------|------|
| Transport auth + generate | Task 1 |
| CompanySettings columns + signed_qr TEXT + 030 | Task 2 |
| generate_irn live/stub + 502 + mode | Task 3 |
| GET/PUT connection write-only secrets | Task 3 |
| Settings UI | Task 4 |
| Residuals (no GSTR-1, no cancel IRN) | out of scope |

## Out of scope

GSTR-1, e-way, CN/DN IRN, cancel IRN, QR image on PDF, multi-GSTIN, live NIC verification.
