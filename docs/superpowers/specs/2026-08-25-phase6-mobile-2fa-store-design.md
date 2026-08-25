# Phase 6.8 — Store-ready mobile + Flutter 2FA (design)

> Companion to [IMPLEMENTATION_PLAN.md](../../IMPLEMENTATION_PLAN.md) Phase 6.8.
> Extends Phase 3.1 (web TOTP) and 3.9 (sales Flutter path).

## Problem

Web login returns `mfa_required` / `mfa_setup_required` instead of tokens. Flutter
`AuthRepository.login` always reads `user` and treats that as success, so enrolled
users cannot sign in on mobile. There is no enroll/confirm UI. `flutter_app/` has
no `android/` or `ios/` trees in git — not uploadable.

## Decisions (locked)

1. **Same APIs as web.** Challenge → `POST /api/auth/2fa/verify`. Forced enroll →
   `X-Setup-Token` on `/api/auth/2fa/setup` and `/confirm`. After confirm, user
   signs in again (web already does this).
2. **No new native plugins.** Secret + `otpauth://` URI as copyable text (no QR package).
3. **Persist Bearer** in existing `flutter_secure_storage` so session survives
   in-memory cookie jar (store-ready).
4. **v1 listing is sales field path** (3.9). Other roles still work; store copy
   describes leads / follow-ups / invoices.
5. **Play first.** App Store listing copy lives in the same checklist. Actual
   upload is a deploy residual (Play Console / Apple credentials).

## Non-goals

Publishing from this environment, Fastlane, push notifications, biometric unlock,
SMS 2FA, rewriting other roles.
