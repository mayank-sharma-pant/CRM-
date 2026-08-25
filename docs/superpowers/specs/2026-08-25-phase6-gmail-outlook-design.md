# Phase 6.1 — Gmail / Outlook sync + send/log (design)

> Companion to [IMPLEMENTATION_PLAN.md](../../IMPLEMENTATION_PLAN.md) Phase 6.1
> and [PRODUCT_ROADMAP.md](../../PRODUCT_ROADMAP.md) email / Gmail OAuth.
> Grounded in the code as of 25 Aug 2026 (verified, not assumed).
> Extends Phase 2 SMTP CRM email (`EmailLog`, `POST /api/emails`).

## Problem

Outbound CRM email is company SMTP only. There is no mailbox OAuth, no inbound
log, and no deal-scoped email. HubSpot / Pipedrive / Freshsales win trials on
“send from my Gmail and see the thread on the record.”

## Decisions (locked)

1. **Per-user mailbox** — one connected mailbox per CRM user (`mailbox_connections.user_id` unique). Not a company-wide inbox.
2. **Separate from login SSO** — login OAuth stays `openid email profile`. Mailbox OAuth requests mail scopes + offline refresh tokens. Same env client IDs (`GOOGLE_OAUTH_*`, `MICROSOFT_OAUTH_*`).
3. **Send path** — if the caller has an `active` mailbox, send via Gmail API / Microsoft Graph; else existing SMTP. Failed mailbox send is logged `failed` (no silent SMTP fallback — From would be wrong).
4. **Log inbound + outbound** on lead / client / deal when any participant email matches a company record. Unmatched messages are skipped.
5. **Sync is pull** — `POST /api/mailbox/sync` and a 60s-throttled auto-sync on `GET /api/emails`. No push webhooks, no open/click tracking in v0.
6. **No Alembic / no new pip deps.** New table via `create_all`. New `email_logs` columns via `_MISSING_COLUMNS`. Encrypt refresh/access tokens with existing Fernet (`totp_crypto`).

## Non-goals

Open/click tracking, Gmail labels, attachments, shared company inbox, IMAP/SMTP
app passwords, calendar (6.2), SAML, sending as a teammate’s mailbox, two-way
thread view (plain log list is enough), Graph delta pagination beyond first page,
historyId incremental Gmail sync (v0 is `newer_than:7d` / last 50 messages).

## Data model

### `mailbox_connections`

| column | type | notes |
|---|---|---|
| id | Integer PK | |
| company_id | FK companies, not null, index | |
| user_id | FK users, not null, **unique** | one mailbox per user |
| provider | String(32) | `google` \| `microsoft` |
| email | String(255) | connected mailbox address (lowercased) |
| refresh_token_encrypted | Text, not null | Fernet |
| access_token_encrypted | Text, nullable | Fernet |
| access_token_expires_at | DateTime TZ, nullable | |
| last_synced_at | DateTime TZ, nullable | |
| status | String(20) | `active` \| `error` |
| error_message | String(500), nullable | last provider error, never the token |
| created_at | DateTime TZ | server default |

Never return token columns from the API.

### `email_logs` (new columns)

| column | type | notes |
|---|---|---|
| deal_id | Integer FK deals, nullable, index | |
| direction | String(10), default `outbound` | `outbound` \| `inbound` |
| provider | String(20), default `smtp` | `smtp` \| `google` \| `microsoft` |
| provider_message_id | String(255), nullable | Gmail/Graph id |
| from_email | String(255), nullable | inbound From; outbound From when mailbox |

Unique: `(company_id, provider, provider_message_id)` — SQLite/Postgres allow multiple NULLs.

## OAuth

Reuse env client IDs. Distinct redirect:

`{PUBLIC_API_URL}/api/mailbox/oauth/{google|microsoft}/callback`

Operators must add these URIs next to the existing login callbacks.

| provider | extra auth params | scopes |
|---|---|---|
| google | `access_type=offline`, `prompt=consent` | `https://www.googleapis.com/auth/gmail.send` `https://www.googleapis.com/auth/gmail.readonly` `openid` `email` |
| microsoft | | `Mail.Send` `Mail.Read` `offline_access` `openid` `email` |

State JWT, audience `mailbox_oauth_state`, 10 min: `{provider, nonce, user_id}`.
Start requires JWT. Callback trusts signed `user_id` (browser redirect may drop the
Authorization header).

Empty client id ⇒ provider unavailable (start 503; status `providers.google/microsoft` false).

## APIs

| method | path | auth | behaviour |
|---|---|---|---|
| GET | `/api/mailbox` | JWT | `{ connected, provider, email, status, last_synced_at, providers }` — never tokens |
| GET | `/api/mailbox/oauth/{provider}/start` | JWT | 302 to IdP; 400 unknown; 503 disabled; 403 no company |
| GET | `/api/mailbox/oauth/{provider}/callback` | public | exchange code; upsert connection; 302 `{FRONTEND_URL}/settings/email?mailbox=success\|error=...` |
| DELETE | `/api/mailbox` | JWT | drop this user’s connection; 204 |
| POST | `/api/mailbox/sync` | JWT | import matching messages; `{ imported }` ; 400 if not connected |

`POST /api/emails` already exists. Add optional `deal_id`. Serialize new fields.
`GET /api/emails` may filter `deal_id`; if the user has an active mailbox and
`last_synced_at` is older than 60s (or null), run sync before listing (errors
must not fail the list).

Cross-tenant: connections and logs scoped with `apply_company_scope`. Miss → 404.

## Matching

Normalize emails (`strip` + `lower`). A message matches if From, To, or Cc
intersects a company `leads.email` or `clients.email` (excluding the connected
mailbox address). Attach `lead_id` / `client_id` for those hits. Attach `deal_id`
if `payload.deal_id` on send, else the first company deal whose `lead_id` or
`client_id` matches.

Direction: From equals connected mailbox → `outbound`; else `inbound`.

Dedup: skip if `(company_id, provider, provider_message_id)` already exists.
Store Gmail/Graph id on CRM-originated mailbox sends so sync does not double-log.

## Frontend

- `/settings/email` — connect Google/Outlook, disconnect, Sync now, query `mailbox=success` / `mailbox_error`.
- Settings hub card (all company roles). Sidebar child **Email** for admin/md. Sales `/sales/settings` link.
- Email panel on lead (existing) and deal detail: direction badge, From, connect hint.

## Testing

- Schema uniqueness on `user_id`.
- Status disconnected vs connected (tokens absent from JSON).
- Start 401 / 503; callback stores encrypted refresh (plaintext not in DB).
- Send uses mailbox mock when connected; SMTP when not.
- Sync imports matching inbound; skips unknown; skips duplicate message id.
- Cross-tenant GET mailbox / emails 404.
- `deal_id` on create + list.

## Residuals

Tracking pixels, attachments, webhooks, incremental historyId/delta, shared inbox,
sending as another user.
