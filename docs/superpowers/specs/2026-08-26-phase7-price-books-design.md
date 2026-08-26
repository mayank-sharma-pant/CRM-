# Phase 7.7 — Price books (design)

> Companion to [IMPLEMENTATION_PLAN.md](../../IMPLEMENTATION_PLAN.md) Phase 7.7
> and [the phase-7 spec](./2026-08-26-phase7-trial-defense-design.md).
> Extends [4.1 products](./2026-08-25-phase4-products-price-book-design.md).
> Grounded in shipped 4.1 code (27 Aug 2026).

## Problem

4.1 ships a product catalog with one **list price** on `products.unit_price`.
Zoho Professional expects **named price books** (Retail, Dealer, VIP) with per-product
prices. Quotes/invoices should pick a book (or the company default) when resolving
`product_id` lines; explicit `unit_price` overrides still win.

## Grounding (verified)

- `Product.unit_price` is the list/default price.
- `resolve_sale_lines` in `product_lines.py` fills price from product when
  `unit_price` is omitted.
- Quotes and invoices call `resolve_sale_lines` on create; line snapshots are
  persisted (price does not change when books are edited later).
- Product write roles: purchase / md / admin.
- Alembic head: `030_einvoice_live`.

## Decisions (locked)

1. **Two new tables:** `price_books` and `price_book_entries`. No change to
   `products.unit_price` — it remains the fallback when a book has no entry for
   a product.
2. **One default book per company** via `price_books.is_default`. Setting a new
   default clears the flag on siblings. At most one default; zero defaults is
   valid (falls back to list price only).
3. **Price resolution** (when `product_id` set and request `unit_price` is null):
   - If request includes `price_book_id` → use entry price in that book, else
     `product.unit_price`.
   - Else if company has a default book → use entry in default book, else list.
   - Else → `product.unit_price`.
   Request `unit_price` always wins (unchanged 4.1 override).
4. **Snapshots:** resolved price is stored on quote/invoice lines at create time
   (existing behavior). No `price_book_id` column on quote/invoice headers in v0.
5. **Tenancy:** books and entries are company-scoped; foreign book id → 404;
   foreign product on entry → 400.
6. **Delete:** book with `is_default` may be deleted if it is the only book; else
   require unsetting default first or auto-clear default on delete.

## Data model

### `price_books`

| column | type | notes |
|--------|------|--------|
| id | PK | |
| company_id | FK companies, indexed | |
| name | String(100), not null | unique per company |
| is_default | Boolean, default false | |
| is_active | Boolean, default true | inactive books hidden from pickers |
| created_at | DateTime | |

`UniqueConstraint("company_id", "name")`

### `price_book_entries`

| column | type | notes |
|--------|------|--------|
| id | PK | |
| company_id | FK | denormalized for scope checks |
| price_book_id | FK price_books CASCADE | |
| product_id | FK products | |
| unit_price | Numeric(12,2), not null | >= 0 |

`UniqueConstraint("price_book_id", "product_id")`

Alembic **`031_price_books`** (`down_revision = 030_einvoice_live`).

## API — `/api/price-books`

| method | who | notes |
|--------|-----|--------|
| GET / | any company member | `active_only` default true; includes `is_default`, entry count |
| POST / | purchase, md, admin | `{name, is_default?}` |
| GET /{id} | any | book + `entries: [{product_id, unit_price, product_name}]` |
| PATCH /{id} | purchase, md, admin | name, is_active, is_default |
| DELETE /{id} | purchase, md, admin | 204; clears default if needed |
| PUT /{id}/entries | purchase, md, admin | body `{entries: [{product_id, unit_price}]}` upsert; omit product removes entry |

**QuoteCreate / InvoiceCreate** gain optional `price_book_id: int | null`. Invalid
or cross-tenant book → 400.

## Frontend

- `/settings/price-books` — list books, set default, edit entries (admin/md/purchase).
- Settings home card linking to it.
- `CreateOrderModal`: optional price book `<select>` (default book pre-selected);
  when book or product changes, fill line price from book entry or product list price.
- Pass `price_book_id` on quote/invoice create when a book is selected.

## Testing

`tests/sales/test_price_books.py`:

- CRUD + unique name; set default clears sibling; sales 403 on write.
- Entry upsert + delete via omit; foreign product 400.
- `resolve_sale_lines` uses book entry, default book, list fallback, explicit override.
- Quote/invoice create with `price_book_id` persists resolved price.
- Cross-tenant book 404; foreign book id on create 400.
- `test_alembic_heads` → `031_price_books`.

## Done when

Admin creates “Dealer” book with a lower price on a product; sets it default; new
invoice line with that product picks dealer price without typing unit_price; explicit
unit_price still wins; company B cannot read A’s books; heads clean.

## Residuals

No price book on public `/api/v1`, no effective-date tiers, no currency per book,
no header `price_book_id` snapshot on documents.
