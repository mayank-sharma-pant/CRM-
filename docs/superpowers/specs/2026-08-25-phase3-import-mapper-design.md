# Phase 3.6 — Import mapper + duplicate preview (design)

> Part of [PRODUCT_ROADMAP.md](../../PRODUCT_ROADMAP.md) §4.1 (“Import / export”) and
> Phase 3. Leads only. Decisions made in-session (user: do not ask further).

## Goal

Upload a lead CSV whose columns are not named `name`/`email`, **map** them, **preview**
which rows are new vs duplicate (email/phone, same rules as `find_duplicate_leads`),
then **commit** only the new rows.

**Done when:** a CSV with `Full Name,E-mail` previews as mapped → duplicate email against
an existing company lead is flagged → commit inserts the new rows only → company B’s
preview does not treat A’s lead as a duplicate → existing `POST /api/import/leads` still
works for already-named columns.

## Non-goals

Clients/deals import, undo, auto-merge, Excel/xlsx, custom fields, saving mapping
templates, changing the 2 MB / 500-row caps.

## Decisions

1. **Leads only.** Fields: `name` (required), `email`, `phone`, `company`, `source`,
   `service_type`.
2. **Two-step, no preview table.** `POST .../preview` and `POST .../commit` each take the
   file plus optional `mapping` JSON form field. Commit re-parses and re-checks duplicates.
3. **Skip duplicates and invalid rows** on commit (do not merge, do not error the batch).
4. **Keep** `POST /api/import/leads` (immediate insert, exact lowercase `name` column).
5. No Alembic, no new pip deps. Do not accept `company_id` from the body.

## Mapping

Auto-suggest by case-insensitive header match, including aliases:
`full name`/`contact` → name; `e-mail` → email; `mobile`/`telephone`/`cell` → phone;
`organisation`/`organization`/`account` → company; `service` → service_type.

Unmapped optional fields are ignored. Missing `name` mapping on preview/commit → 400.

## Duplicates

Company-scoped, `deleted_at IS NULL`. Match normalized email **or** digits-only phone
(same helpers as merge). Also flag later CSV rows that collide with an earlier new row
in the same file. Store email/phone normalized on insert.

## API

- `POST /api/import/leads/preview` — multipart `file`, optional `mapping` JSON string.
- `POST /api/import/leads/commit` — same. Sales/manager still need active team.

Preview row: `{index, status: new|duplicate|invalid, values, matched_lead_id, reason}`.
Commit: `{created, skipped_duplicate, skipped_invalid, count}`.

## Frontend

Import control on the shared leads list (`LeadsIndexPage`): file → mapping dropdowns →
preview table → Import N new leads.

## Tests

Mapper unit tests; preview/commit API; skip duplicate; keep old import; cross-tenant
email in A is not a duplicate for B.
