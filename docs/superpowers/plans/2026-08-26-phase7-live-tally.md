# Phase 7.5 — Live Tally sync (plan)

> Executes [the 7.5 spec](../specs/2026-08-26-phase7-live-tally-design.md). TDD.

## Task 1 — Transport (render + push) + test

1. `backend/app/services/accounting/tally_transport.py`: `TallyPushError`,
   `render_tally_xml(payload, company_name)`, `push_tally(url, xml, timeout)`
   (httpx POST, parse `LINEERROR`/`CREATED`/`ALTERED`/`LASTVCHID`).
2. `tests/finance/test_tally_live.py` part A: render assertions (envelope fields,
   ledger signs, `YYYYMMDD` date); push success/LINEERROR/HTTP-error/transport-
   error with httpx monkeypatched.
3. Green.

**Review checkpoint.**

## Task 2 — Model column + migration

1. `AccountingConnection.tally_url` / `tally_company_name` (nullable).
2. `MISSING_COLUMNS` entries in `app/schema_sync.py`.
3. Alembic `029_tally_live` (`down_revision = 028_booking_calendar`) calling the
   schema-sync/`create_all` path like `028`.
4. `tests/ops/test_alembic_heads.py` green (single head `029_tally_live`).

**Review checkpoint.**

## Task 3 — Service wiring

1. `connect(..., *, tally_url=None, tally_company_name=None)` with scheme
   validation; persist/clear fields.
2. `sync_invoice`: live-vs-stub branch, `mode` on every item, live failure →
   `failed` + `connection.last_error` (no raise), stub unchanged.
3. Extend `test_tally_live.py` part B: live success/failed items, stub mode,
   QuickBooks-stays-stub, idempotency, bad-url `ValueError`.
4. Existing `test_accounting_*` green.

**Review checkpoint.**

## Task 4 — Routes + UI

1. `PUT /connection` accepts `tally_url`/`tally_company_name`; `GET` returns them
   + `live`. Pass through to `connect`.
2. `/settings/accounting`: Tally URL + company inputs, live/stub badge, failed
   `last_error`. `next build` clean.
3. Full backend accounting suite + heads + `test_tally_live` green.

**Whole-branch review, then IMPLEMENTATION_PLAN.md 7.5 → DONE (code).**

## Out of scope

QuickBooks live/OAuth, pull from books, masters sync, scheduler, retry queue.
