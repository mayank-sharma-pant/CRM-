# Phase 5.10 — Mass email (design)

> Companion to [IMPLEMENTATION_PLAN.md](../../IMPLEMENTATION_PLAN.md) Phase 5.10.
> Distinct from [phase5-campaigns-design.md](./2026-08-26-phase5-campaigns-design.md):
> no campaign draft object.

## Problem

Roadmap: mass email is missing and must be **capped tightly** (spam
risk). 5.7 campaigns are a named, send-once object with a 50-recipient
cap. 5.10 is a **one-shot blast**: pick an audience or explicit ids,
send now, stop.

## Decisions (locked)

1. **Reuse `deliver_and_log`.** No ESP, no pixels, no new pip deps.

2. **Caps** — `MAX_RECIPIENTS = 25` eligible addresses per POST.
   `MAX_PER_DAY = 100` successful sends per company (UTC day). Over
   either → 400. Zero eligible → 400.

3. **Table** `mass_email_blasts`:
   `id, company_id, subject, audience (leads|clients|ids), sent_by_id,
   sent_count, failed_count, skipped_count, sent_at`.
   Recipients are `email_logs` only (no extra recipient table).

4. **Body** — `{subject, body}` and **exactly one** of:
   - `audience: "leads"|"clients"` (company rows with email, deduped)
   - `lead_ids: int[]` or `client_ids: int[]` (not both). Any id not
     in this company → **400** (no probing).

5. **Auth** — admin/MD only (GET list + POST). Sales → 403.

6. **Schema** — model in `app.models.sales`; Alembic `026_mass_email`
   (`down_revision: 025_cases`) calls `apply_schema`.

7. **Routes** (`/api/mass-email`)
   - `GET ""` — `{total, remaining_today, items}`
   - `POST ""` — `{sent, failed, skipped, remaining_today, blast}`

8. **UI** — `/mass-email`; sidebar; Settings card; shared route.

## Non-goals

Campaign drafts, scheduled send, unsubscribe, open tracking, CSV
upload, BCC, attachments.
