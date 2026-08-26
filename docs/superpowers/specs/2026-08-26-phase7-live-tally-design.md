# Phase 7.5 — Live Tally sync (design)

> Companion to [IMPLEMENTATION_PLAN.md](../../IMPLEMENTATION_PLAN.md) Phase 7.5
> and [the phase-7 spec](./2026-08-26-phase7-trial-defense-design.md).
> Extends [5.4 accounting sync](./2026-08-26-phase5-accounting-sync-design.md).
> Grounded in the shipped 5.4 code (26 Aug 2026), not assumed.

## Problem

5.4 shipped the accounting adapter as a **stub**: `sync_invoice` builds a
canonical Tally/QuickBooks payload and mints a deterministic
`sha256`-based `external_id`, but sends nothing on the wire. An accountant on
trial wants the invoice to actually land in Tally. 7.5 makes the **Tally** path
real when a company configures a Tally endpoint, while the 5.4 stub stays the
offline/test path (and QuickBooks stays stub — phase-7 spec §7.5).

## Grounding (verified)

- `app/services/accounting/service.py`: `connect/disconnect/sync_invoice/sync_all`.
  The push step is `stub_external_id(provider, company_id, invoice_number)` — a
  hash, no HTTP.
- `app/services/accounting/payloads.py`: `tally_payload()` already produces the
  canonical voucher (party debit, Sales + CGST/SGST/IGST credits) with
  `IsDeemedPositive` flags — exactly the fields a Tally XML voucher needs.
- `AccountingConnection` has `provider/status/connected_at/last_sync_at/last_error`.
  No endpoint/credential columns yet.
- HTTP client in this repo is **`httpx`** (`httpx.Client(timeout=20.0)` in
  oauth/telephony/calendar_sync). No `requests`. No new dep needed.
- Current single Alembic head: `028_booking_calendar`.
- Existing accounting tests access result keys (not exact-dict equality), so an
  additive `mode` key is safe.

## Decisions (locked)

1. **Tally goes live; QuickBooks stays stub.** QBO needs OAuth — out of 7.5
   (phase-7 spec §7.5, restated as a residual).
2. **Live is gated by configuration, not a global flag.** A company connects
   Tally with an optional **`tally_url`** (its Tally HTTP-gateway origin, e.g.
   `http://host:9000`) and optional **`tally_company_name`** (Tally
   `SVCURRENTCOMPANY`). Tally's HTTP gateway is a LAN service with **no token**,
   so the URL is not a secret — stored plain, returned by the API. When
   `provider == "tally"` **and** `tally_url` is set → **live**; otherwise →
   **stub**. This keeps the 5.4 stub as the honest, documented offline path
   (connecting Tally with no URL is still valid and still stubs).
3. **No fake success (phase-7 §5).** Every sync item carries a **`mode`**
   (`"stub" | "live"`). Live mode only reports `synced` when Tally's response
   actually confirms creation (a `LASTVCHID` / `CREATED`/`ALTERED` marker with no
   `LINEERROR`); the `external_id` is then Tally's real voucher id. A live push
   that errors (HTTP ≥400, transport failure, or `LINEERROR` in the body) marks
   the item **`failed`** with the message on `connection.last_error` and **no
   `external_id`** — never a stub id masquerading as a live push.
4. **Per-invoice live failure does not raise** — it returns a `failed` item (with
   `error`) the same way `sync_all` already reports per-invoice failures, so bulk
   and single endpoints share one shape and one failure never aborts a batch.
   `AccountingNotConnected` still 400s (unchanged). This is deliberate: "missing
   credentials" (no URL) is stub mode, not an error; a *live* provider being down
   is a per-item `failed`, surfaced with its message, not a 5xx that hides which
   invoices did push.
5. **Idempotency unchanged.** `payload_hash` still gates re-push; a live re-push
   with an unchanged hash is `unchanged: true` and does not re-hit Tally. The
   live `external_id` (Tally voucher id) is persisted and preserved across
   unchanged re-syncs, exactly as the stub id was.
6. **Eligible statuses, tenancy, routes** — all inherited from 5.4 unchanged.

## Shape

- **Model:** `AccountingConnection` gains `tally_url VARCHAR(500)` and
  `tally_company_name VARCHAR(200)`, both nullable. `MISSING_COLUMNS` entries +
  Alembic **`029_tally_live`** (`down_revision = 028_booking_calendar`). New
  columns only; no new table.
- **Transport:** `app/services/accounting/tally_transport.py`
  - `render_tally_xml(payload: dict, company_name: str | None) -> str` — wraps
    `tally_payload`'s voucher in a Tally `ENVELOPE` (`Import Data` → `Vouchers`),
    `SVCURRENTCOMPANY` = `company_name`, one `ALLLEDGERENTRIES.LIST` per ledger.
    Tally sign convention: `ISDEEMEDPOSITIVE=Yes` ledgers (party/debit) render a
    **negative** `AMOUNT`, `No` (Sales/tax/credit) a **positive** `AMOUNT`. Date
    as `YYYYMMDD`.
  - `push_tally(url: str, xml: str, timeout: float = 20.0) -> dict` — POSTs the
    XML, parses the response; returns `{external_id, created, altered, raw}` on
    success, raises `TallyPushError` on HTTP ≥400, transport error, `LINEERROR`,
    or a body with no created/altered/`LASTVCHID` marker. `external_id` is
    `LASTVCHID` when present, else a `tally-live-<sha1(voucher_number)>` marker so
    it is still distinguishable from the 5.4 stub id.
- **Service:**
  - `connect(db, company_id, provider, *, tally_url=None, tally_company_name=None)`
    — validates `tally_url` scheme (`http`/`https`) when non-empty (else
    `ValueError` → 400); persists both fields; clearing to empty string nulls
    them.
  - `sync_invoice` push branch: `live = conn.provider == "tally" and bool(conn.tally_url)`.
    Live → `render_tally_xml` + `push_tally`; success sets `external_id` from
    Tally + `mode="live"`; `TallyPushError` sets row `status="failed"`,
    `conn.last_error`, returns a `failed` item (no external_id). Stub branch
    unchanged, tagged `mode="stub"`. Every returned item dict gains `mode`
    (`None` for skipped).
  - `AccountingNotConnected` unchanged. New `TallyPushError(Exception)`.
- **Routes:** `PUT /api/accounting/connection` body gains optional `tally_url`,
  `tally_company_name`. `GET /api/accounting/connection` returns both plus a
  derived `live: bool`. Everything else (5.4 routes, scopes, 404s) unchanged.
- **UI:** `/settings/accounting` — when provider is Tally, show `Tally URL` +
  `Company name` inputs and a `live`/`stub` indicator; a `failed` item shows
  `last_error`. (Kept thin; wiring mirrors the existing accounting settings page.)

## Testing

`tests/finance/test_tally_live.py`, `httpx` monkeypatched (no real Tally):

- `render_tally_xml` contains `TALLYREQUEST=Import Data`, `REPORTNAME=Vouchers`,
  `SVCURRENTCOMPANY`, `VOUCHERNUMBER`, `PARTYLEDGERNAME`, a `YYYYMMDD` `DATE`, and
  one ledger entry per payload ledger with the correct `ISDEEMEDPOSITIVE`/sign.
- Live **success** (fake 200 body with `LASTVCHID`): item `synced`, `mode=="live"`,
  `external_id` = the returned voucher id, and the POST hit `tally_url`.
- Live **LINEERROR** body: item `failed`, `connection.last_error` set, no
  `external_id`; nothing raised out of `sync_invoice`.
- Live **transport error** (httpx raises): item `failed`, error recorded.
- **Stub** mode (Tally connected, no URL): `mode=="stub"`, sha256 `external_id`,
  **no** httpx call; 5.4 idempotency (`unchanged`) still holds.
- QuickBooks connected with a `tally_url` present: still stub (`mode=="stub"`),
  no httpx call.
- `connect` with a bad-scheme `tally_url` → `ValueError`.
- `GET /connection` reflects `tally_url`/`tally_company_name`/`live`; PUT sets and
  clears them.
- `tests/ops/test_alembic_heads.py` sees a single head `029_tally_live`.
- Existing `test_accounting_*` stay green.

## Done when

A company can set a Tally URL, run sync, and see the invoice pushed to Tally
(mocked in tests) with Tally's voucher id as `external_id` and `mode="live"`; a
Tally that is down or rejects the voucher yields a `failed` item with the real
error, never a fake id; with no URL the 5.4 stub path is unchanged; heads clean;
`create_missing_tables.py` / `alembic upgrade head` adds the two columns.

## Residuals (named)

- QuickBooks stays stub (no OAuth).
- One-way push only; no pull from Tally, no ledger/party/item master creation
  (party ledger must already exist in Tally or Tally auto-creates per its config).
- No auth/tunnel for Tally over WAN (LAN gateway assumption); no per-invoice
  live-failure retry/queue or scheduler; no e-way/e-invoice via Tally.
- The ledger sign convention and the exact success markers are coded to Tally's
  documented XML but **not verified against a live Tally instance here** (no SDK
  in this environment) — tests pin the request/response contract against a fake.
