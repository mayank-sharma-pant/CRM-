# Phase 6.3 — Click-to-call / Exotel (design)

> Companion to [IMPLEMENTATION_PLAN.md](../../IMPLEMENTATION_PLAN.md) Phase 6.3.
> Extends Phase 3.2 `call_logs`. India-first: **Exotel only** (Twilio deferred).

## Problem

Call logs are typed in by hand. Freshsales/Kylas win when the salesperson clicks Call
and the CRM places the call and writes the log.

## Decisions (locked)

1. **Exotel Connect** — agent phone (`users.phone` or request `from_phone`) is dialed, then the customer. Company ExoPhone is `CallerId`.
2. **Company credentials** on `company_settings` (admin/MD). Token Fernet-encrypted; never returned.
3. **Click creates a `call_logs` row immediately** (`outbound`, outcome `initiated`, `provider=exotel`). Webhook updates duration/outcome by `provider_call_id`.
4. **CRM write wins** — if Exotel HTTP fails, return 502 and **do not** keep a log row (roll back).
5. **No Alembic / no new pip deps.** Columns via `_MISSING_COLUMNS`.

## Non-goals

Twilio, inbound DID → lead, recordings UI, SMS, WebRTC in-browser dialer, per-user Exotel seats.

## Data

### `company_settings`

| column | type |
|---|---|
| exotel_sid | String(64), nullable |
| exotel_api_key | String(64), nullable |
| exotel_api_token_encrypted | Text, nullable |
| exotel_subdomain | String(255), nullable |
| exotel_caller_id | String(20), nullable |

Configured when sid, token, and caller_id are set. `exotel_api_key` defaults to sid. Subdomain defaults to `api.exotel.com`.

### `call_logs`

| column | type |
|---|---|
| provider | String(20), nullable |
| provider_call_id | String(64), nullable, indexed |
| from_phone | String(20), nullable |
| to_phone | String(20), nullable |

## APIs

| method | path | auth | behaviour |
|---|---|---|---|
| GET | `/api/telephony/connection` | JWT | `{ configured, caller_id, has_agent_phone }` — no secrets |
| PUT | `/api/telephony/connection` | admin/MD | save sid/api_key/token/subdomain/caller_id |
| POST | `/api/telephony/click-to-call` | JWT | place call; **201** `{ call log + provider_call_id }` |
| POST | `/api/telephony/exotel/webhook` | public | form/JSON; match Sid; update duration/outcome |

Click-to-call body: parent `lead_id`/`client_id`/`deal_id` (same rules as calls), optional `to_phone`, optional `from_phone`. Destination from explicit to_phone else lead/client/deal-linked phone. Agent from `from_phone` else `user.phone`. Missing phone → 400. Not configured → 400.

Webhook miss (unknown Sid) → 204 (no leak).

## UI

- `/settings/telephony` — admin/MD credentials.
- Lead detail + meeting/call panel: Call button when configured and a destination phone exists.

## Testing

Not configured → 400. Missing phones → 400. Mock Exotel create log with Sid. Webhook updates duration. Cross-tenant parent → 400. Token absent from GET JSON.
