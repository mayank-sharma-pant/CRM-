# Phase 6.10 — Postgres RLS (design)

> Phase 0.1, scheduled as 6.10. Defense-in-depth on top of `apply_company_scope`.

## Decisions

1. **Postgres only.** SQLite tests are a no-op. Policies applied by `create_missing_tables.py`.
2. **`SET LOCAL` via `set_config(..., true)` on SQLAlchemy `after_begin`**, re-applied after each `commit`. Request `ContextVar` holds `company_id` / `bypass_rls`.
3. **Authenticated:** `get_current_user` binds `company_id`, or bypass for platform admin (`company_id is None` + admin).
4. **Fail closed** when neither is set. Public prefixes (auth, portal, public forms, billing webhook, WhatsApp/Exotel webhooks, mailbox/calendar OAuth callbacks, `/api/v1`) set bypass for that request.
5. **No RLS** on login/bootstrap tables: `users`, `companies`, `plans`, `otp_codes`, `refresh_tokens`, `mfa_recovery_codes`, `oauth_identities`, `api_keys`, `api_usage_daily`, `webhook_events`.
6. Every other table with `company_id` gets `ENABLE` + `FORCE ROW LEVEL SECURITY` and a `tenant_isolation` policy (`USING` + `WITH CHECK`).

## Non-goals

Alembic; a second DB role; RLS on `users`; tightening `/api/v1` after API-key lookup (bypass for the whole `/api/v1` request).
