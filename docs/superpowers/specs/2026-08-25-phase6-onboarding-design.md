# Phase 6.9 — In-app onboarding (design)

> Companion to [IMPLEMENTATION_PLAN.md](../../IMPLEMENTATION_PLAN.md) Phase 6.9.
> Empty-dashboard fix (roadmap §6.3).

## Problem

Signup already seeds a default pipeline, but a new company still sees zeros and
no next action. Pipedrive wins on time-to-first-deal: sample records + a short
checklist (import, Gmail, form, quote).

## Decisions (locked)

1. **Computed checklist**, not a workflow engine. `GET /api/onboarding/status`.
2. **Steps:** sample/records (any lead), CSV import (`source = CSV Import`),
   mailbox connected for the current user, a lead form exists, a quote exists.
3. **`POST /api/onboarding/sample-data`** — 3 sample leads + 1 deal on the
   default pipeline, assigned to the caller. Idempotent.
4. **`POST /api/onboarding/dismiss`** — `company_settings.onboarding_dismissed`.
5. **UI** on sales / manager / MD dashboards until complete or dismissed.
6. No Alembic; new settings column via `_MISSING_COLUMNS`. No new pip deps.

## Non-goals

Interactive tour, per-user dismiss, seeding fake invoices/payments, forcing Gmail OAuth.
