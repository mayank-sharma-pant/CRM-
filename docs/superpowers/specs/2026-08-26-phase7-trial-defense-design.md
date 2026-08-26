# Phase 7 — Trial defense (design)

> Companion to [IMPLEMENTATION_PLAN.md](../../IMPLEMENTATION_PLAN.md) Phase 7
> and [PRODUCT_ROADMAP.md](../../PRODUCT_ROADMAP.md) §8.
> Grounded in shipped Phases 0–6 (code, 26 Aug 2026), not a feature-count war.

## Problem

Phases 0–6 put a sellable CRM in the repo. HubSpot Free and Zoho CRM still win
the **first-week trial** on thin edges: tracked email, booking links, store
apps, live India books/GST, Hindi, Pipedrive-style next-activity nag. Matching
Marketing Hub, Zoho Desk, or Salesforce is out of scope (roadmap §7).

## Decisions (locked)

1. **This is Phase 7**, not a new product. Same stack: FastAPI + Next.js +
   Postgres + Flutter. Spec + plan **per item** before coding (same as 6.x).
2. **Do not clone suites.** No CMS, ads, journeys, full helpdesk, AppExchange,
   Deluge, HIPAA checkbox, social CRM.
3. **Order is trial impact**, India-first after HubSpot week-one:
   tracking → booking → store app → Hindi → live Tally → live IRN → price
   books → next-activity → quote/order/invoice → approvals → import → reports.
4. **Widget stays lead-capture.** Fix copy if it implies live agent chat (6.17).
   Two-way chat is not a Phase 7 item.
5. **Live vendor calls are adapters** behind the existing stub pattern (5.4,
   6.16). Missing credentials → 503/400 with a clear message, never a fake
   success. Tests use fakes; no NIC/Tally secrets in the repo.
6. **Differentiation to keep sharp:** GST + Razorpay portal pay + WhatsApp +
   Exotel in one app; RLS tests; magic-link pay without a portal login.

## Non-goals (whole phase)

HubSpot Marketing Hub, Zoho Desk/One, Salesforce custom-object platform,
Mailchimp clone, layouts/page designer, field-level encryption, profiles +
sharing-rules rewrite, Twilio (6.3 residual), Interakt.

## Items

| Item | Closes | v0 shape |
|------|--------|----------|
| **7.1** Email open / click tracking | HubSpot Free wedge | Pixel + wrapped links on `deliver_and_log`; counts on `email_logs`; public hit endpoint (no JWT). Attachments still out. |
| **7.2** Meeting booking + inbound calendar | HubSpot meetings | Public `/book/{slug}` creates a `meetings` row; pull Google/Outlook events into CRM (6.2 residual). Meet/Teams conference links if the provider returns them. |
| **7.3** Store-listed mobile | Table-stakes apps | Follow `flutter_app/store/STORE_RELEASE.md`: `flutter create` android/ios, signing docs, listing copy. Code path already has MFA (6.8). Play/App credentials stay out of git. |
| **7.4** Hindi UI | Zoho India | `next-intl` or existing i18n pattern if present; sales loop strings (leads, deals, invoices, quotes). Not 28 locales. |
| **7.5** Live Tally sync | Accountant trial | Replace 5.4 stub HTTP with a real Tally adapter when URL/key set; QuickBooks stays stub unless the same item’s spec says otherwise. |
| **7.6** Live GST IRN | India invoice buyers | IRP/NIC adapter when GSTINs + credentials exist; keep stub when unset. No fake “registered” IRN. |
| **7.7** Price books | Zoho Professional | Named books, product prices per book, default book per company. Quote/invoice lines pick book or product default. |
| **7.8** Next-activity nag | Pipedrive | Open deal requires a next activity (task/meeting/follow-up); rotting uses last timeline touch; email nag for `due_today` (6.14 residual). |
| **7.9** Quote → sales order → invoice | Zoho money chain | Accepted quote can mint a sales order; order converts to invoice. Purchase orders unchanged unless they already share the model. |
| **7.10** Deal / discount approvals | Zoho process | Threshold (amount or % off list) → pending until admin/MD approve. Purchase-invoice approval stays as-is. |
| **7.11** Import undo + clients/deals CSV | CRM nag | Mapper for clients + deals; last import batch undo (soft-delete or delete if unused). |
| **7.12** Reports + schedule | Zoho Standard compare | At least deals pipeline + GST invoice reports; scheduled email of CSV to company admins. No drag-drop grid. |

## Done when

A trial user can: send a tracked CRM email and see an open; book a site visit
from a public link; use the sales mobile path from a store build **or** a
documented sideload while listing is in review; switch the sales UI to Hindi;
push an invoice to Tally when configured; generate a non-stub IRN when NIC
creds exist; price from a book; get nagged on a deal with no next step;
accept quote → order → invoice; import clients and undo; email a scheduled
report.

Landing and in-app copy must not claim live chat, live NIC, or live Tally when
those integrations are unset.

## Execution

Same as 6.x: one item spec, one item plan, TDD, tests green, then the next
item. Do not start 7.n+1 until 7.n is in the repo and verified.

**Resume:** **7.8** (7.1–7.7 in code).
