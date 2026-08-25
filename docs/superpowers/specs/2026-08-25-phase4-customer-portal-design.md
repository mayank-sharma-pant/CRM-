# Phase 4.3 — Customer portal (view invoice/quote) (design)

> Companion to [IMPLEMENTATION_PLAN.md](../../IMPLEMENTATION_PLAN.md) Phase 4 and
> [PRODUCT_ROADMAP.md](../../PRODUCT_ROADMAP.md) §4.4 / §8 Phase 4
> (“Customer portal (view invoice/quote)”).
> Grounded in the code as of 25 Aug 2026 (verified, not assumed).
> Scope: **only** staff-minted magic links so a customer can **view** one invoice
> or one quote — no client login, accept, or pay in v0.

## Problem

Invoices and quotes live behind JWT company auth. A customer cannot see a document
without a CRM user account. Competitors share a link; we need the same for view-only
invoice/quote without building a full client identity system.

There is no portal, share-token, or public document route in the codebase today
(`invoices` / `quotes` models have no share columns; no `/api/portal` router).

## Decisions (locked in brainstorming)

1. **Magic link per document** — opaque token in the URL; no client login.
2. **View only** — public surface is read-only. No accept/reject quote, no pay.
3. **Staff generate / regenerate / revoke** — one active token per document; regenerate
   overwrites the hash (old link dies); **no expiry** in v0. Drafts are shareable only
   if staff explicitly generate a link (no auto-mint on status change).
4. **Approach:** columns on `invoices` and `quotes` (`share_token_hash`,
   `share_created_at`). Store **SHA-256 hash only**; return raw token once on mint.
   Public `GET /api/portal/...`; Next pages `/p/invoice/[token]` and `/p/quote/[token]`.
   No new table. No Alembic; `_MISSING_COLUMNS`. No new pip deps.

## Non-goals

Client login / OTP portal, accept/reject quote, pay / Razorpay from the link, PDF
export, emailing the link from the server, token expiry, multi-document listing,
partner portal, per-tenant portal branding beyond showing the selling company name,
signed JWTs without DB revoke, a shared `document_shares` table.

## Data model

### `invoices` and `quotes` (same shape on both)

| column | type | notes |
|---|---|---|
| share_token_hash | String(64), nullable, **unique** | lowercase hex SHA-256 of the raw token; null = no active share |
| share_created_at | DateTime, nullable | set on mint/regenerate; cleared on revoke |

Both via `_MISSING_COLUMNS` in `create_missing_tables.py` and matching SQLAlchemy
attributes. Unique index on `share_token_hash` where not null (DB unique on the
column is enough if nulls are allowed multiple times — SQLite/Postgres both allow
multiple NULLs in a UNIQUE column).

## Token rules

- Mint: `secrets.token_urlsafe(32)` (or equivalent ≥32 bytes entropy).
- Persist: `hashlib.sha256(raw.encode("utf-8")).hexdigest()` → `share_token_hash`.
- Never log or store the raw token after the mint response.
- Lookup: hash the path token; query by `share_token_hash`. Miss → **404**.
- Regenerate: overwrite hash + `share_created_at`; previous raw token stops working.
- Revoke (`DELETE …/share`): set both columns to `null`. Idempotent **204** if already clear.

## Staff APIs (JWT, company-scoped)

Who may call: any authenticated user who can already **GET** that invoice/quote
(same `apply_company_scope` / existing detail access). No new admin-only gate.

| method | path | behaviour |
|---|---|---|
| `POST` | `/api/invoices/{id}/share` | mint or regenerate; **200** `{ "token", "url", "created_at" }` |
| `DELETE` | `/api/invoices/{id}/share` | revoke; **204** |
| `POST` | `/api/quotes/{id}/share` | same as invoices |
| `DELETE` | `/api/quotes/{id}/share` | revoke; **204** |

`url` is a path the frontend can show, e.g. `/p/invoice/{token}` or `/p/quote/{token}`
(absolute origin optional; relative path is enough for copy-paste behind the CRM host).

By-id miss including cross-tenant → **404**. Never take `company_id` from the body.

Optional on detail GET responses: `share_active: bool` and `share_created_at` (never the
raw token or hash) so the CRM UI can show “Link active” without a separate call.

## Public APIs (no JWT)

| method | path | behaviour |
|---|---|---|
| `GET` | `/api/portal/invoices/{token}` | read-only DTO or **404** |
| `GET` | `/api/portal/quotes/{token}` | read-only DTO or **404** |

No list, no POST/PATCH/DELETE under `/api/portal`.

### Public DTO (invoice)

- `invoice_number`, `status`, `issued_date`, `due_date`, `paid_date` (if useful)
- `client_name` (from client), `seller_gstin`, `buyer_gstin`, `place_of_supply`, `tax_mode`
- `subtotal`, `tax`, `cgst`, `sgst`, `igst`, `discount`, `total`, `notes`
- `company_name` (selling tenant display name)
- `items[]`: `description`, `quantity`, `unit_price`, `tax`, `tax_rate`, `hsn`, `total`

### Public DTO (quote)

- `quote_number`, `title`, `status`
- same client / GST / totals / notes / company_name / items shape as above (no invoice dates)

**Omit from public DTO:** `company_id`, user ids, `created_by`, internal `client_id` /
`deal_id` / `product_id`, payment_reference internals, share hash, any other tenant’s data.

Wrong/revoked/unknown token → **404** with a generic detail (e.g. `"not found"`). Do not
distinguish “never existed” vs “revoked”.

## Rate limiting

**v0 decision:** long random tokens are the primary control. Wire an IP bucket on
public portal GETs **only** if the existing `auth_limiter` (or sibling) pattern
accepts a one-file addition with no new dependency; otherwise leave rate-limit as
an explicit residual and ship without it. Staff share endpoints stay behind JWT.

## Frontend

### CRM (authenticated)

On invoice detail and quote detail: **Share link** / **Regenerate** (POST — returns
token once), **Copy** (only from the in-memory mint response in that session),
**Revoke** (DELETE). After a page refresh the raw token is gone; UI shows
`share_active` / `share_created_at` and offers Regenerate (which invalidates the old
link) or Revoke. Match existing detail page patterns (axios `api`, toast on error).

### Public (no login chrome)

- `frontend/app/p/invoice/[token]/page.jsx`
- `frontend/app/p/quote/[token]/page.jsx`

Fetch the portal API; handle loading / error (404 message) / success. Render a single
document view (header, lines, totals). Middleware / RouteGuard must allow `/p/*`
without a session (same idea as forced 2FA public path).

## Testing

- Schema: columns exist; can persist hash; unique behaviour for two docs with null hash.
- Staff: mint returns token; regenerate invalidates old; revoke → public 404; cross-tenant
  share target → 404; owner positive control.
- Public: happy path invoice + quote DTO fields; revoked/old token 404; response body
  must not contain `company_id` or `share_token_hash`.
- UI smoke optional; at least `next build` after public routes + middleware allowlist.

## Deploy

Run `create_missing_tables.py` for the four new columns (two tables × two columns).

## Done when

1. Staff can mint a link for an invoice and a quote; customer opens `/p/...` and sees
   the document without logging in.
2. Regenerate or revoke makes the old URL 404.
3. Cross-tenant share and public token isolation tests green.
4. No accept/pay/login surface shipped.

## Residuals (explicit)

- No expiry; revoke/regenerate only.
- Rate-limit on public GET may be deferred if existing limiter is awkward to reuse.
- No server-side email of the link.
- Absolute URL origin for copy may be `window.location.origin` in the browser only.
