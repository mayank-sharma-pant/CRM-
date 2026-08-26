# Phase 7.6 — Live GST IRN (design)

> Companion to [IMPLEMENTATION_PLAN.md](../../IMPLEMENTATION_PLAN.md) Phase 7.6
> and [the phase-7 spec](./2026-08-26-phase7-trial-defense-design.md).
> Extends [6.16 invoice PDF + IRN stub](./2026-08-25-phase6-invoice-pdf-irn-design.md).
> Grounded in the shipped 6.16 / 7.5 code (26 Aug 2026), not assumed.

## Problem

6.16 ships a downloadable GST PDF and an IRN path, but `generate_irn` mints a
**SHA-256 of the IRP-shaped payload** — not a NIC/IRP acknowledgement. India
B2B trial buyers expect a real IRN when the company has GST portal / GSP
credentials. 7.6 makes that path live when credentials exist; the stub stays
the honest offline/test path. No fake “registered” IRN when live fails.

## Grounding (verified)

- `app/services/finance/einvoice.py`: `irp_payload`, `stub_irn` (sha256),
  `generate_irn` — requires seller+buyer GSTIN, idempotent if `irn` set, writes
  `irn` / `ack_no` / `ack_date` / `signed_qr` (stub sets `signed_qr = irn`).
- `POST /api/invoices/{id}/einvoice` in `routers/finance/invoices.py`; UI button
  on `InvoiceDetailPage` when both GSTINs present and no IRN yet.
- `CompanySettings.gst_number` is the seller GSTIN source for new invoices.
  Secrets pattern: Exotel on `CompanySettings` with
  `exotel_api_token_encrypted` via `encrypt_secret` / `decrypt_secret`
  (`app/utils/totp_crypto.py`).
- HTTP client: **`httpx`** (same as Tally/calendar). No new pip dep.
- Current Alembic head: **`029_tally_live`**.
- `invoices.signed_qr` is `VARCHAR(64)` — too short for a live SignedQRCode;
  widen in this item.
- Existing `test_einvoice_requires_gstin_then_sets_irn` expects stub 64-char IRN
  and idempotency; must stay green when credentials are unset.

## Decisions (locked)

1. **Live is gated by company credentials, not a global flag.** Live when
   `CompanySettings` has all of: `einvoice_base_url`, `einvoice_username`,
   `einvoice_password_encrypted`, `einvoice_client_id`,
   `einvoice_client_secret_encrypted`. Seller GSTIN for auth is the invoice’s
   `seller_gstin` (already required). Missing any credential → **stub** (6.16
   path). Clearing credentials returns to stub.
2. **No fake success (phase-7 §5).** Response always includes **`mode`**:
   `"stub"` | `"live"`. Live only writes IRN / ack / QR from the provider
   response. Live auth or generate failure → **HTTP 502** with a clear detail,
   **no** row mutation of IRN fields, never fall back to `stub_irn`. Stub mode
   never calls HTTP.
3. **Transport is NIC/IRP-shaped HTTP behind a thin adapter**, not a named GSP
   SDK. Configurable `einvoice_base_url` covers NIC sandbox, production IRP, or
   a GSP that speaks the same auth + generate contract (tests pin the contract
   against a fake; no NIC secrets in git).
4. **Idempotency unchanged.** If `invoice.irn` is already set, return as-is
   with `mode` derived from whether live creds are currently configured
   (`"live"` if configured, else `"stub"`) — do not re-hit the provider.
5. **Auth token is ephemeral** — obtained per generate call (or short-lived in
   memory for that request). Do not persist NIC auth tokens on the invoice or
   settings row.
6. **Password and client secret** are write-only: PUT accepts plaintext once;
   GET returns `password_set` / `client_secret_set` booleans, never the values.
7. **Widen `signed_qr`** to `TEXT` so a live SignedQRCode fits. Stub continues
   to store the IRN string there when the provider does not return a QR.

## Shape

### Model / schema

`CompanySettings` gains (all nullable):

| Column | Type | Notes |
|--------|------|--------|
| `einvoice_base_url` | VARCHAR(500) | `http`/`https` origin; trailing slash stripped |
| `einvoice_username` | VARCHAR(100) | NIC/GSP portal user |
| `einvoice_password_encrypted` | TEXT | Fernet |
| `einvoice_client_id` | VARCHAR(100) | API client id |
| `einvoice_client_secret_encrypted` | TEXT | Fernet |

`invoices.signed_qr`: change DDL expectation to `TEXT` via `MISSING_COLUMNS`
(idempotent alter where supported; SQLite recreate path already covered by
tests using create_all / missing-column helper).

Alembic **`030_einvoice_live`** (`down_revision = 029_tally_live`) calling
`apply_schema` like `029`.

### Transport — `app/services/finance/einvoice_transport.py`

- `EinvoicePushError(Exception)` — transport / HTTP / provider rejection.
- `auth_token(base_url, *, gstin, username, password, client_id, client_secret, timeout=20) -> str`
  - `POST {base}/eivital/v1.04/auth` with JSON body
    `{ "UserName", "Password", "Gstin", "ForceRefreshAccessToken": true }`
    and headers `client_id`, `client_secret` (NIC-shaped).
  - Parse `Data.AuthToken` or top-level `AuthToken`; raise on HTTP ≥400, missing
    token, or `Status == 0` / error message fields when present.
- `generate_live_irn(base_url, *, auth_token, payload, timeout=20) -> dict`
  - `POST {base}/eicore/v1.03/Invoice` with header `Authorization: {auth_token}`
    (raw token, NIC style) and JSON body = the existing `irp_payload` dict
    (already Version 1.1 IRP shape).
  - Return `{ "irn", "ack_no", "ack_date", "signed_qr" }` from `Data.Irn` /
    `AckNo` / `AckDt` / `SignedQRCode` (also accept camelCase top-level).
  - Raise `EinvoicePushError` on HTTP ≥400, transport error, missing `Irn`, or
    explicit error status in the body.

### Service — `generate_irn`

```
if irn already set → return invoice (caller adds mode)
if missing GSTINs → 400 (unchanged)
payload = irp_payload(...)
if live_configured(settings):
    try: token = auth_token(...); result = generate_live_irn(..., payload)
    except EinvoicePushError as e: raise HTTPException(502, detail=str(e))
    write irn/ack_no/ack_date/signed_qr from result; commit; return
else:
    stub path unchanged
```

Router response adds `"mode": "live"|"stub"`.

### Routes — settings

Thin mirror of telephony:

- `GET /api/einvoice/connection` — any member: `{ configured, live, base_url,
  username, client_id, password_set, client_secret_set, gst_number }` (no secrets).
- `PUT /api/einvoice/connection` — admin/MD: body optional fields
  `base_url`, `username`, `password`, `client_id`, `client_secret`. Empty string
  clears a field (and clears the encrypted secret if password/client_secret
  cleared). Invalid `base_url` scheme → 400.

Invoice `POST .../einvoice` unchanged path; response gains `mode`.

### UI

- `/settings/einvoice` — admin/MD form for base URL, username, password,
  client id, client secret; Live/Stub badge from `live`; link from
  `/settings` near accounting/telephony.
- Invoice detail: on IRN success, optional toast/detail can show mode if the
  API returns it (thin: keep Generate IRN button; surface 502 detail as today).

## Testing

`tests/finance/test_einvoice_live.py`, httpx monkeypatched:

- Stub path (no creds): same as 6.16 — 64-char IRN, `mode=="stub"`, **no** HTTP.
- Live success: fake auth + generate → `mode=="live"`, IRN/ack from provider,
  POSTs hit `base_url` paths.
- Live auth failure / generate missing Irn / transport error → 502, invoice
  `irn` still null.
- Idempotent re-POST with existing IRN does not call HTTP.
- PUT connection encrypts secrets; GET never returns them; clear password
  nulls encrypted column; bad URL scheme 400.
- Cross-tenant: foreign invoice einvoice still 404.
- Heads: single head `030_einvoice_live`.
- Existing `test_invoice_pdf_irn.py` stays green.

## Done when

A company can save NIC/GSP-shaped credentials, generate IRN on an invoice with
both GSTINs, and get a provider IRN with `mode="live"` (mocked in tests); with
no credentials the 6.16 stub remains; a live failure yields 502 and no stub
IRN written; heads clean; settings UI shows live/stub without leaking secrets.

## Residuals (named)

- No GSTR-1 filing, e-way bill, credit/debit note IRN, or cancel-IRN API.
- No persisted auth-token cache / refresh scheduler.
- No signed QR **image** render on the PDF (PDF still prints IRN text; QR string
  stored for later).
- Contract coded to NIC-shaped paths/fields but **not verified against a live
  NIC/GSP** in this environment — tests pin the fake.
- Multi-GSTIN companies (different GSTIN per branch) out of scope; one settings
  credential set per company.
