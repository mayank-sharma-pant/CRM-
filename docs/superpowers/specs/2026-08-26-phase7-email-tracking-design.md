# Phase 7.1 — Email open / click tracking (design)

> Companion to [IMPLEMENTATION_PLAN.md](../../IMPLEMENTATION_PLAN.md) Phase 7.1
> and [2026-08-26-phase7-trial-defense-design.md](./2026-08-26-phase7-trial-defense-design.md) item 7.1.
> Grounded in the code as of 26 Aug 2026 (`deliver_and_log`, `email_logs`, `/api/public/*`).

## Problem

CRM mail goes out and disappears. HubSpot Free tells a trial user "your prospect
opened this twice"; we tell them nothing. Every outbound path already funnels
through `deliver_and_log` in `app/services/sales/crm_email.py` — one-off emails
(`POST /api/emails`), campaigns, and mass email — so a single instrumentation
point covers all three.

## Decisions (locked)

1. **Opaque random tokens, hashes only at rest.** One token per `(email_log, kind)`
   where `kind ∈ {open, click}`. Minted with `secrets.token_urlsafe(32)`, stored
   as SHA-256 hex in `email_logs.open_token_hash` / `click_token_hash`. The raw
   token exists only inside the sent message. **No authenticated API ever returns
   a token or a hash.**
2. **Counts, not events.** `email_logs.open_count` and `click_count`, integers,
   default 0. No per-hit event table in v0 (no first-open timestamp, no user agent).
   `serialize_email` exposes the two counts; never the hashes.
3. **Public routes live under `/api/public/track`.** That prefix is already in
   `tenancy._PUBLIC_PREFIXES`, so the RLS middleware binds bypass for these
   requests without touching `tenancy.py`. No JWT.
4. **Open pixel always answers 200 with a GIF.** Unknown/garbage token → same
   1×1 transparent GIF, no increment, no log lookup leak. A tracking pixel that
   404s tells a scanner which tokens are real.
5. **Click is a signed redirect.** `GET /api/public/track/c/{token}?u=<b64url>&s=<sig>`.
   Valid token + valid signature → `302` to the decoded URL. Unknown token,
   bad signature, missing params, or a non-http(s) target → `404`. `sig` is
   `HMAC-SHA256(SECRET_KEY, f"{click_token_hash}:{url}")` truncated to 32 hex
   chars, compared with `hmac.compare_digest`. Without the signature the endpoint
   would be an open redirect for anyone who received one tracked email.
6. **Injection happens on the HTML actually sent, both transports.** Outbound CRM
   mail is now HTML on the mailbox path too (`_gmail_send` → `MIMEText(..., "html")`,
   `_graph_send` → `contentType: "HTML"`), because the SMTP path was already HTML
   and the pixel has to live in one shared body.
7. **Stored body stays original.** `EmailLog.body` keeps the caller's plain text.
   Tracking markup exists only in the transported message.
8. **`PUBLIC_API_URL` is the base.** If it is empty, **skip injection entirely**:
   send the plain escaped body, store `NULL` token hashes, counts stay 0. A
   relative pixel URL in an email is worse than no pixel.
9. **Alembic `027_email_tracking` off `026_mass_email`**, same `apply_schema`
   body as 024–026. One head.
10. **No new pip deps, no attachment tracking, no bot filtering, no Marketing Hub.**

## Non-goals

Per-recipient open timelines, unique-vs-total opens, user-agent/bot suppression,
open/click charts, unsubscribe handling, attachment or reply tracking, per-link
click attribution (one click token per email, not per link), webhook fan-out.

## Data — `email_logs` new columns

| column | type | note |
|---|---|---|
| `open_count` | Integer, default 0 | incremented by the pixel route |
| `click_count` | Integer, default 0 | incremented by the redirect route |
| `open_token_hash` | String(64), nullable, indexed | SHA-256 hex of the open token |
| `click_token_hash` | String(64), nullable, indexed | SHA-256 hex of the click token |

Legacy rows added by `ALTER TABLE ... DEFAULT 0` may still read `NULL` on some
installs, so serialization and increments coerce with `int(x or 0)`.

Schema apply: four entries in `app/schema_sync.MISSING_COLUMNS` (which
`create_missing_tables.py` and every Alembic catch-up revision call) plus
revision `027_email_tracking`.

## Service — `app/services/sales/email_tracking.py`

| function | contract |
|---|---|
| `hash_token(raw)` | SHA-256 hex |
| `mint_token()` | `(raw, hash)` from `secrets.token_urlsafe(32)` |
| `tracking_base()` | `PUBLIC_API_URL` without trailing `/`, or `None` when empty |
| `open_pixel_url(base, raw)` | `{base}/api/public/track/o/{raw}.gif` |
| `sign_target(token_hash, url)` | 32-hex HMAC-SHA256 under `SECRET_KEY` |
| `click_url(base, raw, token_hash, url)` | `{base}/api/public/track/c/{raw}?u=…&s=…` |
| `decode_target(u)` | base64url → URL, `None` if undecodable or not http(s) |
| `build_outbound_html(body, …)` | escaped text → `<div>` + `<br>` joins, bare `http(s)://` runs linkified to the click URL, pixel `<img>` appended when a base exists |
| `TRANSPARENT_GIF` | 42-byte 1×1 GIF89a |

Linkification runs on the **plain source text**, not on assembled HTML — the body
reaching `deliver_and_log` is plain text, so there is no regex-over-HTML pass and
no chance of rewriting the pixel's own `src`. Trailing punctuation
(`.,;:!?)]}'"`) is stripped off a URL and re-emitted as text.

## Endpoints

| method | path | auth | behaviour |
|---|---|---|---|
| GET | `/api/public/track/o/{token}.gif` | none | always `200 image/gif`, `Cache-Control: no-store`; increments `open_count` only when the hash matches a row |
| GET | `/api/public/track/c/{token}?u=&s=` | none | `302` to the verified target and `click_count += 1`; `404` on unknown token, bad signature, missing/undecodable `u`, or non-http(s) target |

Both are rate limited per IP by a dedicated `tracking_limiter` (240 hits / 60 s),
same `RateLimiter` class the portal and public-form routes use. A dedicated
instance keeps mail scanners from consuming the portal's budget.

## Cross-tenant

`email_logs` rows are looked up **by token hash only** on the public routes, so
company B cannot touch company A's counters without A's raw token, which only
exists in A's sent mail. Neither route returns any row content — the open route
returns bytes, the click route returns a `Location` header for a URL the caller
already supplied. Authenticated reads stay on `apply_company_scope` +
`ensure_company_access` in `app/routers/sales/emails.py` (unchanged), and Postgres
RLS still fences `email_logs` for authenticated sessions.

## Tests — `backend/tests/sales/test_email_tracking.py`

1. Pixel injected into the SMTP HTML; hitting it returns a GIF and moves
   `open_count` 0 → 1 (visible through `GET /api/emails/{id}`).
2. Links in the body are rewritten; hitting the click URL returns `302` to the
   original target and moves `click_count` 0 → 1.
3. Unknown open token → `200` GIF, no counter anywhere moves; unknown click
   token → `404`; tampered `u` with a stale `s` → `404`.
4. Cross-tenant: company B gets `404` from `GET /api/emails/{A's id}`, and hitting
   A's tracking URLs never returns A's subject or body.
5. `serialize_email` carries `open_count`/`click_count` and no `*_token_hash`.
6. `PUBLIC_API_URL = ""` → sent HTML has no pixel and no rewritten link, and the
   row stores `NULL` token hashes.
7. Mailbox transport gets the same tracked HTML.
8. `tests/ops/test_alembic_heads.py` still sees exactly one head, now
   `027_email_tracking`, with `down_revision == "026_mass_email"`.

## Deploy

`alembic upgrade head` (or `create_missing_tables.py`) for the four columns. Set
`PUBLIC_API_URL` to the public backend origin — tracking is silently off until
it is set, and the pixel/redirect URLs must be reachable from recipient mail
clients.
