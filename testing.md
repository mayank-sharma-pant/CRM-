# Manual testing guide

Test the product in the order a company actually appears: **platform admin sees the company → company admin builds the org → manager assigns work → sales, purchase, and MD use it.**

Use the seeded accounts in [`passwords.md`](./passwords.md) for the role walkthrough. Create a throwaway company only for the “add company” steps.

| | |
|---|---|
| Local frontend | http://localhost:3000 |
| Local backend | http://localhost:8000 |
| Live frontend | https://crm.perioxia.com |
| Seeded company | **Manual QA Co** (team **QA Alpha**) |
| Shared password | `ManualTest#2026` |

**Re-seed local users (safe to re-run):**

```bash
cd backend && python scripts/seed_manual_test_users.py
```

**Pass / fail:** the page loads, the thing you just did shows up for the next role, and a wrong role cannot open that URL.

Two browser windows: one normal, one private, so two roles stay logged in.

---

## 0. Before you start

- [ ] Frontend and backend are running.
- [ ] Seed script has been run at least once.
- [ ] Stay in light mode for the first pass. Recheck the dashboards in dark mode at the end (theme toggle).

Seeded logins (password above):

| Who | Email | Login | Lands on |
|-----|-------|-------|----------|
| Platform admin | `qa-platform-admin@manualtest.local` | `/platform/login` | `/platform/requests` |
| Company admin | `qa-admin@manualtest.local` | `/login` | `/admin/dashboard` |
| Manager | `qa-manager@manualtest.local` | `/login` | `/manager/dashboard` |
| Sales | `qa-sales@manualtest.local` | `/login` | `/sales/dashboard` |
| MD | `qa-md@manualtest.local` | `/login` | `/md/dashboard` |
| Purchase | `qa-purchase@manualtest.local` | `/login` | `/purchase/dashboard` |

Platform admin does not use `/login`. Company roles do not use `/platform/login`.

---

## 1. Platform admin — companies

**Login:** `/platform/login` as `qa-platform-admin@manualtest.local`.

There is no “Add company” button. A company is created by public signup and stays **pending** until a platform admin approves it. Every platform admin sees the same queue. The founder cannot sign in until then. **Companies** lists approved companies only (active, trial, suspended, rejected).

### 1.1 Walk the operator console

- [ ] **Dashboard** `/platform/dashboard` — metrics load; pending/companies links work.
- [ ] **Pending signups** `/platform/requests` — list or the empty state “No pending requests”. Do not approve or reject **Manual QA Co**.
- [ ] **Companies** `/platform/companies` — search `Manual QA`; open it. Status, plan, and user count render.
- [ ] Filter All / Active / Pending / Suspended / Rejected. Trial companies show under **All status**.
- [ ] **Audit log** `/platform/logs` — events load.
- [ ] **Plans** `/platform/plans` — plan list loads.
- [ ] **Platform session** `/platform/session` — session info loads.
- [ ] Logout returns to `/platform/login`. A company URL such as `/admin/dashboard` does not open the tenant app.

### 1.2 Add a company (private window)

Use a unique email you control, for example `qa-newco-<today>@example.com`. Password at least 8 characters.

1. Private window: `/signup`.
2. Fill **Full name**, **Work email**, **Password**, **Business name** (use a name you can search, e.g. `QA Newco <today>`). Phone is optional.
3. Submit **Create account**. You are sent to `/login?registered=true`.
4. You land on `/login?registered=true`. Signing in now is refused: company is pending approval.
5. Back in the platform window: **Pending signups** shows the business name. It is not under **Companies** until you approve it.
6. **Approve**. It leaves the queue and shows under **Companies** as Active. The founder can then sign in at `/login` and lands on `/admin/dashboard`.

**Pending-queue check (only if a `pending` company already exists):** Approve one, confirm it leaves Pending signups and shows Active under Companies. Reject a different one with a reason. Skip if the queue is empty.

- [ ] New company appears under Pending signups for every platform admin, and not under Companies.
- [ ] Founder cannot log in until a platform admin approves it.
- [ ] After approval, founder lands on `/admin/dashboard`.
- [ ] Platform session still cannot open `/admin/users`.

---

## 2. Company admin — teams and members

**Login:** `/login` as `qa-admin@manualtest.local` → `/admin/dashboard`.

Use the seeded company for this section. Invites on a brand-new company need a working invite email; local SMTP often does not send one, and the UI only says “Invite sent successfully”.

Platform admin cannot invite members. Only a company admin can.

### 2.1 See the company

- [ ] Dashboard cards load and the links on them open.
- [ ] Sidebar items open: User Management, Team Management, Approvals, Audit Logs, Products, Saved reports, Forecast, AI Assistant, Settings.

### 2.2 Team, then members

Order matters. A team can have **one** manager. **QA Alpha** already has `qa-manager`, so do not invite a second manager onto that team.

1. **Team Management** `/admin/teams`.
2. **Create Team**. Name it `QA Beta <today>`. It appears in the list. Open it. Members empty, manager “No manager assigned”.
3. **User Management** `/admin/users` → **Invite Member**.
   - Required: Email, Full Name, Phone, Role.
   - Team dropdown appears only for **Sales Executive** and **Manager**.
4. Invite a manager onto `QA Beta` (not QA Alpha): role **Manager**, team `QA Beta`.
5. Invite a sales user onto the same team: role **Sales Executive**, team `QA Beta`.
6. Optionally invite **Managing Director**, **Purchase**, and **Admin** (no team field).
7. Each invite shows success. If email is not configured, the person cannot accept yet — note “invite created, email not received” and continue the rest of this guide with the seeded QA Alpha users.
8. If the email arrives: open `/accept-invite/<token>`, set a password, log in, and confirm the role home (manager → `/manager/dashboard`, sales → `/sales/dashboard`).

Then, still as admin:

- [ ] User list search and role/status filters work. Open one user at `/admin/users/[userId]`.
- [ ] On the team, **Add Member** only lists people who already exist. **Change** manager. Do not remove `qa-sales` from QA Alpha.
- [ ] **Approvals** `/admin/approvals`: New Registrations and Transfers tabs load. Approve or reject only if a real pending row exists; empty state is a pass.
- [ ] **Audit Logs** `/admin/audit` shows the invite / team actions from this section.
- [ ] **Products** `/admin/products`: add one catalog item with an obvious name. You will look for it as sales and purchase later.

---

## 3. Manager — assign work

**Login:** `/login` as `qa-manager@manualtest.local` → `/manager/dashboard`.

This user manages **QA Alpha**, which includes `qa-sales`.

### 3.1 Assign a task

1. **Team** `/manager/team` — roster includes the sales user. Open a member.
2. **Tasks** `/manager/tasks` → **Add task**.
3. Title `QA call client`, assignee `qa-sales` (the name in the dropdown), due date **today**, priority Medium.
4. **Create & Assign Task**. The task appears in the list (All, and Today).
5. Private window, log in as `qa-sales`. Open **Tasks** `/sales/tasks`, tab **Today**. The same task is there.
6. As sales, mark it complete. As manager, refresh `/manager/tasks` → **Completed**. It is completed.

- [ ] Manager can assign; sales sees it the same day; completion syncs back.

### 3.2 Assign a lead

1. As sales (or admin), create a lead and leave it unassigned if the form allows. If every new lead is auto-assigned, use whatever is already in the pool.
2. As manager: **Unassigned Pool** `/manager/leads/unassigned`. Pick `qa-sales` → **Assign**.
3. As sales: the lead is under **Leads** → Active. Sales opening `/sales/leads/unassigned` must not be able to Assign.

- [ ] Assign works for manager. Sales cannot assign from the pool.

### 3.3 Rest of the manager screens

Open each. Empty data is fine. A spinner that never ends or an error toast is a fail.

| Screen | Path |
|--------|------|
| Dashboard | `/manager/dashboard` |
| Conversations | `/manager/conversations` |
| Appointments | `/manager/appointments` |
| AI Assistant | `/manager/assistant` — one short prompt |
| Leads + detail + trash | `/manager/leads`, `/manager/leads/[id]`, `/manager/leads/trash` |
| Clients / accounts / deals | `/manager/clients`, `/manager/accounts`, `/manager/deals` and their `[id]` pages |
| Invoices | `/manager/invoices` |
| Stock / Products | `/manager/stock`, `/manager/products` — product from §2 is listed |
| Reports / Saved reports / Forecast | `/manager/reports`, `/reports`, `/reports/forecast` |
| Settings | `/manager/settings` |

---

## 4. Sales — do the work

**Login:** `qa-sales@manualtest.local` → `/sales/dashboard`.

- [ ] Dashboard loads. Sidebar items in Workspace, Pipeline, Catalog, and Insights all open.
- [ ] Task from §3 is visible; sales can also create their own task on `/sales/tasks`.
- [ ] **Leads** `/sales/leads`: tabs All / Active / Client / Lost. **Add New Lead**. Open the detail. Add a note, add a task, change status, **Convert to Client**.
- [ ] **Clients** `/sales/clients` shows the converted client. Open the detail.
- [ ] **Deals** `/sales/deals`: **New Deal**, move one stage, open the deal.
- [ ] **Quotations**: from the deal, or `/sales/quotes/new`. Quote appears on `/sales/quotes`.
- [ ] **My Orders** `/sales/orders`: **Create Order**. This is what purchase will approve next.
- [ ] Follow-ups, Conversations, Appointments, Accounts, Stock, Products, Performance, Forecast, Sales settings, AI Assistant: each opens. Products includes the item from §2.
- [ ] Lead trash `/sales/leads/trash` opens.
- [ ] `/admin/users` and `/platform/companies` do not open for this user.

---

## 5. Purchase — approve and invoice

**Login:** `qa-purchase@manualtest.local` → `/purchase/dashboard`.

Depends on the order from §4.

- [ ] **Sales Approvals** `/purchase/sales`. Open the order. **Approve Sale** once. On a second sale, **Reject Sale** with a reason (skip the reject if you only have one sale).
- [ ] **Invoice Management** `/purchase/invoices`: create a draft, open it, **Send**, **Mark paid** with a tiny amount.
- [ ] Stock, Products, Purchase Monitoring, and AI Assistant open. The catalog item from §2 is on Products.

---

## 6. MD — company view

**Login:** `qa-md@manualtest.local` → `/md/dashboard`.

- [ ] Dashboard KPIs and charts load. Open **Revenue** `/md/revenue`, **Teams** `/md/teams`, **Monitoring** `/md/monitoring` (linked from the dashboard or by URL), **Sales** `/md/sales`, **Points** `/md/points`.
- [ ] **Employee Lookup** `/md/employee-lookup` finds `qa-sales` or an ID copied from Teams.
- [ ] Leads, unassigned pool (Assign is allowed), clients, accounts, deals, stock, products, invoices: lists open. The invoice from §5 is on `/md/invoices`.
- [ ] `/md/performance` redirects to `/md/teams`.
- [ ] Appointments, Conversations, AI Assistant, Saved reports, Forecast open.
- [ ] Custom reports `/md/reports` loads.

---

## 7. Settings, shared modules, public pages

Do these after the story above. Skip a settings page when it needs credentials you do not have, and write “skipped — needs config”.

**Admin or MD settings** (load, change one harmless field, save):

`/settings`, `/settings/email`, `/settings/calendar`, `/settings/webhooks`, `/settings/sso`, `/settings/privacy`, `/settings/telephony`, `/settings/territories`, `/settings/sandbox`, plus any linked page under `/settings/` (`modules`, `scoring`, `leave`, `einvoice`, `approvals`, `price-books`, `quote-plans`, `marketplace`, `api-keys`, `security`, `whatsapp`, `accounting`, `predictions`, `email-templates`).

**Shared modules** (only the roles that show them in nav):

| Module | Path |
|--------|------|
| Cases | `/cases` |
| Campaigns | `/campaigns` |
| Mass email | `/mass-email` (do not send to real inboxes) |
| Custom modules | `/modules` |
| Ledgers | `/financial-ledgers`, `/finance` |
| Profile | `/profile` |

**Logged out:**

| Page | Path | Check |
|------|------|-------|
| Landing | `/` | CTAs go to login and signup |
| Login | `/login` | Wrong password fails; QA email hits the role home |
| Forgot password | `/forgot-password` | Submits without a crash |
| Privacy | `/privacy` | Loads |
| Report bug | `/report-bug` | Form submits without a crash |
| Public form / book / portals | `/f/[slug]`, `/book/[slug]`, `/c/[slug]`, `/w/[slug]`, `/p/quote\|invoice\|pay/[token]` | Skip unless you have a live slug or token |

**Chrome, once per company role:** sidebar active state, theme toggle, notifications bell, search (a known lead or client), profile, logout. After logout, Back does not show protected data.

---

## 8. Sign-off

```text
Environment: local / live
Date:
Tester:
Build / commit:

1 Platform (see company + add company):  PASS / FAIL —
2 Company admin (team + invites):        PASS / FAIL —
3 Manager assigns task + lead:           PASS / FAIL —
4 Sales pipeline + order:                PASS / FAIL —
5 Purchase approve + invoice:            PASS / FAIL —
6 MD sees the same work:                 PASS / FAIL —
Settings / public / wrong-role:          PASS / FAIL —

Blockers:
```

---

## Notes

- Credentials: [`passwords.md`](./passwords.md).
- Pipeline writes need a team. The seed puts every QA role user on **QA Alpha**.
- One manager per team. A second manager invite on QA Alpha fails on purpose.
- Empty lists are fine. Crashes, infinite spinners, and wrong-role access are failures.
- Suspend, reject, and delete-forever only on local, and never on Manual QA Co.
- Backend regression, optional: `cd backend && pytest`. Frontend, if present: `cd frontend && npm test`.
