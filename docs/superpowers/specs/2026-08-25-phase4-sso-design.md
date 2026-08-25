# Phase 4.7 — SSO (Google / Microsoft) (design)

> Companion to [IMPLEMENTATION_PLAN.md](../../IMPLEMENTATION_PLAN.md) Phase 4 and
> [PRODUCT_ROADMAP.md](../../PRODUCT_ROADMAP.md) §8 Phase 4 (“SSO”).
> Grounded in the code as of 25 Aug 2026 (verified, not assumed).
> Scope: **only** Google and Microsoft OAuth login for **existing** users —
> no SAML, no auto-signup of new companies.

## Problem

Password/OTP login is the only path. Buyers expect “Continue with Google /
Microsoft.” Roadmap: Google/Microsoft first; SAML later.

## Decisions (locked)

1. **Login existing users only** — match by verified provider email (case-insensitive)
   to `User.email`. No company auto-create via SSO in v0.
2. **Persist `oauth_identities`** — `(provider, subject)` unique; link on first
   successful email match so later logins prefer subject over email rename edge cases.
3. **Providers:** `google` and `microsoft` (Azure AD / Entra `common` tenant).
4. **Browser redirect flow** — `GET /api/auth/oauth/{provider}/start` → IdP →
   `GET .../callback` sets auth cookies (same as password login) → redirect to
   frontend. MFA challenges redirect to `/login` with query params.
5. **Credentials from env** — if client id/secret missing, provider is “unavailable”
   (start → 503; providers list omits it). No new pip deps (`httpx` already present).
6. **No Alembic** — new table via model + `create_all`.

## Non-goals

SAML/OIDC enterprise IdP, auto-signup, account linking UI beyond automatic first
login, forcing SSO, Apple login, platform-admin SSO, email verification beyond
provider’s `email_verified` / Microsoft equivalent.

## Data model

### `oauth_identities`

| column | type | notes |
|---|---|---|
| id | Integer PK | |
| user_id | FK users.id, not null, index | |
| provider | String(32), not null | `google` \| `microsoft` |
| subject | String(255), not null | provider `sub` |
| email | String(255), not null | last seen email |
| created_at | DateTime TZ | server default |
| UniqueConstraint | `(provider, subject)` | |

## Config (`app/config.py`)

| env | purpose |
|---|---|
| `PUBLIC_API_URL` | Base for OAuth redirect_uri (e.g. `http://localhost:8000`) |
| `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` | Google |
| `MICROSOFT_OAUTH_CLIENT_ID` / `MICROSOFT_OAUTH_CLIENT_SECRET` | Microsoft |
| `MICROSOFT_OAUTH_TENANT` | default `common` |

Empty client id ⇒ provider disabled.

## APIs

| method | path | behaviour |
|---|---|---|
| `GET` | `/api/auth/oauth/providers` | `{ "google": bool, "microsoft": bool }` — public |
| `GET` | `/api/auth/oauth/{provider}/start` | 302 to IdP (or 503 if disabled; 400 bad provider) |
| `GET` | `/api/auth/oauth/{provider}/callback` | exchange code; session or error redirect |

### State

Signed JWT (aud=`oauth_state`, 10 min): `{provider, nonce}`. Validate on callback.

### Callback success

Same as password login after user resolved: company status checks, MFA challenge
or cookies + refresh token. Redirect:

- session ok → `{FRONTEND_URL}/login?oauth=success`
- MFA → `{FRONTEND_URL}/login?mfa_required=1&mfa_token=...`
- MFA setup → `{FRONTEND_URL}/login?mfa_setup_required=1&setup_token=...`
- no account / errors → `{FRONTEND_URL}/login?oauth_error=...`  
  (`no_account` | `disabled` | `company` | `provider` | `denied`)

### Resolve user

1. Lookup `oauth_identities` by provider+subject → user.
2. Else lookup `User` by email; if found, insert identity; use user.
3. Else → `no_account`.
4. Require Google `email_verified` true when the claim is present; Microsoft: accept
   mail/userPrincipalName when present.

## Frontend

- Login page: show Google / Microsoft buttons when providers endpoint says true.
- Buttons navigate to `{API}/auth/oauth/{provider}/start` (full page).
- On `?oauth=success`: `fetchUser()` then role redirect.
- On `mfa_*` query: enter existing 2FA stage.
- On `oauth_error`: show message.

## Testing

- Schema + unique constraint.
- Service: resolve by identity / by email / no account (mocked IdP profile).
- API: providers flags; start 503 when unset; callback with mocked httpx → cookies /
  redirects (use TestClient `follow_redirects=False`).
- Cross-tenant: N/A (login is global email); disabled user → error redirect.

## Residuals

SAML, auto-signup, settings “unlink Google”, domain-restricted Microsoft tenant
beyond env `MICROSOFT_OAUTH_TENANT`.
