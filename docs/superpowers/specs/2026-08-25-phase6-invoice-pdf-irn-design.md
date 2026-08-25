# Phase 6.16 — Invoice PDF + e-invoice/IRN (design)

> Companion to [IMPLEMENTATION_PLAN.md](../../IMPLEMENTATION_PLAN.md) Phase 6.16.
> Extends Phase 3.7 GST invoices.

## Problem

GST breakup exists on invoices, but there is no downloadable tax invoice and no
IRN field. India B2B buyers expect a PDF with GSTIN/HSN and an IRN path when
both GSTINs are present.

## Decisions (locked)

1. **PDF** — `GET /api/invoices/{id}/pdf` (`application/pdf`). Stdlib writer only
   (no new pip deps). Lines: seller name, invoice number, GSTINs, HSN, tax
   breakup, total, IRN if set.
2. **IRN path** — columns `irn`, `ack_no`, `ack_date`. `POST /api/invoices/{id}/einvoice`
   requires seller + buyer GSTIN. Builds IRP-shaped JSON; IRN is SHA-256 hex of
   that payload (64 chars) unless a provider is wired later. Idempotent if `irn`
   already set. 400 without GSTINs.
3. Cross-tenant invoice → 404. No Alembic; columns via `_MISSING_COLUMNS`.

## Non-goals

Live NIC/IRP HTTP, signed QR image, quote PDF, GSTR-1 filing.
