# Phase 7.8 — Next-activity nag Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Open deals require a next task/meeting before forward stage moves; rotting view uses last timeline touch; due-today email nag.

**Architecture:** `tasks.deal_id` FK; `deal_next_activity` service (detection, rotting subquery, serialize enrich); stage-move gate in deals router; extend `run_due_reminders`; board/detail UI badges.

**Tech Stack:** FastAPI, SQLAlchemy, Alembic, Next.js.

**Spec:** [`docs/superpowers/specs/2026-08-26-phase7-next-activity-design.md`](../specs/2026-08-26-phase7-next-activity-design.md)

## Global Constraints

- Next activity = earliest future incomplete task (due ≥ start of UTC day) OR scheduled meeting on deal.
- Forward stage move or won/lost → 400 if missing next activity on open deals.
- Rotting: max touch across email/call/meeting/task/audit; fallback `deals.created_at`; 14-day cutoff.
- Due email once per UTC day via `deals.due_reminded_at`; respects `task_reminders_enabled`.
- Alembic head `032_next_activity_nag` off `031_price_books`.

---

### Task 1: Schema + migration

- `tasks.deal_id`, `deals.due_reminded_at`
- Alembic `032_next_activity_nag`
- Update `test_alembic_heads.py`

### Task 2: Service + rotting + reminders

- `app/services/sales/deal_next_activity.py`
- Wire `apply_deal_view` rotting with db/company_id
- Extend `run_due_reminders` for deals due today
- Stage gate + serialize enrich in deals router
- `POST /tasks` accepts `deal_id`

### Task 3: Tests

- `tests/sales/test_deal_next_activity.py`
- Update `test_saved_filters.py` rotting semantics (backdate audit touch)

### Task 4: Frontend + docs

- `DealsBoard` — "No next step" badge
- `DealDetailPage` — quick next-task form when missing
- IMPLEMENTATION_PLAN 7.8 DONE, resume 7.9
