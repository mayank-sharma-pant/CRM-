# Phase 3.8 — WhatsApp Business templates (design)

India v0 via Gupshup template API. No inbound chat, no Interakt, no session free-text (Meta forbids it without a 24h window).

- Company stores Gupshup `apikey` + source WhatsApp number on `company_settings`. GET never returns the key; only `whatsapp_configured` + source.
- Templates: name, language (`en`), Gupshup template id, optional `variable_keys` (ordered, mapped to `{{1}}`… params).
- Send: `lead_id` or `client_id` (phone required). Params from keys (`name`, `company`) or explicit `params`. Log every attempt (`sent`/`failed`).
- Admin/MD: credentials + template CRUD. Sales/manager/MD/admin: list templates and send to in-company records.
- Phone: digits only; 10-digit numbers get `91` prefix.
- No Alembic; new tables via `create_all`; new settings columns via `create_missing_tables.py`. No new pip deps (`httpx` already present).
