# Territory Assignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route new unassigned leads to a team via territory rules on `service_type`/`source`, then round-robin sales on that team; fallback to existing workflow RR when no match.

**Architecture:** `territories` + `territory_rules` tables; `assign_lead_by_territory` before `run_workflows` on lead create (API + public form); shared `round_robin_sales_on_team` used by territory + workflow; admin/MD CRUD + settings UI.

**Tech Stack:** FastAPI, SQLAlchemy, Next.js, axios, Tailwind. pytest + TestClient.

**Spec:** [docs/superpowers/specs/2026-08-25-phase4-territory-assignment-design.md](../specs/2026-08-25-phase4-territory-assignment-design.md)

## Global Constraints

- No new pip deps. No Alembic. New tables via models + `create_all` (export from `app.models.sales`).
- Never take `company_id` from body. Cross-tenant by-id → **404**. Bad field/value/team → **400**.
- Writes: admin/md only. GET list: any authenticated company user.
- Match: exact case-insensitive trim; OR rules; priority then id.
- Call territory assign **before** `run_workflows` on create paths only.
- Test password `"pw"`. Reset `auth_limiter._buckets.clear()`.
- pytest via `backend/.venv/bin/pytest`. `git add` only task files.

### File map

| File | Responsibility |
|---|---|
| `backend/app/models/sales/territory.py` | Territory, TerritoryRule |
| `backend/app/models/sales/__init__.py` | export models |
| `backend/app/services/sales/territory.py` | match + assign |
| `backend/app/services/sales/workflow.py` | use shared RR helper |
| `backend/app/routers/sales/territories.py` | CRUD API |
| `backend/app/routers/sales/leads.py` | call assign before workflows |
| `backend/app/routers/public/lead_forms.py` | same |
| `backend/app/main.py` | include router |
| `frontend/app/settings/territories/page.jsx` | UI |
| `frontend/components/Sidebar.jsx` | nav link |
| `docs/IMPLEMENTATION_PLAN.md` | Phase 4.5 log |

---

### Task 1: Schema

**Files:** Create `territory.py`; modify `sales/__init__.py`; Test `tests/sales/test_territory_schema.py`

- [ ] **Step 1: Failing test** — tables `territories`, `territory_rules` exist with expected columns; can persist territory+rule.

- [ ] **Step 2: RED**

- [ ] **Step 3: Models** per spec (cascade rules on territory delete via `relationship(..., cascade="all, delete-orphan")` + FK `ondelete="CASCADE"` if DB supports it).

- [ ] **Step 4: GREEN**

- [ ] **Step 5: Commit** `feat(territory): add territories and territory_rules tables`

---

### Task 2: Assignment service + shared RR

**Files:** Create `services/sales/territory.py`; modify `workflow.py`; Test `tests/sales/test_territory_service.py`

**Produces:**

```python
MATCH_FIELDS = frozenset({"service_type", "source"})

def round_robin_sales_on_team(db, *, company_id: int, team_id: int) -> int | None:
    """Return user_id with lowest lead load among active sales on team, or None."""

def assign_lead_by_territory(db, lead) -> None: ...
```

Refactor `_assign_round_robin` to set `team_id` filter then call `round_robin_sales_on_team` (preserve behaviour when `lead.team_id` set / unset — when unset, keep current company-wide sales RR without team filter; extract carefully so existing `test_workflows.py` still pass).

Territory path always sets team then calls RR with that team_id.

- [ ] **Step 1: Unit tests** with DB fixtures (company, team, memberships, territories) — match service_type; priority; OR; skip if assigned; no match leaves assignee None; RR picks lower-load sales.

- [ ] **Step 2–4: TDD**

- [ ] **Step 5: Commit** `feat(territory): assign leads by territory rules and shared RR`

Also run `tests/sales/test_workflows.py` before commit.

---

### Task 3: Territories API + wire create paths

**Files:** `routers/sales/territories.py`, `main.py`, `leads.py`, `public/lead_forms.py`; Test `tests/sales/test_territory_api.py`

- CRUD + rules endpoints per spec.
- `create_lead` / public form: `assign_lead_by_territory(db, lead)` then `db.flush()` then `run_workflows`.
- Note: sales role auto-assigns self on create — territory correctly no-ops; test admin/public create without assignee.

- [ ] **Step 1: API + integration tests** (create territory+rule; POST lead with service_type → team+assignee; sales 403 write; bad match_field 400)

- [ ] **Step 2–4: TDD**

- [ ] **Step 5: Commit** `feat(territory): CRUD API and assign on lead create`

---

### Task 4: Cross-tenant

**Files:** `tests/tenancy/test_territory_cross_tenant.py`

- B cannot PATCH/DELETE A's territory; B cannot add rules; A positive control.

- [ ] Commit `test(territory): prove territories are tenant-scoped`

---

### Task 5: Frontend + progress log

**Files:** `frontend/app/settings/territories/page.jsx`, Sidebar, `IMPLEMENTATION_PLAN.md`

- Admin/md page: list, create (name, team_id from `/api/teams` or existing teams endpoint — grep), priority, add/delete rules.
- Sidebar Settings → Territories for admin/md.
- Phase 4.5 DONE section.

- [ ] Verify: territory + workflow tests; `next build`
- [ ] Commit `feat(territory): settings UI and progress log`

---

## Self-review

| Spec | Task |
|---|---|
| Tables | 1 |
| assign + shared RR | 2 |
| API + create hooks | 3 |
| Cross-tenant | 4 |
| UI + plan log | 5 |

No placeholders. RR behaviour for workflow without team_id must remain company-wide sales RR.
