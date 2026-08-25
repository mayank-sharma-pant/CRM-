# Phase 6.19 — GDPR / DPDP (design)

> Companion to [IMPLEMENTATION_PLAN.md](../../IMPLEMENTATION_PLAN.md) Phase 6.19.

## Problem

No subject-access export, erasure, or retention. GDPR (EU) and India DPDP need a
company-admin path to fulfill requests on CRM people records.

## Decisions (locked)

1. **DSR on leads and clients** (admin/MD): `GET /api/privacy/export/{leads|clients}/{id}`
   JSON of PII + notes; `POST /api/privacy/erase/...` redacts name/email/phone/notes
   (and client address/gstin). Invoices stay (tax retention). Other-tenant → 404.
2. **Staff self-export** `GET /api/privacy/me` (authenticated). No self-erase.
3. **Retention** `company_settings.retention_days` (0 = off). `POST /api/privacy/retention/apply`
   erases **trashed** leads (`deleted_at` older than N days).
4. **Audit** `privacy_requests` rows. No new pip deps. No Alembic.

## Non-goals

Full legal hold, processor agreements, cookie banner, portability ZIP, deleting
GST invoices, automated scheduler (apply is on-demand).
