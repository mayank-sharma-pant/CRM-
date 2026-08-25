# Perioxia CRM — Product & Architecture Roadmap

> Working plan for making this a sellable product. Not a rewrite. Not a Zoho clone.
> Zoho feature list taken from [Zoho CRM pricing](https://www.zoho.com/crm/zohocrm-pricing.html) as fetched 24 Aug 2026.

**Goal:** Sell to local service businesses (agencies, contractors, clinics, shops) who find Zoho too wide and Excel too weak.

**Architecture stay:** FastAPI + Next.js + PostgreSQL, one app, `company_id` tenancy. No microservices.

**Rule:** If a Zoho feature does not help that buyer close or collect money, it is later or never.

---

## 1. Strategy

Zoho CRM is a full sales platform: leads, contacts, accounts, deals, email, calling, workflows, inventory, CPQ, portals, AI (Zia), marketplace, mobile, 28 languages.

We already have a **company-scoped internal CRM**: leads, clients, tasks, follow-ups, invoices, ledgers, stock, leave, teams, role dashboards, CSV import, documents, an AI assistant that can mutate data.

We will **not** win by matching Zoho feature-for-feature. We win if:

1. A second company can never see the first company’s data (trust).
2. A customer can pay, hit plan limits, and keep using the product (SaaS).
3. A sales person can capture a lead, follow up, quote, invoice, and get paid in one loop (job-to-be-done).
4. Setup is hours, not a Zoho partner engagement.

Zoho India list prices (same page, INR, per user / month, GST extra): Free (3 users) · Standard ₹800 · Professional ₹1,400 · Enterprise ₹2,400. Position us **under Standard** with a sharper niche, or we need a reason to be more expensive (service-job workflow, GST invoices, WhatsApp).

---

## 2. What we already have (keep)

| Area | In this repo |
|------|----------------|
| Auth | JWT cookie + header, OTP login/reset, rate limits, company status gate |
| Tenancy | `company_id` on core models, `apply_company_scope`, 404 on cross-tenant |
| Sales | Leads (kanban statuses), clients (convert), tasks, follow-ups, notes, timeline |
| Finance | Invoices + line items, purchase approval, named ledgers |
| Ops | Documents, CSV import/export, stock items |
| Org | Teams, memberships, invites, leave, transfers, role UIs |
| Platform | Tenant approve/suspend, hardcoded plan catalog, audit-ish logs |
| AI | Company assistant with read + mutating tools (Gemini/OpenAI) |
| Tests | Auth, tenancy, AI permissions, some sales/finance/ops |
| Mobile | Flutter app (separate; not required for first paying web customer) |

---

## 3. Hard gaps vs selling (do these before cloning Zoho)

These are **not** Zoho features. They are why a serious buyer will not pay.

| Gap | Why it blocks a sale | Target |
|-----|----------------------|--------|
| Tenant filter is opt-in | One missed `apply_company_scope` leaks another company | RLS or session `SET app.company_id` + tests on every resource |
| Plans are fake | `/plans` is hardcoded JSON; `Company.plan` is a string; no Stripe | Checkout, webhook, seat/storage enforcement |
| Refresh tokens unused | Config has refresh days; login is access-only | Rotate refresh, revoke on logout |
| Route guard is client-only | Next `RouteGuard` only redirects in the browser | Middleware + API is source of truth |
| AI writes to CRM | Teams/ledgers/tasks can be created by the model | Audit every action; dry-run; sales = read + own tasks only |
| Duplicate UIs | Sales / manager / MD / purchase / admin reimplement the same objects | One lead/client/invoice surface; roles only change scope |
| Health is a lie | `/health` does not ping Postgres | `SELECT 1` or fail |
| Integer public IDs | Guessable `/leads/12` | Keep internally; expose UUID or opaque ids later |
| Global unique email | `User.email` unique across all tenants | Unique `(company_id, email)` once you sell to agencies with shared people |
| Default `SECRET_KEY` | Placeholder in settings | Fail boot in production if placeholder |

**Do not** start a DDD rewrite, TypeScript rewrite, or Flutter polish until the table above is done.

---

## 4. Zoho CRM feature gap matrix

Status: **Have** (usable) · **Thin** (exists, not competitive) · **Missing** · **Skip** (do not build as a clone).

### 4.1 Sales core (Zoho Free / Standard)

| Zoho | Us | Verdict |
|------|----|---------|
| Contacts | Clients + optional Account (`/api/accounts`) | Have (thin B2B) — **6.13** |
| Leads | Leads + statuses | Have — add custom stages per company |
| Deals / pipeline | Lead statuses used as pipeline | Thin — add **Deal** with value, close date, probability, multiple pipelines |
| Follow-up reminders | Follow-ups + tasks | Have — add email/WhatsApp/push reminders |
| Tasks, meetings, calls | Tasks only | Missing meetings + call log + click-to-call |
| Import / export | CSV import + export | Have — add field mapping UI, undo, duplicates |
| Standard reports | Role dashboards + charts | Thin — add saved reports, date range, CSV of any report |
| API | FastAPI routes, no public API keys | Missing public REST + API key + rate quota |
| Mobile app | Flutter present, not the sales path | Later |
| Email templates / send from CRM | SMTP for OTP only | Missing — Gmail/Outlook sync is table-stakes vs Zoho Standard |
| Mass email | No | Missing — cap tightly (spam risk) |
| Web forms / data capture | No public lead form | **Must** — website → lead |
| Calendar (Google/Microsoft) | No | Must for service businesses |
| Multiple pipelines | One status enum for all | Must for companies with 2+ services |
| Sales forecasting | MD dashboards, not quota vs actual | Missing |
| Data enrichment | No | Skip until paid add-on |
| Custom modules | Fixed schema | Skip v1; custom **fields** first |
| HIPAA | No | Skip unless health vertical |
| Slack / Zoom / Teams | No | Later |
| Built-in calling | No | Later (Exotel/Twilio) |

### 4.2 Automation & process (Zoho Professional)

| Zoho | Us | Verdict |
|------|----|---------|
| Workflow rules | No (code only) | **Must** — if X then create task / notify / change status |
| Blueprint / process | No | After workflows |
| Macros | No | Later |
| Cadences / sequences | Follow-ups are manual | Must — “day 1 SMS, day 3 call, day 7 email” |
| Approvals | Invoice purchase flow only | Extend to discount / deal / leave (leave exists) |
| Assignment rules | Manual assign | Must — round-robin by team |
| Scoring | No | Later |

### 4.3 Quotes, inventory, money (Zoho Professional)

| Zoho | Us | Verdict |
|------|----|---------|
| Products / price book | Stock items | Thin — add sellable **Product** + tax + GST |
| Quotes / estimates | Landing page mentions quotes; no Quote model | **Must** |
| Sales / purchase orders | Orders page exists; confirm vs Zoho SO/PO | Thin — close the quote → order → invoice chain |
| Invoices | Have | Thin — PDF, GST, payment link |
| CPQ | No | Skip |
| Payments (Stripe/PayPal) | No customer payments | **Must** for invoices; also for *our* SaaS billing |
| QuickBooks / Tally / Zoho Books | Ledgers are internal | Later — Tally/GST India if that is the buyer |

### 4.4 Marketing & service (often Zoho Plus, not core CRM)

| Zoho | Us | Verdict |
|------|----|---------|
| Campaigns / email marketing | No | Skip as a product; integrate later |
| Social CRM / ads | No | Skip |
| Live chat / SalesIQ | No | Later widget |
| Helpdesk / cases / web-to-case | Bug report for *us*, not customer tickets | Skip v1 or thin “requests” on client |
| Customer / partner portals | No | Later |
| Journeys / CommandCenter | No | Skip |
| Google Ads | No | Skip |
| ABM | No | Skip |

### 4.5 Platform, admin, trust (Zoho Enterprise)

| Zoho | Us | Verdict |
|------|----|---------|
| Territories | Teams only | Later |
| Reporting hierarchy | Roles + manager_id | Thin — verify every list is scoped to team |
| Custom fields | No | **Must** (10–20 fields per module) |
| Custom buttons / Deluge | No | Skip |
| Sandbox | No | Later |
| Field encryption | No | Later for PAN/Aadhaar if India |
| Portals | No | Later |
| Audit log | Have | Thin — immutable, export, who viewed |
| GDPR / DSR / retention | No | Must before EU; India DPDP later |
| SSO / SAML | No | Later (Google/Microsoft login first) |
| 2FA | OTP login exists; not TOTP 2FA on password | Must |
| Storage limits | No | With plans |
| Recycle bin | Hard deletes | Must |
| Duplicate merge | Email/phone check on convert only | Must |
| Tags | No | Easy win |
| Layout / page customization | Fixed JSX per role | Custom fields + one record page |
| I18n | English | Hindi + English if India-first |
| Marketplace | No | Never as v1 |

### 4.6 AI

| Zoho Zia | Us | Verdict |
|----------|----|---------|
| Agents that act | Assistant with mutating tools | Dangerous until audited |
| Email/call intelligence | No | Later |
| Predictive convert/churn | No | Later |
| Recommendations | No | After clean pipeline data |

Ship AI as **read-only insights** until tenancy + action audit are proven.

---

## 5. Other CRMs — what they have that we do not

Zoho is not the only bar. Buyers also try **HubSpot Free**, **Pipedrive**, **Freshsales**, and in India **Kylas / LeadSquared**. Salesforce is the enterprise bar; we do not chase it.

Prices below are typical 2026 list from vendor/comparison pages (USD, billed annually where noted). They move; use them as order-of-magnitude, not a quote sheet.

| | HubSpot Free / Starter | Pipedrive | Freshsales | Salesforce | Us |
|--|------------------------|-----------|------------|------------|-----|
| One record the whole company sees | Contact + Company + Deal | Person + Org + Deal | Contact + Account + Deal | Account + Contact + Opportunity | **Five role apps**; lead ≠ deal |
| Visual pipeline with **deal value** | Yes | **Core product** | Yes | Yes | Lead **status** only; amount faked in one MD view (`won * 10k`) |
| Email in the CRM (Gmail/Outlook, tracking) | Free: limited; Starter: yes | Yes (tiered) | **Built-in on cheap plans** | Yes | OTP SMTP only |
| Activity: call, meeting, email on the record | Yes | Activity-based selling | Phone + email + chat | Yes | Tasks + follow-ups; **no call/meeting/email log** |
| Sequences / “next activity” nag | Sequences (paid) | **Famous for this** | Sequences on Growth | Cadences | Follow-up rows; **no cadence engine** |
| Web form / chat → lead | Forms + chat (free-ish) | Forms / add-ons | Chat on plan | Web-to-lead | **Missing** |
| Workflows | Starter+ | Automations | Workflows | Flow | **Code only** |
| Public API + webhooks | Yes | Yes | Yes | Yes | Internal FastAPI; **no customer API keys** |
| Mobile | Strong | Strong | Strong | Strong | Flutter exists, **not the product** |
| Free / cheap entry | Free, unlimited users (limits on contacts/features) | ~$14/user | Free 3 users; Growth ~$9–11 | Expensive | **Cannot take payment** |
| Onboarding in-app | Yes | Hours to live | Fast | Heavy | Signup → **pending company** + empty role dashboards |

**What each competitor actually is (so we do not copy the wrong one):**

- **HubSpot** — inbound: contacts, companies, deals, email, forms, chat, meeting links. Free CRM is the default “try a CRM” product. We lose every trial that starts with “I’ll just use HubSpot free.”
- **Pipedrive** — one job: move deals. Pipeline UI, rotting deals, mandatory next activity. We copied **kanban statuses on leads**, not **deals with money and a next step**.
- **Freshsales** — CRM + **phone/email/chat in the box**. If our buyer lives on calls and WhatsApp, they will pick this or a telephony CRM, not us.
- **Salesforce** — custom objects, AppExchange, enterprise admin. Skip. Matching it is a company, not a roadmap.
- **Kylas / LeadSquared (India)** — WhatsApp, telephony, lead routing for high-volume inbound. If we sell in India, **WhatsApp + IVR** matters more than custom modules.

**Table-stakes every serious CRM has and we do not (cross-vendor):**

1. Deal with amount + close date + stage (not “lead status”).
2. Timeline of **all** touches (email, call, note, meeting) on one record.
3. Inbox or at least “send email and log it.”
4. Form or WhatsApp → lead with source.
5. Duplicate detection on email/phone.
6. Recycle bin.
7. Saved filters / “my deals due today.”
8. Permission as **profiles + sharing**, not five separate frontends.
9. Audit of who changed what.
10. Self-serve trial that is **active**, not admin-approved pending.

---

## 6. What we have done wrong

These are mistakes in *this* repo, not generic advice.

### 6.1 Product shape

**We built an internal company OS, then put a CRM landing page on it.**  
Stock, leave, transfers, purchase ledgers, platform-admin tenant approval, mutating AI — before a stranger can pay or a sales rep can send a quote. Competitors ship the sales loop first and add HR/inventory as other products (Zoho Books, Freshdesk, HubSpot Service Hub).

**We split the product by role instead of by object.**  
`/sales`, `/manager`, `/md`, `/purchase`, `/admin` are five apps. HubSpot has one contact. A manager here cannot work in the same lead UI as sales; they get a different tree. That multiplies bugs and makes onboarding “which URL do I use?”

**Lead is doing three jobs.**  
`Lead` holds pipeline status (`New` … `Converted`) with no amount, no expected close, no probability. Clients are a second record. There is no Deal. Pipedrive/HubSpot/Zoho all separate **who** (contact) from **money** (deal). We mixed them, then named MD metrics “deals” anyway.

**Marketing does not match the code.**  
Landing copy (`frontend/app/page.jsx`): quotes, scheduled jobs, payments, automatic follow-ups, marketing ROI. Code: no Quote model, no payment collection, follow-ups are manual, no ad spend object. Testimonials (“Mike Thompson, Thompson HVAC”, “Revenue is up 40%”) are **fabricated**. That is a legal and trust problem the day a journalist or buyer checks.

**Pipeline is not configurable.**  
Admin settings show pipeline stages and say contact admin to change them. Stages are a Python enum. Every competitor lets the customer rename stages on day one.

**AI was added as a feature checkbox.**  
An assistant that can create teams and ledger entries is the opposite of HubSpot’s cautious Copilot. It increases breach and “the bot deleted my team” risk before it sells seats.

### 6.2 Data model and API

- **No Activity entity** — tasks and follow-ups are parallel; email/calls cannot hang on the same timeline cleanly.
- **No source / campaign / medium** on leads beyond a free-text `source` — cannot answer “which ads work” (which the landing page claims).
- **No money on the pipeline** — invoice sits on client; MD page invents revenue with `won * 10k`.
- **Hard deletes** — competitors have recycle bin; we do not.
- **Integer IDs** in URLs — fine internally; bad as a public API.
- **Tenant scope is a helper, not the database** — competitors treat org_id as a platform invariant (Salesforce org, HubSpot portal, Zoho org).
- **Company signup is a ticket** (`pending` until platform admin) — HubSpot is self-serve in minutes. We added a **human bottleneck** before the first “aha.”

### 6.3 UX / engineering

- **Client-only route guard** — looks like security; API is the real gate. Extra complexity, false comfort.
- **JSX duplication** — same charts/KPI cards copied per role; drift is guaranteed (already: “deals” vs leads).
- **Empty product after login** — no sample pipeline, no “import CSV” wizard, no “connect Gmail.” Pipedrive wins on time-to-first-deal.
- **Health check ignores DB** — ops will think the app is up when Postgres is dead.
- **Brand drift** — Perioxia vs `CRM-` vs `local-service-crm-frontend` / CRM Inc. Buyer-facing name is Perioxia CRM as of 6.12; git folder name may still be `CRM-`.

### 6.4 Go-to-market (wrong even if code were perfect)

- Competing with **HubSpot Free** on “general CRM” is suicide until email + pipeline + forms exist.
- Competing with **Zoho** on module count is suicide.
- Competing with **Pipedrive** on pipeline UX is possible **only if** we become deal-centric and nag follow-ups.
- Competing in India without WhatsApp + GST invoice + Razorpay is ignoring the actual alternatives (Kylas, LeadSquared, Zoho).

**Wrong next moves:** rewrite in TS, microservices, more role dashboards, more AI tools, Flutter polish, matching Salesforce objects.

**Right correction:** one object model (Contact, optional Company, Deal), one UI, email or WhatsApp, form, quote, pay; kill fake claims on the homepage.

---

## 7. What we will never copy (on purpose)

Do not build a second Zoho One:

- Full helpdesk (Zoho Desk)
- Full email marketing (Campaigns)
- Social publishing
- Project management
- 1,100 marketplace apps
- Deluge / custom module builder as a platform
- HIPAA as a checkbox without a health product

If a customer needs those, they stay on Zoho. We take the ones who want **leads → jobs → invoices** without the suite.

---

## 8. Phases (order is the plan)

Each phase must be demoable. Do not start phase N+1 until N is in production or explicitly skipped.

### Phase 0 — Trust (2–4 weeks)

Make leaks and “demo SaaS” impossible.

- Postgres RLS or a DB session variable that every query inherits.
- Expand `backend/tests/tenancy/` to: leads, clients, invoices, documents, stock, users, teams, notifications, AI reads.
- Production boot fails if `SECRET_KEY` is the placeholder; `/health` checks DB.
- AI mutations: persist tool name, actor, company_id, payload; sales role cannot delete teams/ledgers.
- Refresh token + logout revoke; HttpOnly cookie only in production.

**Done when:** two seeded companies; user A cannot GET/PATCH/DELETE user B’s lead, invoice, or file. Test is automated.

### Phase 1 — Charge money (2–3 weeks)

- Stripe (or Razorpay if India-first) for *our* subscription.
- Enforce `max_users`, `max_storage`, maybe `max_leads` from a real `plans` table, not a Python list.
- Self-serve signup: company pending → pay or trial → active.
- Billing portal: upgrade, cancel, invoices for the CRM itself.

**Done when:** a stranger can sign up, pay test mode, hit seat limit, and fail to add user 11.

### Phase 2 — One sales loop better than Zoho for the niche (4–8 weeks)

This is the product people buy. One UI for the record; roles only filter.

1. **Public web form** → lead (tokenized form, spam honeypot, company branding).
2. **Deal object**: amount, currency, expected close, pipeline_id, stage (company-configurable stages).
3. **Quote PDF** → accept/reject → **invoice** → **payment link** (Razorpay/Stripe Checkout).
4. **Workflow engine v0:** trigger on lead created / stage changed / quote accepted; actions: assign round-robin, create task, send email, notify.
5. **Cadence:** sequence of follow-ups with due dates.
6. **Email:** send from CRM via SMTP first; Gmail OAuth second.
7. **Calendar:** Google Calendar create/sync for “site visit”.
8. **Custom fields** on lead/deal/client (text, number, date, picklist).
9. **Tags, recycle bin, merge duplicates.**
10. **Reminders:** in-app (have) + email; WhatsApp (Interakt/Gupshup) if India.

Collapse duplicate pages: one `/leads`, one `/clients`, one `/invoices`. Manager/MD see more rows, not different apps.

**Done when:** a plumber’s site form creates a lead, cadence fires, quote is sent, invoice is paid, MD sees revenue. No extra HR/stock work in this phase.

### Phase 3 — Match Zoho Standard where buyers compare (ongoing)

Build only if a trial user asks twice or a lost deal cites it:

- Meetings + call log
- Multiple pipelines
- Saved reports + dashboard builder (simple)
- Public API keys
- 2FA (TOTP)
- Import mapper + duplicate preview
- GST-compliant invoice (if India)
- WhatsApp Business templates
- Mobile: ship Flutter for lead + follow-up + invoice only

### Phase 4 — Zoho Professional extras (only after revenue)

- Blueprint (required stages)
- Products price book + tax
- Customer portal (view invoice/quote)
- Forecasting (quota vs pipeline)
- Assignment by territory
- Sandbox
- SSO

### Phase 5 — Explicitly later / paid add-ons

- Data enrichment
- Predictive AI
- Telephony
- Tally/QuickBooks sync
- Custom modules
- Marketplace

### Phase 6 — Competitor parity (done in code)

See [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) 6.1–6.20 (email/calendar, Exotel, timeline, portal pay, WhatsApp inbound, RLS, etc.).

### Phase 7 — Trial defense (current)

Close first-week gaps vs HubSpot Free / Zoho CRM / Pipedrive. **Do not** clone Marketing Hub or Zoho Desk.

1. Email open/click tracking
2. Public meeting booking + inbound calendar
3. Store-listed mobile (Play/App)
4. Hindi on the sales loop
5. Live Tally (5.4 is stub)
6. Live GST IRN (6.16 is stub)
7. Price books
8. Next-activity nag (mandatory + last-touch rotting + due email)
9. Quote → sales order → invoice
10. Deal / discount approvals
11. Import undo + clients/deals CSV
12. More reports + scheduled email

**Done when:** a trialist sees a tracked open, books a visit from a link, can use a store/sideload sales app, switches Hindi, syncs Tally/IRN when configured, prices from a book, gets nagged on a deal with no next step, and runs quote→order→invoice.

Spec: [`superpowers/specs/2026-08-26-phase7-trial-defense-design.md`](./superpowers/specs/2026-08-26-phase7-trial-defense-design.md).

---

## 9. Suggested file map (when we implement)

Do not implement until the current phase is chosen. This is so work does not wander.

| Work | Touch |
|------|--------|
| RLS / session tenant | `backend/app/database.py`, new `backend/app/tenancy.py`, Alembic, `backend/tests/tenancy/` |
| Plans & billing | new `plans` / `subscriptions` models, `backend/app/routers/` billing, replace hardcoded list in `backend/app/routers/admin/platform.py` |
| Deals | new model `backend/app/models/sales/deal.py`, router, one frontend record page |
| Quotes | new model + PDF; link `client_id` / `deal_id`; then `invoices` |
| Web forms | public router (no JWT, signed form id), `frontend` public `/f/[slug]` |
| Workflows | `workflow_rules` table, worker or in-request for v0 (queue later) |
| Custom fields | `custom_field_defs` + JSON/values table scoped by `company_id` |
| Unify UI | `frontend/app/sales/leads/` as canonical; other roles reuse components |
| AI audit | `backend/app/routers/ai/company_assistant.py`, `assistant_crm_actions.py` |

---

## 10. Competitive positioning (one sentence)

**Zoho:** any industry, any module, partner-led setup.  
**HubSpot:** free CRM + inbound (email, forms, chat) that becomes expensive hubs.  
**Pipedrive:** deals, pipeline, next activity — nothing else.  
**Freshsales:** CRM + phone/email/chat in the box.  
**Us (target):** service-business CRM — capture, follow up, quote, get paid — live in a day, cheaper than Zoho Standard, data isolation you can prove with a test. Not a HubSpot clone, not a fifth internal ERP.

---

## 11. How we know we are not wasting time

- Phase 0: tenancy tests green on all resources.
- Phase 1: first test-mode payment and a failed 11th seat.
- Phase 2: one design-partner company using web form → paid invoice for 30 days.
- Phase 7: tracked email open, public booking, Hindi sales UI, live Tally/IRN when creds exist, deal next-activity nag.
- Do not add stock/HR/AI features until that loop exists.

---

## 12. Decision log

- Architecture rewrite: **no**.
- Clone Zoho CRM Plus / Salesforce / HubSpot Marketing Hub: **no**.
- Clone Pipedrive’s deal+activity model for the sales core: **yes** (objects + UX, not their brand).
- Fake testimonials and unshipped landing claims: **remove before any public launch**.
- India vs global payments: **not decided** — pick Razorpay vs Stripe before Phase 1 (wrong pick wastes a week, not a quarter).
- Flutter: **after** web loop converts. Store listing is Phase **7.3**.
- Phase 7: trial defense (tracking, booking, Hindi, live India adapters). **Not** a HubSpot/Zoho suite clone.
