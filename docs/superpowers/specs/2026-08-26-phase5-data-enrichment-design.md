# Phase 5.1 — Data enrichment (design)

> Companion to [IMPLEMENTATION_PLAN.md](../../IMPLEMENTATION_PLAN.md) Phase 5.1.

## Problem

HubSpot/Zoho sell Clearbit-style fill of company, website, industry, and LinkedIn
from a work email. We have no enrich path. Live vendors need keys and extra deps.

## Decisions (locked)

1. **Stub provider only** — stdlib parse of email domain or website host. No HTTP,
   no new pip deps. Skip consumer mailboxes (gmail, yahoo, outlook, hotmail, live,
   msn, icloud, me, rediffmail, proton.me, protonmail, aol).
2. **Fill empties only** — never overwrite `company` / account `name` / existing
   website, industry, or LinkedIn.
3. **Routes** — `POST /api/leads/{id}/enrich` and `POST /api/accounts/{id}/enrich`.
   Same company-scope as GET (other tenant → 404). Lead needs work email or website;
   account needs website. 400 otherwise.
4. **Columns** — leads: `website`, `industry`, `linkedin_url`, `enriched_at`,
   `enrichment_source`. Accounts: `industry`, `linkedin_url`, `enriched_at`,
   `enrichment_source`. Source is `domain`.
5. **Idempotent** — if `enriched_at` is set, return current row without a second note.
6. **Schema** — model + `MISSING_COLUMNS` + Alembic `017_enrichment` (`apply_schema`).
7. **Privacy** — export includes the new fields; erase clears them on leads.
8. **UI** — Enrich on lead and account detail.

## Non-goals

Clearbit/ZoomInfo HTTP, plan entitlement gate, client-contact enrich, overwrite
merge UI, scheduled bulk enrich.
