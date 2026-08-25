# Phase 5.7 — Email campaigns (design)

> Companion to [IMPLEMENTATION_PLAN.md](../../IMPLEMENTATION_PLAN.md) Phase 5.7.

## Problem

Buyers ask for “campaigns.” Building Mailchimp/Zoho Campaigns (lists,
journeys, open/click tracking, A/B, a visual designer) is explicitly
out of scope ([PRODUCT_ROADMAP.md](../../PRODUCT_ROADMAP.md) §7: do not
clone full email marketing). 5.7 **integrates** with the existing CRM
send path (`deliver_and_log` / SMTP / mailbox). 5.10 remains the later
capped one-shot blast without a campaign object.

## Decisions (locked)

1. **Reuse CRM email.** Each recipient is sent through
   `app.services.sales.crm_email.deliver_and_log`. No new pip dep, no
   Mailchimp/Brevo HTTP, no open/click pixels.

2. **Tables**
   - `email_campaigns`: `id, company_id, name, subject, body,
     audience (leads|clients), status (draft|sent), created_by_id,
     created_at, sent_at`
   - `email_campaign_recipients`: `id, company_id, campaign_id,
     to_email, lead_id, client_id, email_log_id, status
     (sent|failed|skipped)`
   No new columns on `email_logs`.

3. **Audience** — `leads`: company leads with a non-empty email;
   `clients`: company clients with a non-empty email. Rows without
   email are `skipped`. Duplicate emails send once (first record).

4. **Cap** — `MAX_RECIPIENTS = 50` eligible addresses per send. Over
   cap → 400. Zero eligible → 400. This is not 5.10 (no campaign
   object; different UI).

5. **Send once.** `status=sent` cannot be sent again → 400.
   Campaign is marked `sent` after the loop even if some deliveries
   failed (recipient rows carry `sent`/`failed`).

6. **Schema** — models in `app.models.sales`; Alembic `024_campaigns`
   (`down_revision: 023_marketplace`) calls `apply_schema`. New tables
   via `create_all`. No `MISSING_COLUMNS`.

7. **Routes** (`/api/campaigns`)
   - `GET ""` — any company user. `{total, items}`
   - `POST ""` — admin/MD `{name, subject, body, audience}`
   - `GET /{id}` — company user; includes `recipients` after send.
     Foreign id → 404.
   - `POST /{id}/send` — admin/MD. Returns
     `{sent, failed, skipped, campaign}`.
   - `DELETE /{id}` — admin/MD, 204, cascades recipients. 404 other
     tenant. Draft or sent both deletable.

8. **Validation** — name/subject required (max 200); body required
   (max 20000); audience must be `leads` or `clients`.

9. **UI** — `/campaigns` list + create + send + recipient results.
   Sidebar link for all roles. Settings card pointing at `/campaigns`.

## Non-goals

Mailchimp/Brevo live API, journeys, templates designer, open/click
tracking, unsubscribe pages, A/B tests, scheduled send, 5.10 mass
email without a campaign row.
