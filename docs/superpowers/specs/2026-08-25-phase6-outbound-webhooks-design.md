# Phase 6.15 — Outbound webhooks (design)

> Companion to [IMPLEMENTATION_PLAN.md](../../IMPLEMENTATION_PLAN.md) Phase 6.15.
> Complements public API keys (3.5): push events to customer HTTPS URLs.

## Problem

Integrators can pull via `/api/v1` but cannot subscribe to CRM events. Competitors
POST signed JSON on lead create, deal stage change, and invoice paid.

## Decisions (locked)

1. **Events:** `lead.created`, `deal.stage_changed`, `invoice.paid` only.
2. **`webhook_endpoints`:** tenant URL + Fernet-encrypted HMAC secret (shown once).
   Optional `events` list; empty/omitted means all three. Max **5** live endpoints.
   Admin/MD only. Other-tenant id → 404.
3. **Sign:** `X-Perioxia-Signature: sha256=<hex>` over canonical JSON body;
   `X-Perioxia-Event`; `X-Perioxia-Delivery`.
4. **Deliver** via existing `httpx` (2s timeout). Failures write `webhook_deliveries`
   and retry via `POST /api/webhooks/retry` (max 3 attempts). Emit must not fail
   the originating request.
5. HTTPS required except `http://` in non-production tests.
6. No Alembic. No new pip deps. No queue worker.

## Non-goals

Arbitrary event catalog, Zapier app, at-least-once worker, inbound CRM webhooks.
