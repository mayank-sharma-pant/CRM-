# Perioxia CRM — Aim and Trajectory

Companion to [`context.md`](./context.md). That file covers what exists and how to run it. This one covers **what we're trying to build, for whom, how the direction changed, and what should happen next.**

Sources: the original `PRODUCT_ROADMAP.md` and `IMPLEMENTATION_PLAN.md` (recover with `git show b5167e9^:docs/PRODUCT_ROADMAP.md`), `plan-todo.md`, `plan-next.md`, and the git history. Where I give an opinion and not a recorded decision, it's marked **(recommendation)**.

---

## 1. The aim in one sentence

**A CRM that lets a small Indian service business capture a lead, reply on WhatsApp, book the visit, quote, invoice, and get paid. It should be live in a day, cost less than Zoho Standard, and keep each company's data isolated in a way we can prove with a test.**

## 2. Who it's for

- **Buyer:** small service businesses in India (agencies, contractors, clinics, local shops). Typically 2–20 people. Leads arrive by phone, WhatsApp, website, or a Google Sheet. They live on WhatsApp, need GST invoices, and pay via UPI/Razorpay.
- **They find:** Zoho too wide and too partner-heavy, and Excel/WhatsApp groups too weak (leads get lost, nobody knows who owns what).
- **Users inside the company:** sales execs (do the work), a manager (assigns and watches the team), the owner/MD (wants to see everything), sometimes a purchase/accounts person, and an admin.

## 3. Positioning (recorded in the roadmap)

| Competitor | What they are | Our stance |
|---|---|---|
| Zoho CRM | Every module for every industry, partner-led setup | Don't match module count. Be cheaper and faster to set up. |
| HubSpot Free | Free CRM + inbound (forms, email, chat) | Don't fight on general CRM. |
| Pipedrive | Deals + pipeline + "next activity" nag | Copy the **deal + next-activity model** (done in 7.8). |
| Freshsales | CRM with phone/email/chat built in | Match with WhatsApp + Exotel. |
| Kylas / LeadSquared (India) | WhatsApp + telephony + lead routing | **The real local competition.** WhatsApp, IVR, and GST matter more than custom modules. |

Pricing anchor: Zoho India Standard is about ₹800/user/month. The plan was to price **below** that. *(Prices date from Aug 2026 research and may have changed.)*

Payment provider decision: **Razorpay** (India-first), behind a provider-agnostic adapter so Stripe can be added later.

## 4. How the direction changed

### Stage 1 — "Internal company OS" (before Aug 2026)
The project started as an internal tool: leads, clients, tasks, invoices, ledgers, stock, leave, transfers, five separate role apps, and an AI assistant that could change data. The roadmap's own diagnosis: *"We built an internal company OS, then put a CRM landing page on it."* There were fake testimonials on the landing page, no way to take payment, and admin approval was needed before a company could even log in.

### Stage 2 — "Make it sellable, then match Zoho" (Aug 2026, Phases 0–7)
A deliberate roadmap, built very fast with AI agents (about 3 days of commits for Phases 3–7):
- **0 Trust:** prove tenant isolation (tests + Postgres RLS), harden auth.
- **1 Charge money:** Razorpay, self-serve 14-day trial, seat limits.
- **2 One sales loop:** form → lead → deal → quote → invoice → payment link.
- **3–6 Parity:** everything a Zoho / HubSpot / Pipedrive trialist would miss (email sync, calendar, telephony, WhatsApp, timeline, portal, SSO, GDPR ...).
- **7 Trial defense:** the first-week gaps (email tracking, booking links, Hindi, live Tally/GST, price books, deal nag, approvals, import undo, scheduled reports).

Original rule: *"each phase ships to production before the next starts."* **In practice this rule was not followed.** Everything was built "in code", and production verification was pushed into a single deferred gate that was never passed.

### Stage 3 — "SMB wedge" (Sep 2026, current)
After the parity build-out, focus narrowed to the **daily operations of a small sales team**, inspired by reviewing a competitor (TikunCRM). The decision was to take its daily-ops ideas but **not** clone its dealership features. Goal from `plan-todo.md`:

> Ship coding work so a small sales team can **claim leads, talk on WhatsApp, book appointments, finish Day-0 setup, and get overdue/unanswered reminders** — without enterprise/dealership features.

Delivered (all checked off):
1. **Unassigned Pool:** sales claim open leads; manager/MD assign them.
2. **Appointments:** meetings list with today / upcoming / overdue KPIs, scoped by role.
3. **Conversations:** WhatsApp thread inbox with an "unanswered" filter.
4. **Email templates** in Settings.
5. **Day-0 onboarding** reworked around invite a teammate → connect WhatsApp → import CSV → sample data.
6. **Daily digest** in-app notifications (unanswered WhatsApp, overdue meetings, unassigned leads).
7. **Mobile:** claim, Appointments, Conversations on Flutter.
8. **Google Sheet lead pull** (many small businesses keep leads in a sheet).
9. **Quotations** with tenant-configurable plans and PDF.

**This is the current product thesis:** WhatsApp-first daily ops for small Indian sales teams, with the broad Phase 0–7 platform underneath.

## 5. Non-goals (recorded decisions — keep unless strategy changes)

- No architecture rewrite, no microservices, no TypeScript rewrite.
- No Zoho One / Salesforce / HubSpot Marketing Hub clone: no full helpdesk, marketing suite, social, project management, third-party marketplace, or Deluge-style scripting.
- No dealership chrome: Trust/SSN, BDC, sold cars, partner stores, Time & Pay.
- No unified email + WhatsApp inbox (Conversations = WhatsApp; email stays on the record).
- No Meta Lead Ads, no calendar view on Appointments, no ⌘K palette (for now).
- AI stays cautious. The assistant's writes are audited and role-restricted, and it shouldn't grow more write powers before tenancy and audit are proven in prod.

## 6. Where we actually are vs the aim

| Aim | Code | Proven in real use |
|---|---|---|
| Capture leads (form, widget, CSV, Sheet, WhatsApp inbound) | Yes | No |
| Claim/assign, follow up, nag | Yes | No |
| Reply on WhatsApp | Yes (Gupshup) | **No: never run against live Gupshup** |
| Book the visit | Yes (appointments + public booking + calendar) | No |
| Quote → order → invoice → pay | Yes (Razorpay links) | **No: never run with live Razorpay** |
| Live in a day | Self-serve trial + onboarding checklist + sample data | No real onboarding observed |
| Cheaper than Zoho | Plans exist (Starter/Growth/Enterprise) in the DB | No pricing page, no paying customer |
| Provable isolation | Tests + RLS | RLS never exercised in CI (SQLite) |

**Honest summary:** the gap is no longer features. It's **verification and real users.** The roadmap's own success metric, *"one design-partner company using web form → paid invoice for 30 days"*, has not been met.

## 7. Recommended trajectory from here (recommendation)

My suggested order. It follows the roadmap's own rule that real usage gates new features.

**Step 1 — Stabilise (week 1)**
- Push the branch, fix the 2 stale tests, add CI with a Postgres job, add the system cron for reminders/digests/sheets (see `context.md` §8.1 and §10).

**Step 2 — Prove the wedge on production (weeks 1–3)**
- Configure live SMTP, Gupshup, and Razorpay (test mode, then live) on `crm.perioxia.com`.
- Run the whole wedge loop yourself as a real company: lead lands in the Sheet or form → shows in the Unassigned Pool → sales claims it → WhatsApp reply in Conversations → appointment booked → quote → invoice → payment link paid → digest the next morning.
- Fix whatever breaks. Expect most bugs here, not in new features.

**Step 3 — One design partner (weeks 3–8)**
- Put one real small business on it for 30 days. Watch where they get stuck and how much of the WhatsApp volume flows through the CRM.
- Build only what they ask for twice (the roadmap's "pull-based" rule).

**Step 4 — Only then**
- Pricing page + legal pages, store-submitted mobile app, live Tally/e-invoice for the customers who need them, deeper Hindi coverage.

**What would change this plan:** a customer who needs a specific integration (for example Tally or Exotel) on day one moves that integration into Step 2. A decision to sell outside India brings back the Stripe and English-only questions.

## 8. Open decisions Sourav now owns

1. **Is the SMB wedge the product?** The recorded direction says yes. Confirm it with the founders/business side before investing further.
2. **Pricing:** plan limits exist in the DB, but no public price is set.
3. **Hosting:** the setup is split across Vercel (frontend), a Procfile host or EC2 (backend), and managed Postgres, with no single source of truth. Pick one setup and document it.
4. **WhatsApp provider:** Gupshup is the only one implemented. Interakt or the Meta Cloud API was considered and never built.
5. **How much of the Phase 5–7 breadth to keep surfacing in the UI.** A small team may be overwhelmed by modules like custom modules, marketplace, sandbox, and predictions. Hiding them behind the marketplace toggle would help the wedge *(recommendation)*.
