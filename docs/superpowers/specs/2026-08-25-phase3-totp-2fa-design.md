# Phase 3.1 — TOTP Two-Factor Authentication (design)

> Part of [PRODUCT_ROADMAP.md](../../PRODUCT_ROADMAP.md) §4.5 ("2FA (TOTP)") and
> [IMPLEMENTATION_PLAN.md](../../IMPLEMENTATION_PLAN.md) Phase 3.
> Phase 3 is a menu of independent sub-projects; **this spec covers only TOTP 2FA.**
> Scope decided with the user: **opt-in per user + company-admin mandate, full stack.**
> Grounded in the code as of 25 Aug 2026 (files read, not assumed).

## Goal

A user can enroll an authenticator app (TOTP), and thereafter every path that mints a
session (`/login`, `/login-otp`) requires a second factor. A company admin can mandate
2FA for all members, forcing enrollment before those members get a session. Recovery
codes provide a backup when the authenticator is lost.

**Done when:** a user enrolls → confirms → logs in with password → is challenged for a
TOTP code → gets tokens only after a valid code; a recovery code works once; an admin
mandate forces a non-enrolled user into setup before login completes; **non-2FA logins
are byte-for-byte unchanged**; cross-tenant isolation on 2FA state is proven by test.

## Non-goals (YAGNI — explicitly excluded)

SMS/WhatsApp OTP as a factor, WebAuthn/passkeys, "remember this device" trust cookies,
per-action step-up auth, and hardware keys. TOTP + recovery codes only. A hard
"kill all sessions now" on mandate is out of scope (see §7 residual).

## Existing code this builds on (verified)

- `backend/app/routers/auth/auth.py` — `/login` (password) and `/login-otp` (email OTP)
  both end by calling `create_access_token` + `_issue_refresh_token` + setting cookies and
  returning `LoginResponse`. The 2FA gate is inserted **after** the credential check and
  **before** token issuance.
- `backend/app/utils/security.py` — `create_access_token(data, expires_delta, audience)`
  already stamps an `aud` claim; `decode_access_token(token, audience)` already enforces it.
  The short-lived MFA challenge token reuses these with `audience="mfa"`. Refresh tokens
  use `secrets.token_urlsafe` + SHA-256 hash (`generate_refresh_token`, `hash_refresh_token`)
  — recovery codes follow the same one-way-hash pattern.
- `backend/app/models/core/user.py` — add columns here.
- `backend/app/models/core/company.py` — add `require_2fa` here.
- `backend/app/models/core/refresh_token.py` — the template for `mfa_recovery_codes`.
- `backend/app/utils/rate_limit.py` `auth_limiter` — reused with a new `verify_2fa` bucket.
- `backend/create_missing_tables.py` — `_MISSING_COLUMNS` list + `add_missing_columns()`
  is the migration convention (no Alembic; two pre-existing heads — Phase 0/1 decision).
- `backend/app/utils/audit.py` `log_activity` — audits enroll/disable/mandate changes.
- `frontend/app/login/page.jsx`, `frontend/contexts/AuthContext.jsx`,
  `frontend/services/api.js`, `frontend/app/settings/page.jsx` — the frontend touch points.
- `cryptography` (installed) provides `Fernet`. `pyotp`/`qrcode` are **not** installed and
  will **not** be added.

## 1. Data model

**`users` — new columns** (append to `_MISSING_COLUMNS`):

| column | type | notes |
|--------|------|-------|
| `totp_secret` | `VARCHAR(255)` null | Base32 secret, **Fernet-encrypted at rest**. Never returned after enrollment. |
| `totp_enabled` | `BOOLEAN DEFAULT 0` | true only after a confirmed code. |
| `totp_confirmed_at` | `TIMESTAMP` null | set at confirm. |

**`companies` — new column:**

| column | type | notes |
|--------|------|-------|
| `require_2fa` | `BOOLEAN DEFAULT 0` | admin mandate for all company members. |

**New table `mfa_recovery_codes`** (created by `create_all`, mirrors `refresh_tokens`):
`id` PK, `user_id` FK→users (indexed), `code_hash` `VARCHAR(64)` (SHA-256 hex, one-way),
`used_at` `TIMESTAMP` null, `created_at` `TIMESTAMP` server_default now. 10 rows per enrollment.

## 2. TOTP + crypto — stdlib, zero new dependencies

New `backend/app/utils/totp.py`:
- `generate_secret() -> str` — 20 random bytes, Base32-encoded (`secrets` + `base64.b32encode`).
- `totp_now(secret, at=None) -> str` and `verify_totp(secret, code, window=1) -> bool` —
  RFC 6238, SHA-1, 6 digits, 30-second step, ±1 step tolerance for clock skew. Built on
  `hmac`/`hashlib`/`struct`/`base64` (stdlib). Constant-time compare via `hmac.compare_digest`.
- `provisioning_uri(secret, account_email, issuer) -> str` — the `otpauth://totp/...` URI.

**Decision: hand-rolled, not `pyotp`.** ~30 lines, matches the repo's stdlib token style,
one fewer supply-chain dependency (the product's pitch is provable trust). Correctness is
**pinned to published RFC 6238 test vectors in the test suite** — not assumed. Fallback if
rejected: add `pyotp==2.9.0` and delegate; only cost is one dependency.

New `backend/app/utils/totp_crypto.py` (or a helper in `security.py`):
- `encrypt_secret(plain) -> str` / `decrypt_secret(token) -> str` using `Fernet`, key derived
  deterministically from `settings.SECRET_KEY` (`base64.urlsafe_b64encode(sha256(SECRET_KEY))`).
  This binds secret-at-rest confidentiality to the same secret that already gates boot in prod.

**Recovery codes:** `generate_recovery_codes(n=10)` → 10 random 8-char (Crockford-ish
alphanumeric) codes; store only `sha256` hashes; return plaintext **once**.

## 3. Enrollment flow (authenticated) — `backend/app/routers/auth/mfa.py`

All endpoints require `get_current_user`. Mounted under `/api/auth/2fa`.

- `POST /setup` → generate secret, store **encrypted, `totp_enabled=false`**, return
  `{otpauth_uri, secret}`. Called again before confirmation overwrites the pending secret
  (lets a user restart if they lose the QR). Refused with 400 if already `totp_enabled`.
- `POST /confirm` `{code}` → verify against the pending secret; on success set
  `totp_enabled=true`, `totp_confirmed_at=now`, generate + return 10 recovery codes (once).
  Audited `2fa:enabled`. 400 on bad/none pending code.
- `POST /disable` `{password}` → re-verify password; clear secret + flags; delete recovery
  codes. **403 if the user's company has `require_2fa=true`** (cannot opt out of a mandate).
  Audited `2fa:disabled`.
- `GET /status` → `{enabled, confirmed_at, recovery_codes_remaining}`.
- `POST /recovery-codes/regenerate` `{password}` → re-verify password, invalidate old rows,
  issue + return 10 new. Only when `totp_enabled`.

## 4. Login challenge flow (the core change) — `auth.py`

In both `/login` and `/login-otp`, **after** the existing credential/company-status checks
and **before** token issuance, branch:

1. **Company mandate, user not enrolled** (`company.require_2fa and not user.totp_enabled`,
   and user is not a platform admin) → return
   `{"mfa_setup_required": true, "setup_token": <aud='mfa_setup', 15-min JWT, sub=email>}`.
   No session tokens issued.
2. **User enrolled** (`user.totp_enabled`) → return
   `{"mfa_required": true, "mfa_token": <aud='mfa', 5-min JWT, sub=email>}`. No session tokens.
3. **Otherwise** → today's behavior, unchanged (issue access + refresh, set cookies).

New `POST /api/auth/2fa/verify` `{mfa_token, code}`:
- Decode with `decode_access_token(token, audience="mfa")`; 401 on invalid/expired.
- Resolve the user from `sub`; re-check `status`/company status (defense in depth).
- Accept a **6-digit TOTP** (`verify_totp`) **or** an **8-char recovery code**
  (hash-lookup among the user's unused codes → set `used_at`, single-use).
- Rate-limited with `auth_limiter` under a new `verify_2fa` bucket keyed by email.
- On success: issue access + refresh tokens and set cookies **exactly as login does today**
  (`create_access_token`, `_issue_refresh_token`, `_set_auth_cookie`, `_set_refresh_cookie`),
  return the standard `LoginResponse` token payload.

`LoginResponse` schema: make `mfa_required`, `mfa_token`, `mfa_setup_required`, `setup_token`
**optional** fields alongside the existing token fields (which become optional too, since a
challenge response omits them). Non-2FA logins keep returning the identical populated
token payload → existing callers/tests unaffected. The `setup_token` (`aud='mfa_setup'`)
is accepted by `/setup`+`/confirm` as an alternative to a full session (forced-enrollment
path) — those endpoints accept either a normal access token (via `get_current_user`) or a
valid `mfa_setup` token identifying the user.

## 5. Admin mandate enforcement

- `PATCH /api/company/security` `{require_2fa: bool}` — company-admin only, scoped to the
  caller's own `company_id` (IDOR-safe: never accept a company_id from the body). Audited
  `company:require_2fa_changed`. (Router: extend an existing company/admin router or add a
  small `app/routers/admin/company_security.py` — decide at implementation from what exists.)
- Enforcement is at **login/verify only** (§4 case 1). A mandate flipped mid-session takes
  effect within one access-token lifetime (≤30 min) because the next login/refresh re-checks.
  No token denylist — same documented tradeoff as the Phase 0 refresh-token residual.
- Platform admins (`company_id=NULL`) are exempt from company mandates; they may still
  self-enroll.

## 6. Frontend

- `frontend/services/api.js` — add methods: `setup2FA`, `confirm2FA`, `disable2FA`,
  `get2FAStatus`, `regenerateRecoveryCodes`, `verify2FA`, `setCompanyRequire2FA`.
- `frontend/contexts/AuthContext.jsx` — `login`/`loginOTP` return the raw response so the
  page can detect `mfa_required` / `mfa_setup_required` instead of assuming tokens. Add a
  `verify2FA(mfa_token, code)` helper that finalizes the session.
- `frontend/app/login/page.jsx` — on `mfa_required`, swap to a code-entry step (6-digit
  input + "use a recovery code" toggle → 8-char input), submit to `verify2FA`; on
  `mfa_setup_required`, route into enrollment carrying the `setup_token`. All four data
  states (loading/error/empty/success). Semantic markup, labeled inputs, visible focus.
- `frontend/app/settings/security/page.jsx` (new) — enroll (render QR from `otpauth_uri`
  client-side + show secret + verify field), show/copy/download recovery codes once,
  regenerate (password-gated), disable (password-gated, hidden/blocked under mandate),
  and a status view. Four data states.
- Admin settings surface — a "Require 2FA for all members" toggle wired to
  `setCompanyRequire2FA`, visible only to company admins.
- QR rendering is client-side (small JS lib bundled or a canvas draw) — **no server QR dep.**

## 7. Migration & testing

**Migration:** append the three user columns + `companies.require_2fa` to `_MISSING_COLUMNS`
in `create_missing_tables.py` (Postgres-correct DDL: `VARCHAR(255)`, `BOOLEAN DEFAULT FALSE`,
`TIMESTAMP WITH TIME ZONE`). `mfa_recovery_codes` is created by `create_all` once its model
is imported by `app.models.core`. **No Alembic.** Run `create_missing_tables.py` on deploy.
**No new entry in `requirements.txt`.**

**Tests** — `backend/tests/auth/test_2fa.py`:
1. RFC 6238 published test vectors → `verify_totp`/`totp_now` correctness (crypto proof).
2. Fernet round-trip: `decrypt_secret(encrypt_secret(x)) == x`; ciphertext ≠ plaintext.
3. enroll → confirm → `/login` returns `mfa_required` (no tokens) → `/2fa/verify` with a
   valid TOTP → tokens issued.
4. `/2fa/verify` with wrong code → 401; with expired `mfa_token` → 401.
5. recovery code works once; second use of the same code → 401.
6. `/2fa/disable` under `require_2fa=true` → 403; under no mandate → 200.
7. mandate on + not enrolled → `/login` returns `mfa_setup_required`; setup_token lets the
   user complete `/setup`+`/confirm`; subsequent login then challenges normally.
8. **non-2FA login unchanged** — response still carries populated access/refresh tokens.
9. rate limiting: repeated `/2fa/verify` failures trip `verify_2fa` bucket (reset per test,
   per the Phase 0 limiter-trap note).
10. cross-tenant: company B admin cannot read/alter company A user's 2FA status or mandate
    (404/403), paired with a positive control.

**Residual (documented):** access tokens remain stateless ≤30 min, so a mid-session mandate
or a `disable` takes up to one token lifetime to fully bite. A hard kill needs a denylist /
`token_version` — deferred, consistent with Phase 0.

## Component boundaries (isolation check)

- `utils/totp.py` — pure functions, no DB, no framework; testable against RFC vectors alone.
- `utils/totp_crypto.py` — encrypt/decrypt only; depends on `settings.SECRET_KEY`.
- `routers/auth/mfa.py` — enrollment/verify endpoints; depends on the two utils + models.
- `auth.py` login branch — a single insertion point; the only change to existing endpoints.
- Frontend security page — self-contained; consumes the api.js methods.

Each unit answers: what it does / how to use it / what it depends on — independently.
