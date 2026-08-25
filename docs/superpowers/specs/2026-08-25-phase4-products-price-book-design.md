# Phase 4.1 — Products price book + tax (design)

> Companion to [IMPLEMENTATION_PLAN.md](../../IMPLEMENTATION_PLAN.md) Phase 4 and
> [PRODUCT_ROADMAP.md](../../PRODUCT_ROADMAP.md) §4.3 / §8 Phase 4.
> Grounded in the code as of 25 Aug 2026 (verified, not assumed).
> Scope: **only** the sellable catalog, per-product GST snapshots on quotes/invoices,
> and stock deduction via an optional product→stock link.

## Problem

`StockItem` is warehouse (qty, SKU, reorder). Invoice create can send `stock_item_id` to
auto-fill and deduct qty, but that id is **not stored** on `invoice_items`. Quotes are
free-text; `Quote.tax` is always 0. GST (Phase 3.7) is one company `tax_rate` on the whole
invoice subtotal. There is no catalog of what we sell with HSN and a GST rate, so mixed
5%/18% lines cannot be billed correctly.

## Decisions (locked in brainstorming)

1. **New `products` table**, not an extension of `stock_items`. Stock stays warehouse.
2. **One list price on the product.** No `price_books` table in v0.
3. **Per-product GST rate.** Each line snapshots `tax_rate` + `hsn` + line `tax`. Header
   tax = sum of line taxes (invoice `tax` override still replaces header tax only).
   Company `tax_rate` is the fallback for free-text lines with no `product_id`.
4. **Free-text lines stay.** Typed descriptions remain valid; they are not forced onto a product.
5. **Stock deducts when the invoice is created** (including quote accept → invoice), if the
   product has `stock_item_id`. Quotes never touch stock.
6. **Write roles match inventory manage:** purchase / MD / admin. Sales and manager list and
   pick only.

## Non-goals

Multiple price books, statutory HSN→rate table, per-line CGST/SGST display, PDF, e-invoice/IRN,
products on public `/api/v1/`, kits/bundles, auto-creating a product from a stock item.

## Data model

New tables via `Base.metadata.create_all` (`create_missing_tables.py`). New columns on
existing tables via `_MISSING_COLUMNS`. No Alembic (two pre-existing heads — same stance as
Phases 1–3). No new pip deps.

### `products` — `app/models/sales/product.py`

| column | type | notes |
|---|---|---|
| id | Integer PK | |
| company_id | Integer FK→companies, indexed, not null | tenancy |
| name | String(255), not null | |
| sku | String(100), nullable | unique per company when set; blank stored as null |
| unit | String(32), not null, default `"unit"` | |
| unit_price | Numeric(12,2), not null, default 0 | list price |
| tax_rate | Numeric(5,2), not null | GST %; 0–100 inclusive, not limited to 5/12/18/28 |
| hsn | String(20), nullable | |
| stock_item_id | Integer FK→stock_items, nullable | in-company goods only |
| is_active | Boolean, not null, default true | pickers hide inactive; old docs keep snapshots |
| created_by_id / updated_by_id | Integer FK→users, nullable | |
| created_at / updated_at | DateTime | server_default / onupdate |

`UniqueConstraint("company_id", "sku", name="uq_products_company_sku")`. Postgres/SQLite
allow multiple NULL skus.

Export from `app/models/sales/__init__.py` so `create_all` sees the table.

### Line snapshots

`quote_items`:

| column | type |
|---|---|
| product_id | Integer FK→products, nullable |
| hsn | String(20), nullable |
| tax_rate | Numeric(5,2), nullable |
| tax | Numeric(12,2), default 0 | line tax amount |

`invoice_items` (hsn already exists):

| column | type |
|---|---|
| product_id | Integer FK→products, nullable |
| tax_rate | Numeric(5,2), nullable |
| tax | Numeric(12,2), default 0 | line tax amount |

Do **not** persist `stock_item_id` on the line. Deduction uses `product.stock_item_id` at
invoice-create time.

### Quote header GST

`quotes` gains the same snapshot columns invoices already have:

`cgst`, `sgst`, `igst` (Numeric 12,2 default 0), `seller_gstin` VARCHAR(15),
`buyer_gstin` VARCHAR(15), `place_of_supply` VARCHAR(2), `tax_mode` VARCHAR(10).

Accept copies header money + these fields and every line snapshot onto the invoice, then
deducts stock. It does not recompute GST from current GSTINs.

## GST math

Keep `compute_gst` for the **header split** (legacy / intra / inter from seller vs buyer
GSTIN). Add `line_tax(amount, rate_percent) -> float` in `app/services/finance/gst.py`
using the same `ROUND_HALF_UP` to 0.01 as `_money`.

On quote or invoice create, for each line:

1. Resolve `unit_price`, `description`, `hsn`, `tax_rate`:
   - `product_id` set: product must be in-company and `is_active`. Missing fields fill from
     the product; explicit request values win (override). Snapshot the values actually used.
   - no `product_id`: `tax_rate` = company `CompanySettings.tax_rate` or 18.0. `hsn` from
     the request if sent.
2. Line amount = `qty * unit_price`. Line `tax` = `line_tax(amount, tax_rate)`.
3. Document subtotal = sum of line amounts. Document tax = sum of line taxes, **unless**
   invoice create sends `tax` (existing CreateOrderModal override) — that replaces header
   tax only; line `tax` rows stay as computed.
4. Header CGST/SGST/IGST = `compute_gst(..., tax_override=header_tax)` so the intra/inter
   split stays one code path. No seller GSTIN → `tax_mode=legacy`, cgst/sgst/igst = 0
   (existing 18% lump tests unchanged when lines have no `product_id`).

**Deliberate quote change:** quotes currently force `tax=0`. After this, a free-text quote
uses the company rate, same as invoices. Existing `test_quotes.py` assertions that
`total == subtotal` must be updated (e.g. 15000 + 18% → 17700 when settings default 18).

## API — `app/routers/sales/products.py`, prefix `/api/products`

Register in `app/main.py`. Company context required (no platform-admin catalog).

| method + path | who | notes |
|---|---|---|
| `GET /api/products` | any company role | `q`, `active_only` default true. Other company's rows never returned. |
| `GET /api/products/{id}` | any company role | 404 other company |
| `POST /api/products` | purchase, md, admin | 403 sales/manager |
| `PATCH /api/products/{id}` | purchase, md, admin | fields: name, sku, unit, unit_price, tax_rate, hsn, stock_item_id, is_active. 404 other company |
| `DELETE /api/products/{id}` | purchase, md, admin | 204 if unused; 400 if any quote/invoice line references it (deactivate instead); 404 other company |

`GET` item shape: `id`, `name`, `sku`, `unit`, `unit_price`, `tax_rate`, `hsn`,
`stock_item_id`, `stock_quantity` (null if unlinked), `is_active`.

**POST/PATCH validation:** name required; `unit_price >= 0`; `tax_rate` in 0–100;
`stock_item_id` if set must exist in-company (400 else, not 404 — match `client_id` on
create); duplicate SKU in company → 400.

**QuoteItemIn / InvoiceItemCreate** gain optional `product_id`. Inactive or cross-tenant
`product_id` on create → 400.

**Stock deduction** (invoice create and quote accept): collect `product.stock_item_id` for
lines that have a product; same lock / insufficient-qty 400 / low-stock notify path as
today’s `stock_item_id` on the invoice body. Prefer `product.stock_item_id` when both a
legacy request `stock_item_id` and a `product_id` are present on the same line.

**Quote serialize** includes `tax`, GST header fields, and line `product_id` / `hsn` /
`tax_rate` / `tax`.

## Frontend

Canonical component `frontend/components/products/ProductsPage.jsx` (mirror `StockPage`:
loading / error / empty / success). Role pages:

- `/sales/products`, `/manager/products` — read-only (`canManage=false`)
- `/md/products`, `/purchase/products`, `/admin/products` — `canManage=true`

Admin has no stock page today; they do have write access, so they get a products page.
Sidebar: Products next to Stock for sales / manager / MD / purchase; on admin next to
Audit Logs. Sales read-only copy: ask an admin to add catalog items.

`CreateOrderModal`: product `<select>` (active products). Picking fills description, price,
HSN; the tax field **defaults** to the sum of line taxes and remains an override if the
user edits it. Typed lines stay. Keep the existing stock picker for warehouse-only lines
that are not catalog products. Public `/api/v1` invoices stay on `stock_item_id` (no
`product_id` this round).

Deal quote UI (`frontend/app/sales/deals/[id]/page.jsx`): stop one-click “quote the deal
amount as a single free-text line” as the only path — add a small line editor with the
same product picker, show subtotal + tax. Accept still copies snapshots.

Invoice GST summary stays header-level (`InvoiceGstSummary`). No per-line CGST columns.

## Testing (TDD)

- `backend/tests/sales/test_products_schema.py` — `products` table and new columns exist.
- `backend/tests/sales/test_products_api.py` — CRUD; SKU unique; `active_only`; sales 403
  on write; `stock_item_id` must be in-company; delete unused 204; delete referenced 400.
- `backend/tests/finance/test_products_gst.py` — mixed 5% + 18% lines: header tax equals
  hand-sum of `line_tax`; free-text line uses company rate; no seller GSTIN stays legacy;
  quote create stores GST header; accept copies line + header snapshots and deducts linked
  stock qty; existing no-product invoice 18% tests still pass.
- `backend/tests/tenancy/test_products_cross_tenant.py` — company B GET/PATCH/DELETE of
  A’s product is **404** (not 403), each with a positive control; B using A’s `product_id`
  on an invoice is **400**.

Update `backend/tests/sales/test_quotes.py` totals for company-rate GST on free-text lines.

## Deploy

Run `create_missing_tables.py` on deploy (`create_all` for `products`; `_MISSING_COLUMNS`
for quote/invoice new columns).

## Done when

Create a product at 18% HSN 9983 and one at 5%; one invoice with both plus a free-text line
at company rate; header tax equals the three line taxes; quote accept copies those numbers
onto the invoice; linked stock qty drops; company B cannot read A’s catalog; suite green.
