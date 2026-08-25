# Phase 6.7 — WhatsApp inbound + auto sequences (design)

> Companion to [IMPLEMENTATION_PLAN.md](../../IMPLEMENTATION_PLAN.md) Phase 6.7.
> Extends Phase 3.8 Gupshup templates. Grounded in code as of 25 Aug 2026.

## Problem

3.8 can send approved templates from a lead/client. There is no inbound log,
cadence still creates day-1 **SMS** follow-ups that never send WhatsApp, and
`run_due_reminders` skips cadence rows (`created_by_id` is null) and documents
“No WhatsApp in v0.”

## Decisions (locked)

1. **Gupshup only.** Public `POST /api/whatsapp/webhook` (no JWT). Always **204**
   after ingest so Gupshup does not retry on “not our lead.”
2. **Company match:** `destination` from JSON / form / query `source` against
   `company_settings.whatsapp_source` (digits). If missing and exactly one
   company has a source configured, use that. Else no-op 204.
3. **CRM match:** inbound `payload.source` phone → lead then client in that
   company (MSISDN / last-10 digits). Unmatched still logs the inbound row
   (company-scoped, no lead/client).
4. **Idempotency:** skip if `provider_message_id` already exists for the company.
5. **24h session:** inbound sets `session_expires_at = now + 24h`.
   `POST /api/whatsapp/session-send` sends free text via Gupshup
   ` /wa/api/v1/msg` only while a matching inbound session is open.
6. **Cadence:** if `whatsapp_cadence_template_id` is set, day-1 step is
   `whatsapp` instead of `sms`. `run_due_reminders` sends that template for
   pending `channel=whatsapp` follow-ups **even when `created_by_id` is null**,
   then sets `reminded_at`. In-app/email still require `created_by_id`.
7. **No Alembic / no new pip deps.** New columns via `_MISSING_COLUMNS`.

## Non-goals

Interakt, media/location inbound, WhatsApp flows, two-way chat UI, Meta Cloud
API, signing secrets (Gupshup partner callback is IP-obscure; we do not invent
HMAC), sending session text after the window.

## Data

`whatsapp_messages`: `direction` (default `outbound`), `from_phone`, `body`,
`provider_message_id`, `session_expires_at`.

`company_settings.whatsapp_cadence_template_id` (nullable FK by id, no DB FK).
