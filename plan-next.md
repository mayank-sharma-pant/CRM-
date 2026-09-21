# Unassigned Pool, Appointments, Conversations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship three daily-ops pages — Unassigned Pool, Appointments, Conversations — on sales, manager, and MD (not admin/purchase), plus reusable email templates under Settings.

**Architecture:** Reuse existing APIs and row-scope. Each page is one shared component re-exported from role-prefixed routes (`/sales/*`, `/manager/*`, `/md/*`), matching `LeadsIndexPage`. Unassigned is a filtered lead queue (claim for sales, assign for manager/MD). Appointments is a meetings index over `GET /api/meetings` with new summary KPIs and sales/manager row-scope. Conversations is a WhatsApp thread inbox over existing `whatsapp_messages` (email stays on the record). Email templates is a Settings page, not a fourth sidebar module.

**Tech Stack:** FastAPI + SQLAlchemy 2 + pytest; Next.js 15 App Router + Tailwind Ledger Desk tokens; Playwright smoke.

**Spec:** This file. Product decisions from the TikunCRM screenshot review: keep Ledger Desk tokens; do not clone dealership chrome (Time & Pay, Partner Stores, Sold Cars, BDC, Trust/SSN, Meta Lead Ads, Google Sheets, PWA).

## Global Constraints

- Roles that get the three pages: `sales`, `manager`, `md` only. `admin` and `purchase` get no sidebar items and 403 on the new inbox/summary endpoints if they are not already company-scoped readers.
- Do not add a separate “Manager review” product, Heat/Trust/SSN columns, or No-Show status in v1.
- Do not build a unified email+WhatsApp inbox. Conversations = WhatsApp threads. Mailbox stays on the lead/deal record.
- Do not add Meta Lead Ads, Google Sheets sync, or an Integrations hub in this plan.
- Follow existing patterns: `frontend/app/<role>/leads/page.jsx` re-exports a shared component; `apply_company_scope` plus role filters; 404 (not 403) for cross-tenant; parameterized queries; no secrets in code.
- UI: Ledger Desk tokens (`bg-page`, `bg-surface`, `border-border`, `text-primary`, `text-muted`, `btn btn-primary`). KPI strip + chip filters + row metadata (name, status, owner, phone). Do not restyle the whole CRM to TikunCRM blue.
- i18n: add keys to `frontend/lib/i18n/hi.cjs` for every new sidebar label.
- Commits only when the human asks. Do not `git commit` while executing unless they say so.

### Role matrix

| Page | sales | manager | md | admin | purchase |
|---|---|---|---|---|---|
| Unassigned Pool | Yes — claim | Yes — assign to team member | Yes — company pool, assign | No | No |
| Appointments | Yes — own + assigned-lead meetings | Yes — active team | Yes — company | No nav | No |
| Conversations | Yes — own/open-lead threads | Yes — team threads | Yes — company | No nav | No |
| Email templates | Use | Use | CRUD | CRUD | No |

TikunCRM’s “Manager review” (36) vs “Unassigned Pool” (1112) are two queues. We only have unassigned. Do not invent a review status.

TikunCRM “Schedules” is the calendar toggle on Appointments, not a fourth module. v1 is **list**. Calendar view is out of this plan.

---

## File map

**Backend**
- Modify: `backend/app/routers/sales/leads.py` — `unassigned` query flag on `GET /leads`
- Modify: `backend/app/routers/sales/meetings.py` — row-scope list; `GET /meetings/summary`
- Modify: `backend/app/routers/sales/whatsapp.py` — `GET /whatsapp/threads`
- Create: `backend/app/models/sales/email_template.py` + Alembic migration + router under `/api/email-templates`
- Test: `backend/tests/sales/test_unassigned_pool.py`
- Test: `backend/tests/sales/test_meetings_row_scope.py`
- Test: `backend/tests/sales/test_whatsapp_threads.py`
- Test: `backend/tests/sales/test_email_templates.py`

**Frontend**
- Create: `frontend/components/leads/UnassignedPoolPage.jsx`
- Create: `frontend/app/sales/leads/unassigned/page.jsx`, `frontend/app/manager/leads/unassigned/page.jsx`, `frontend/app/md/leads/unassigned/page.jsx`
- Create: `frontend/components/appointments/AppointmentsPage.jsx`
- Create: `frontend/app/sales/appointments/page.jsx`, `frontend/app/manager/appointments/page.jsx`, `frontend/app/md/appointments/page.jsx`
- Create: `frontend/components/conversations/ConversationsPage.jsx`
- Create: `frontend/app/sales/conversations/page.jsx`, `frontend/app/manager/conversations/page.jsx`, `frontend/app/md/conversations/page.jsx`
- Create: `frontend/app/settings/email-templates/page.jsx`
- Modify: `frontend/components/Sidebar.jsx` — nav + badges for sales/manager/md
- Modify: `frontend/lib/objectPaths.cjs` — `appointmentsHomePath`, `conversationsHomePath`, `unassignedLeadsPath`
- Modify: `frontend/lib/i18n/hi.cjs`
- Modify: `frontend/components/leads/LeadsIndexPage.jsx` — keep “Open” badge; link to pool
- Modify: `frontend/app/settings/page.jsx` — tile to email templates
- Modify: `frontend/e2e/frontend-smoke.spec.js` and `frontend/e2e/local-smoke.spec.js`

---

### Task 1: `GET /leads?unassigned=true`

**Files:**
- Modify: `backend/app/routers/sales/leads.py` (`list_leads`)
- Test: `backend/tests/sales/test_unassigned_pool.py`

**Interfaces:**
- Consumes: existing `list_leads` role filters (sales: own + open on active team; manager: `Lead.team_id == active_team_id`; md/admin: company).
- Produces: `GET /api/leads?unassigned=true&skip=0&limit=50` returns `LeadListResponse` with only `assigned_to_id IS NULL`. `total` is the badge count.

- [ ] **Step 1: Write the failing tests**

```python
# backend/tests/sales/test_unassigned_pool.py
from app.models import Lead
from app.models.core.team import Team
from app.models.core.team_membership import TeamMembership
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


def _seed(db, code="U1"):
    company = create_company(db, name=f"Pool {code}", company_code=code)
    team = Team(company_id=company.id, name="Alpha")
    db.add(team)
    db.commit()
    db.refresh(team)
    manager = create_active_user(
        db, email=f"mgr@{code}.com", role="manager", company_id=company.id, team_id=team.id
    )
    sales = create_active_user(
        db, email=f"sales@{code}.com", role="sales", company_id=company.id, team_id=team.id
    )
    other = create_active_user(
        db, email=f"other@{code}.com", role="sales", company_id=company.id, team_id=team.id
    )
    md = create_active_user(
        db, email=f"md@{code}.com", role="md", company_id=company.id
    )
    db.add_all([
        TeamMembership(company_id=company.id, team_id=team.id, user_id=manager.id),
        TeamMembership(company_id=company.id, team_id=team.id, user_id=sales.id),
        TeamMembership(company_id=company.id, team_id=team.id, user_id=other.id),
    ])
    open_lead = Lead(company_id=company.id, name="Open", status="Active", team_id=team.id, assigned_to_id=None)
    mine = Lead(company_id=company.id, name="Mine", status="Active", team_id=team.id, assigned_to_id=sales.id)
    db.add_all([open_lead, mine])
    db.commit()
    db.refresh(open_lead)
    return company, team, manager, sales, md, open_lead


def test_sales_unassigned_filter_hides_owned(client, db):
    _, team, _, sales, _, open_lead = _seed(db, "US")
    login_user(client, sales.email)
    resp = client.get("/api/leads", params={"unassigned": "true"}, headers={"X-Team-Id": str(team.id)})
    assert resp.status_code == 200
    ids = [row["id"] for row in resp.json()["items"]]
    assert open_lead.id in ids
    assert all(row["assigned_to_id"] is None for row in resp.json()["items"])
    assert resp.json()["total"] >= 1


def test_manager_sees_team_open_leads(client, db):
    _, team, manager, _, _, open_lead = _seed(db, "UM")
    login_user(client, manager.email)
    resp = client.get("/api/leads", params={"unassigned": "true"}, headers={"X-Team-Id": str(team.id)})
    assert resp.status_code == 200
    ids = [row["id"] for row in resp.json()["items"]]
    assert open_lead.id in ids


def test_md_sees_company_open_leads(client, db):
    _, _, _, _, md, open_lead = _seed(db, "UD")
    login_user(client, md.email)
    resp = client.get("/api/leads", params={"unassigned": "true"})
    assert resp.status_code == 200
    ids = [row["id"] for row in resp.json()["items"]]
    assert open_lead.id in ids


def test_purchase_unassigned_is_empty_or_forbidden(client, db):
    company, _, _, _, _, _ = _seed(db, "UP")
    purchase = create_active_user(db, email="buy@up.com", role="purchase", company_id=company.id)
    login_user(client, purchase.email)
    resp = client.get("/api/leads", params={"unassigned": "true"})
    assert resp.status_code in (200, 403)
    if resp.status_code == 200:
        assert resp.json()["items"] == [] or resp.json()["total"] == 0
```

- [ ] **Step 2: Run tests — expect fail** (no `unassigned` query, owned leads still returned)

```bash
cd backend && python -m pytest tests/sales/test_unassigned_pool.py -v
```

Expected: FAIL (`unassigned` ignored or items include `"Mine"`).

- [ ] **Step 3: Implement the filter** in `list_leads` after role scoping, before status/search:

```python
unassigned: bool = Query(False),
# ...
if unassigned:
    query = query.filter(Lead.assigned_to_id.is_(None))
```

Do not change `claim_lead`. Sales still claims via `POST /api/leads/{id}/claim`. Manager/MD still assign via `PUT /api/leads/{id}` `{ "assigned_to_id": n }`.

- [ ] **Step 4: Re-run tests — expect pass**

```bash
cd backend && python -m pytest tests/sales/test_unassigned_pool.py -v
```

---

### Task 2: Unassigned Pool UI on sales, manager, MD

**Files:**
- Create: `frontend/components/leads/UnassignedPoolPage.jsx`
- Create: `frontend/app/sales/leads/unassigned/page.jsx`
- Create: `frontend/app/manager/leads/unassigned/page.jsx`
- Create: `frontend/app/md/leads/unassigned/page.jsx`
- Modify: `frontend/lib/objectPaths.cjs`
- Modify: `frontend/components/Sidebar.jsx` (sales/manager/md only)
- Modify: `frontend/lib/i18n/hi.cjs`

**Interfaces:**
- Consumes: `GET /api/leads?unassigned=true&limit=100` (`items`, `total`); `POST /api/leads/{id}/claim` (sales); `PUT /api/leads/{id}` `{assigned_to_id}` (manager/md); `GET /api/leads/team-members` (already returns `{ members: [{id, full_name, email}] }`). Today that endpoint 403s if a non-manager passes `team_id`. In this task, allow `md` to pass `team_id` or, with no team, list company sales execs (`User.role == "sales"`, company scoped). Sales does not call it.
- Produces: pages at `/sales/leads/unassigned`, `/manager/leads/unassigned`, `/md/leads/unassigned`. Sidebar label `Unassigned Pool` with `total` badge.

- [ ] **Step 1: Path helpers** in `frontend/lib/objectPaths.cjs`:

```javascript
function unassignedLeadsPath(pathname = "") {
  const prefix = rolePrefix(pathname);
  if (prefix === "/purchase" || prefix === "/admin") return "/sales/leads/unassigned";
  return `${prefix}/leads/unassigned`;
}
```

Export it. Re-export from `frontend/lib/leadsPaths.js` if that is the public import.

- [ ] **Step 2: Shared page** `UnassignedPoolPage.jsx`

Layout (Ledger Desk):
- Title `Unassigned Pool`, subtitle `Leads with no owner`
- KPI: one card, `total` from the API
- Rows: name, phone, source, created, team (if present)
- Sales: button `Claim` → `POST /leads/${id}/claim` → toast → refresh; row links to `/sales/leads/${id}`
- Manager: `<select>` of team members + `Assign` → `PUT /leads/${id}` `{ assigned_to_id }` → `/manager/leads/${id}`
- MD: same assign, company visible set, link `/md/leads/${id}`
- States: loading spinner, error + Retry, empty “Pool is clear”

Use `useAuth().user.role` and `leadsHomePath(pathname)` for links. `api` from `services/api` (already sends `X-Team-Id`).

- [ ] **Step 3: Thin role pages** (same pattern as trash):

```jsx
'use client';
export { default } from '../../../../components/leads/UnassignedPoolPage';
```

Three files under `sales`, `manager`, `md`.

- [ ] **Step 4: Sidebar** — after Leads, only in `ROLE_NAVIGATION.sales`, `.manager`, `.md`:

```javascript
{ name: 'Unassigned Pool', href: '/sales/leads/unassigned', icon: 'Users' },
```

Manager href `/manager/leads/unassigned`, MD `/md/leads/unassigned`. Do not add to admin or purchase.

Badge: on mount, if nav includes Unassigned Pool, `GET /leads?unassigned=true&limit=1` and show `total` when `> 0` (same pill style as existing custom-module badges; if none exist, a `text-[11px]` count in a rounded `bg-accent-subtle text-accent` chip).

- [ ] **Step 5: Hindi keys**

```javascript
"Unassigned Pool": "असाइन नहीं",
"Claim": "क्लेम",
"Assign": "असाइन",
"Pool is clear": "पूल खाली है",
```

- [ ] **Step 6: Manual check** — sales sees only open leads and Claim works; manager Assign works; purchase sidebar has no item. Playwright: extend `frontend-smoke.spec.js` so sales/manager/md `goto` the unassigned path and assert heading `Unassigned Pool` and no “unable to load”.

---

### Task 3: Meetings row-scope + summary

**Files:**
- Modify: `backend/app/routers/sales/meetings.py`
- Test: `backend/tests/sales/test_meetings_row_scope.py`

**Interfaces:**
- Consumes: `Meeting` (`starts_at`, `status` in `scheduled|completed|cancelled`, `created_by_id`, `lead_id`), `Lead.team_id` / `Lead.assigned_to_id`.
- Produces:
  - `GET /api/meetings` still `{ items, total }` but **row-scoped**
  - `GET /api/meetings/summary` → `{ today, upcoming, overdue, completed_week, cancelled_week, total_scheduled }`
  - Optional query on list: `bucket=today|upcoming|overdue|completed|cancelled` (overdue = `status==scheduled AND starts_at < now`)

Row-scope rules for **list and summary**:
- `sales`: `Meeting.created_by_id == current_user.id` OR `Lead.assigned_to_id == current_user.id` (outerjoin Lead)
- `manager`: `Lead.team_id == active_team_id` OR (`Meeting.created_by_id` in the active team’s member ids). If `active_team_id` is None, return empty.
- `md` / company `admin`: company scope (existing `apply_company_scope`)
- `purchase`: 403

Register `GET /meetings/summary` **before** `GET /{meeting_id:int}` so `"summary"` is not parsed as an id. Path converters already use `{meeting_id:int}` — still put summary first.

- [ ] **Step 1: Failing tests**

```python
# backend/tests/sales/test_meetings_row_scope.py
from datetime import datetime, timedelta, timezone

from app.models import Lead
from app.models.core.team import Team
from app.models.core.team_membership import TeamMembership
from app.models.sales.meeting import Meeting
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


def test_sales_does_not_see_other_exec_meeting(client, db):
    company = create_company(db, name="Meet Co", company_code="MT1")
    team = Team(company_id=company.id, name="A")
    db.add(team)
    db.commit()
    db.refresh(team)
    a = create_active_user(db, email="a@mt1.com", role="sales", company_id=company.id, team_id=team.id)
    b = create_active_user(db, email="b@mt1.com", role="sales", company_id=company.id, team_id=team.id)
    db.add_all([
        TeamMembership(company_id=company.id, team_id=team.id, user_id=a.id),
        TeamMembership(company_id=company.id, team_id=team.id, user_id=b.id),
    ])
    lead_b = Lead(company_id=company.id, name="B Lead", status="Active", team_id=team.id, assigned_to_id=b.id)
    db.add(lead_b)
    db.commit()
    db.refresh(lead_b)
    m = Meeting(
        company_id=company.id,
        subject="B only",
        starts_at=datetime.now(timezone.utc) + timedelta(days=1),
        status="scheduled",
        lead_id=lead_b.id,
        created_by_id=b.id,
    )
    db.add(m)
    db.commit()
    login_user(client, a.email)
    listed = client.get("/api/meetings", headers={"X-Team-Id": str(team.id)})
    assert listed.status_code == 200
    assert all(row["subject"] != "B only" for row in listed.json()["items"])


def test_summary_counts_overdue(client, db):
    company = create_company(db, name="Sum Co", company_code="MT2")
    md = create_active_user(db, email="md@mt2.com", role="md", company_id=company.id)
    lead = Lead(company_id=company.id, name="L", status="Active")
    db.add(lead)
    db.commit()
    db.refresh(lead)
    db.add(Meeting(
        company_id=company.id,
        subject="Past",
        starts_at=datetime.now(timezone.utc) - timedelta(days=2),
        status="scheduled",
        lead_id=lead.id,
        created_by_id=md.id,
    ))
    db.commit()
    login_user(client, md.email)
    resp = client.get("/api/meetings/summary")
    assert resp.status_code == 200
    body = resp.json()
    assert body["overdue"] >= 1
    assert "today" in body and "upcoming" in body and "total_scheduled" in body
```

- [ ] **Step 2: Run — expect fail** (`sales` currently sees company-wide meetings; `/summary` 404)

```bash
cd backend && python -m pytest tests/sales/test_meetings_row_scope.py -v
```

- [ ] **Step 3: Implement** `_scoped_meetings_query(db, current_user, active_team_id)` and use it in `list_meetings`. Add `summary` that computes buckets in Python or SQL from the same query. `today` = scheduled and `starts_at` date == UTC today; `upcoming` = scheduled and `starts_at` > now; `overdue` = scheduled and `starts_at` < now; `completed_week` / `cancelled_week` = status in last 7 days; `total_scheduled` = status scheduled.

- [ ] **Step 4: Re-run — expect pass.** Also re-run `tests/sales/test_meetings_calls_api.py` so the admin roundtrip still works.

---

### Task 4: Appointments UI on sales, manager, MD

**Files:**
- Create: `frontend/components/appointments/AppointmentsPage.jsx`
- Create: role pages under `frontend/app/{sales,manager,md}/appointments/page.jsx`
- Modify: `Sidebar.jsx`, `objectPaths.cjs`, `hi.cjs`, e2e smokes

**Interfaces:**
- Consumes: `GET /api/meetings/summary`, `GET /api/meetings?skip&limit&status&bucket`, `POST /api/meetings`, `PATCH /api/meetings/{id}`
- Produces: `/sales/appointments`, `/manager/appointments`, `/md/appointments`

- [ ] **Step 1: Path helper** `appointmentsHomePath(pathname)` → `${prefix}/appointments` for sales/manager/md.

- [ ] **Step 2: Shared page** — header “Appointments”, primary `+ New Appointment` opening a small form (subject, starts_at datetime-local, lead_id optional via search or numeric, location). KPI strip from summary: Today, Upcoming, Overdue, Completed (week), Cancelled (week), Total scheduled. Chip filters: All / Today / Upcoming / Overdue / Completed. Rows: subject, status pill, starts_at, linked lead name if `lead_id` (fetch lead names in one go or include `lead_name` in serialize — **add `lead_name` to `_serialize`** by loading Lead when `lead_id` set; cheaper than N+1: join in list). Actions: Complete (`PATCH status=completed`), Cancel (`PATCH status=cancelled`). Empty/error/loading.

v1 is **list only**. No Calendar toggle.

- [ ] **Step 3: Thin role re-exports** + sidebar under Workspace (near Follow-ups for sales; after Tasks for manager; after Leads for md). Badge = `summary.overdue` when > 0.

- [ ] **Step 4: Hindi**

```javascript
Appointments: "अपॉइंटमेंट",
"New Appointment": "नया अपॉइंटमेंट",
Today: "आज",
Upcoming: "आगामी",
Overdue: "ओवरड्यू",
```

- [ ] **Step 5: Smoke** — sales/manager/md open `/<role>/appointments`, heading visible, no load error. Purchase must not have the nav item.

---

### Task 5: WhatsApp threads inbox API

**Files:**
- Modify: `backend/app/routers/sales/whatsapp.py`
- Test: `backend/tests/sales/test_whatsapp_threads.py`

**Interfaces:**
- Consumes: `WhatsAppMessage` grouped by `lead_id` (fallback `client_id` then `to_phone`)
- Produces: `GET /api/whatsapp/threads?unanswered=false&skip=0&limit=50` →

```json
{
  "items": [
    {
      "lead_id": 1,
      "client_id": null,
      "name": "Ravi",
      "phone": "999",
      "last_direction": "inbound",
      "last_body": "hello",
      "last_at": "2026-09-21T10:00:00+00:00",
      "unanswered": true
    }
  ],
  "total": 1
}
```

`unanswered=true` keeps threads whose latest message `direction == inbound`.

Row-scope via the related Lead (same rules as Task 3). Threads with only `client_id` follow Client assignment if present; phone-only (no lead/client) visible to md/admin only.

Purchase: 403.

- [ ] **Step 1: Failing tests** — two sales users; inbound on B’s lead; A’s `GET /whatsapp/threads` omits it; B sees `unanswered: true`. MD sees both companies’? No — same company only. Second company inbound must 404/omit.

- [ ] **Step 2: Run — expect 404 on `/api/whatsapp/threads`.**

- [ ] **Step 3: Implement** `list_threads` using a subquery `max(id)` per `lead_id` (and separately per `client_id` where `lead_id IS NULL`). Join Lead for name/phone/scope. Do not add a `read` column in v1.

- [ ] **Step 4: Pass** `tests/sales/test_whatsapp_threads.py` and existing `test_whatsapp_api.py`.

---

### Task 6: Conversations UI on sales, manager, MD

**Files:**
- Create: `frontend/components/conversations/ConversationsPage.jsx`
- Create: role pages `frontend/app/{sales,manager,md}/conversations/page.jsx`
- Modify: Sidebar, paths, i18n, e2e
- Reuse: `frontend/components/leads/LeadWhatsAppPanel.jsx`

**Interfaces:**
- Consumes: `GET /api/whatsapp/threads`, existing send endpoints inside `LeadWhatsAppPanel`
- Produces: `/sales/conversations`, `/manager/conversations`, `/md/conversations`

- [ ] **Step 1: Shared page** — two columns on `lg`: left thread list (name, last body truncated, time, inbound pill if `unanswered`), chip `Unanswered` vs `All`; right pane renders `LeadWhatsAppPanel` for the selected `lead_id`. Empty: “No conversations yet”. If thread has only `client_id`, link to client WhatsApp panel if one exists; otherwise show a read-only message list via `GET /whatsapp/messages?client_id=`.

- [ ] **Step 2: Role re-exports + sidebar** after Follow-ups/Tasks (Workspace). Badge = unanswered total from `GET /whatsapp/threads?unanswered=true&limit=1`.

- [ ] **Step 3: Hindi** `Conversations: "बातचीत"`, `Unanswered: "जवाब बाकी"`.

- [ ] **Step 4: Smoke** for three roles. Confirm Auto WhatsApp is **not** a new nav item (cadence stays in `/settings/whatsapp`).

Do not add `/conversations` to `SHARED_PATHS` unless RouteGuard is changed; role-prefixed routes already work.

---

### Task 7: Email templates (the only extra page)

**Why this and not others:** Settings screenshot has Email Templates; we write campaign bodies from scratch and WhatsApp already has templates. Integrations hub, Schedules-as-module, Notifications-as-page, Lead Stages tile, and Manager review are not new products.

**Files:**
- Create: `backend/app/models/sales/email_template.py`
- Create: Alembic `backend/alembic/versions/<next>_email_templates.py`
- Create: `backend/app/routers/sales/email_templates.py` mounted at `/api/email-templates`
- Create: `backend/tests/sales/test_email_templates.py`
- Create: `frontend/app/settings/email-templates/page.jsx`
- Modify: `frontend/app/settings/page.jsx`, `frontend/app/campaigns/page.jsx` (optional: “Insert template” select)

Schema: `id`, `company_id`, `name`, `subject`, `body`, `created_by_id`, `created_at`. Company scoped.

Auth: `GET` any logged-in company user; `POST/PATCH/DELETE` `admin` or `md` (`require_admin_or_md`).

- [ ] **Step 1: Failing tests** — sales GET 200 empty; sales POST 403; admin POST 201; other-company GET omits the row.

- [ ] **Step 2: Model + migration + router + wire in `backend/app/main.py`.**

- [ ] **Step 3: Settings page** (shared `/settings` already in `SHARED_PATHS`) — list, create name/subject/body, delete. Tile on `/settings` for everyone; mutate controls hidden unless `admin|md`.

- [ ] **Step 4: Campaigns** — if `selected` campaign body is empty, a `<select>` of templates fills subject+body. Do not auto-send.

Skip if blocked on migration numbering — read latest Alembic revision first and set `down_revision` correctly. Never guess the head.

---

### Task 8: Cross-role QA and smokes

**Files:**
- Modify: `frontend/e2e/frontend-smoke.spec.js`
- Modify: `frontend/e2e/local-smoke.spec.js`

- [ ] **Step 1: Smoke cases**

```javascript
test('sales: unassigned, appointments, conversations load', async ({ page }) => {
  await login(page, USERS.sales);
  for (const path of ['/sales/leads/unassigned', '/sales/appointments', '/sales/conversations']) {
    await page.goto(path);
    await expect(page.getByText(/unable to load|please retry/i)).toHaveCount(0);
  }
});
```

Repeat for `manager` and `md` with their prefixes.

- [ ] **Step 2: Purchase must not see the three labels** — after login as purchase, assert `getByRole('link', { name: 'Unassigned Pool' })` count 0 (and Appointments, Conversations).

- [ ] **Step 3: Backend suite**

```bash
cd backend && python -m pytest tests/sales/test_unassigned_pool.py tests/sales/test_meetings_row_scope.py tests/sales/test_meetings_calls_api.py tests/sales/test_whatsapp_threads.py tests/sales/test_whatsapp_api.py tests/sales/test_email_templates.py -v
```

- [ ] **Step 4: Browser** — if the app is running, click the three pages as sales, manager, and MD: claim, assign, create appointment, open a WhatsApp thread. If browser tools are unavailable, say untested in the browser and rely on pytest + Playwright.

---

## Out of scope (do not implement in this plan)

- Time & Pay, Carvinos, Partner Stores, Sold Cars, BDC Export, Team touch & close, stips, Trust Score, SSN/DL, Meta Lead Ads, Google Sheets live sync, PWA install
- Integrations catalog page
- Appointments calendar toggle / Schedules module
- Notifications full-page inbox (dropdown stays)
- Follow-ups nav on manager/MD (sales already has it)
- Click-to-call in the top bar (Exotel stays on the record)
- ⌘K command palette
- New `MeetingStatus.no_show`

## Implementation order

1. Unassigned API + UI (smallest, claim already exists)  
2. Appointments API scope + UI (meetings CRUD exists)  
3. Conversations threads + UI (messages exist, inbox does not)  
4. Email templates  
5. Smokes  

Each phase is shippable alone.

## Spec coverage check

| Requirement | Task |
|---|---|
| Unassigned on sales/manager/md | 1–2 |
| Not on admin/purchase | 2, 8 |
| Appointments list + KPIs | 3–4 |
| Meetings not company-wide for sales | 3 |
| Conversations WhatsApp inbox | 5–6 |
| Email templates extra page | 7 |
| No dealership clone | Out of scope |
| Ledger Desk UI | 2, 4, 6, 7 |
| E2E + pytest | 8 |
