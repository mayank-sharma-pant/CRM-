# Phase 3.5 — Public API keys + quota (design)

> Part of [PRODUCT_ROADMAP.md](../../PRODUCT_ROADMAP.md) §4.1 (“API”) and
> [IMPLEMENTATION_PLAN.md](../../IMPLEMENTATION_PLAN.md) Phase 3.
> Phase 3 is a menu of independent sub-projects; **this spec covers only company-issued
> API keys, a dedicated public REST prefix, and plan-based daily quota.** Pulled forward
> by explicit decision after 3.4. Grounded in the code as of 25 Aug 2026.

## Goal

A company admin/MD can mint a **read** or **write** key. Integrations call a dedicated
`/api/v1/` surface (leads, clients, deals, invoices) with that key. JWT routes stay
private. Usage is capped per company per UTC day from `plans.max_api_requests_per_day`.

**Done when:** admin mints a write key (secret shown once) → `POST /api/v1/leads` with
`Authorization: Bearer crm_live_…` creates a company-scoped lead → a read key on the
same POST is 403 → a second company’s key GETting that lead is 404 with a positive
control that the owner key still 200s → exceeding the plan daily cap is 429 → sales
cannot mint keys.

## Non-goals (YAGNI)

UUID/opaque public ids, DELETE on records, invoice PATCH, custom fields, tags, convert,
pipeline admin, PDF, outbound webhooks, OAuth2, OpenAPI partner portal, per-key quota,
key expiry, rotate-in-place, acting-as-user keys, per-resource scopes.

## Decisions

1. **Dedicated prefix.** Public REST is `/api/v1/{leads,clients,deals,invoices}` only.
   Cookie JWT is ignored there. Existing `/api/leads` etc. stay JWT-only.
2. **Per-key `read` | `write`.** Read: GET/list. Write: GET/list + POST/PATCH. Same four
   resources; no per-resource scope matrix.
3. **Company service account.** Key is not a `User`. Lists are company-wide. New rows
   leave `assigned_to_id` / `created_by_id` null. `created_by_id` on the **key** row is
   who minted it (audit only).
4. **Quota from the plan.** All live keys on a company share `max_api_requests_per_day`.
   Starter 1000, Growth 10000, Enterprise `NULL` (unlimited). Over cap → **429**, not 402.
5. **Mint/revoke: admin or MD.** Max **10** non-revoked keys per company. No Alembic, no
   new pip deps. Do not accept `company_id` from any body.

## Auth and crypto

Public calls: `Authorization: Bearer crm_live_<64 hex>`. Generate with `secrets.token_hex(32)`.
Prefix stored for the UI: `crm_live_` + first 8 hex chars (e.g. `crm_live_ab12cd34`).
Hash: SHA-256 hex of the **full** bearer token string (reuse `hash_refresh_token` or the
same `hashlib.sha256` helper). Lookup: hash → row; prefix is not used for auth.

Shown **once** on `POST /api/api-keys`. List/get never return `token` or `token_hash`.
Revoke sets `revoked_at` (never cleared). No expiry, no rotate: mint new, revoke old.

`get_api_principal` → `{company_id, key_id, access}` — not a `User`. Missing / malformed /
unknown / revoked → **401**. Company not `active`/`trial`, or trial past `trial_ends_at` →
**403** (same gate as `get_current_user`). `read` on POST/PATCH → **403**. Successful auth
updates `last_used_at`.

## Data model

New enum in `app/models/core/enums.py`:

```python
class ApiKeyAccess(str, enum.Enum):
    READ = "read"
    WRITE = "write"
```

### `api_keys` — `app/models/core/api_key.py`

| column | type | notes |
|--------|------|--------|
| id | Integer PK | |
| company_id | Integer FK→companies, indexed, not null | tenancy |
| name | String(80), not null | stripped, non-empty |
| prefix | String(32), unique, indexed, not null | display only |
| token_hash | String(64), unique, indexed, not null | SHA-256 hex |
| access | Enum(ApiKeyAccess), not null | non-native, `values_callable` |
| created_by_id | Integer FK→users, nullable | who minted |
| last_used_at | DateTime(timezone), nullable | |
| revoked_at | DateTime(timezone), nullable | set once |
| created_at | DateTime(timezone) | server_default |

Live key = `revoked_at IS NULL`. 11th live create → 400. Names need not be unique.

### `api_usage_daily` — same module or `app/models/core/api_usage.py`

| column | type | notes |
|--------|------|--------|
| id | Integer PK | |
| company_id | Integer FK, not null | |
| usage_date | Date, not null | **UTC** calendar date |
| request_count | Integer, not null, default 0 | |

Unique `(company_id, usage_date)`.

### `plans.max_api_requests_per_day`

Integer, nullable (`NULL` = unlimited). `_MISSING_COLUMNS` adds
`("plans", "max_api_requests_per_day", "INTEGER")`. `seed_plans` still skips existing
tiers, so a **backfill** after seed sets Starter=1000, Growth=10000, Enterprise=NULL
where the column is still NULL (do not overwrite platform-admin edits that are non-NULL).

Expose on `GET /api/platform/plans`, `PATCH /api/platform/plans/{id}`, and billing
portal `limits`.

## Quota

After a principal is resolved, **before** the handler:

1. Resolve plan via existing `resolve_plan(db, company_id)`.
2. If `max_api_requests_per_day` is not NULL and today’s UTC row has
   `request_count >= cap` → **429**, `Retry-After` = seconds until next UTC midnight.
   Do not increment.

After the handler returns (any status except 401, which never had a principal, and
except 429 from the check above): increment today’s row (insert if missing). That
includes 2xx, 400, and **404**. 401s do not increment.

## Management API (JWT)

Prefix `/api/api-keys`. `require_admin_or_md`. Sales → 403. Scope by session `company_id`.

- `GET /api/api-keys` — live keys only (`revoked_at IS NULL`):
  `{items: [{id, name, prefix, access, created_at, last_used_at}]}`.
- `POST /api/api-keys` — `{name, access}` → 201 including **`token` once**.
- `DELETE /api/api-keys/{id}` — revoke, 204. Other company or already revoked → 404.

## Public API (API key only)

Prefix `/api/v1`. Pagination `skip`/`limit` (default 0/100, `limit` max 100). List body
`{items, total, skip, limit}`. Integer ids. Cross-tenant URL id → **404**. Foreign FK in
body (`client_id`, `lead_id`, `stock_item_id`) → **400**. No DELETE.

| path | GET list | GET id | POST | PATCH |
|------|----------|--------|------|--------|
| `/leads` | company-wide | yes | name, email, phone, company, source, service_type, notes (no assignee/team) | those fields + status |
| `/clients` | company-wide | yes | name, email, phone, company, address (no assignee/team) | those fields |
| `/deals` | company-wide | yes | title, amount, currency; pipeline/stage optional (default pipeline); lead_id/client_id same company | title, amount, currency, probability, expected_close, stage_id, lead_id, client_id |
| `/invoices` | company-wide | yes, header + line items | existing `InvoiceCreate` (client same company) | **not in v0** |

Reuse existing Pydantic create/update models where they match; strip or ignore
`assigned_to_id` / `team_id` / `custom_fields` / `tags` on this prefix.

## Frontend

`frontend/app/settings/api-keys/page.jsx`. Link from `/settings` **only if** role is
admin or MD. `/settings/api-keys` is a shared logged-in path (extend `SHARED_PATHS` /
settings nav). Sales who open it: API 403, page shows denied (no mint form).

States: loading, error, empty, list. Create: name + read/write → modal with full token
once (copy). List: name, prefix, access, last used, revoke with confirm.

## Tests

- `backend/tests/sales/test_api_keys_schema.py` (or `tests/platform/`) — tables,
  unique prefix/hash, plan column + backfill numbers.
- `backend/tests/sales/test_api_keys_api.py` — mint (token once; list has no secret),
  revoke, sales 403 on mint, read vs write, JWT cookie ignored on `/api/v1/`, lead +
  client + deal + invoice happy path, same-company FK ok / other-company FK 400, quota
  429 then next UTC day allowed.
- `backend/tests/tenancy/test_api_keys_cross_tenant.py` — B cannot DELETE A’s key;
  B’s key cannot GET A’s lead or invoice (404); A’s key positive control 200.

## Residuals

Integer public ids (roadmap deferred UUID). Invoice PATCH deferred. `api_usage_daily`
is a row lock / increment, not a distributed rate limiter — fine for one-app deploy;
wrong if we ever run multiple API processes without a shared store (same class of
limit as the in-memory login limiter). Stateless access tokens are unchanged.
