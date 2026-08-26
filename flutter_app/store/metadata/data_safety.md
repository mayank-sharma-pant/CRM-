# Play Data Safety / App Store privacy answers

Single source of truth for the store privacy questionnaires. Keep this in sync
with the public policy at `/privacy` (`frontend/app/privacy/page.jsx`) and the
data-safety section of `../STORE_RELEASE.md`.

## Data collected

| Data type | Collected | Purpose | Linked to user | Shared |
|---|---|---|---|---|
| Email address | Yes | Account sign-in and authentication | Yes | No |
| CRM records (leads, follow-ups, invoices) | Yes | App functionality — the records the user's company already gives them access to | Yes | No |
| Auth token | Yes (device only, secure storage) | Keep the user signed in | Yes | No |

## Data NOT collected

- No advertising or ad ID.
- No third-party analytics SDK.
- No precise or approximate location.
- No contacts, photos, files, or device identifiers beyond the auth session.

## Sharing / selling

- No data is sold.
- No data is shared for advertising or analytics.
- Sub-processors are used only for features a company enables: Razorpay
  (payments), Gupshup (WhatsApp), Exotel (calls), Google / Microsoft (opt-in
  mailbox and calendar OAuth). These are backend integrations; the mobile app
  itself talks only to the Perioxia API over HTTPS.

## Security practices

- Data encrypted in transit (HTTPS).
- Auth token stored in OS secure storage (Keystore / Keychain).
- Optional TOTP two-factor authentication when the company enables it.
- Users can request data export / deletion via account settings (DPDP, 6.19).

## Permissions

- `INTERNET` only. No camera, location, contacts, or storage permissions in v1.
