# Phase 5.8 — Helpdesk / cases (design)

> Companion to [IMPLEMENTATION_PLAN.md](../../IMPLEMENTATION_PLAN.md) Phase 5.8.

## Problem

Buyers compare “cases.” Full Zoho Desk is out of scope
([PRODUCT_ROADMAP.md](../../PRODUCT_ROADMAP.md) §7). The existing bug
report is *our* product feedback, not a customer ticket. 5.8 ships a
**thin request** on the client: open/pending/closed cases plus a
web-to-case public form (same shape as the lead form).

## Decisions (locked)

1. **Not a desk product.** No SLAs, portals, macros, CSAT, or
   knowledge base. One case row + status.

2. **Tables**
   - `support_cases`: `id, company_id, client_id` (nullable),
     `subject, body, status (open|pending|closed),
     requester_name, requester_email, source (crm|web),
     created_at, updated_at`
   - `web_to_case_forms`: one per company —
     `id, company_id, slug, is_active, created_at`
     unique `company_id`, unique `slug`.

3. **Client match on web submit** — if `requester_email` matches a
   client email in that company (case-insensitive), set `client_id`.
   Otherwise leave null (unmatched inbound).

4. **Web-to-case** — public `GET/POST /api/public/cases/{slug}` with
   honeypot `website` (201 + no insert, same as lead forms) and
   `public_form_limiter` (10 / 10 min). Inactive/unknown slug or
   inactive company → 404. Required: name, email, subject, body.

5. **Schema** — models in `app.models.sales`; Alembic `025_cases`
   (`down_revision: 024_campaigns`) calls `apply_schema`. New tables
   via `create_all`. No `MISSING_COLUMNS`.

6. **Authenticated routes** (`/api/cases`)
   - `GET ""` — company users; optional `?client_id=&status=`
   - `POST ""` — any company user `{subject, body, client_id?,
     requester_name?, requester_email?}`. Foreign `client_id` → 400.
   - `GET|PATCH /{id}` — PATCH `{status}` only. Foreign id → 404.
   - `DELETE /{id}` — admin/MD, 204.
   - `GET|PATCH /form` — admin/MD enable/disable; GET any company
     user returns `{slug, is_active, public_path}`.

7. **UI** — `/cases` list; cases panel on client detail; `/c/[slug]`
   public form; Settings card; sidebar. Shared route so every role
   can open `/cases`.

## Non-goals

Zoho Desk, agent workspace, email-to-case, SLAs, customer portal
tickets, canned replies, attachments, assignment queues.
