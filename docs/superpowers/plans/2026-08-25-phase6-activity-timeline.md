# Phase 6.4 — Unified activity timeline (plan)

1. Tests: `backend/tests/sales/test_activity_timeline.py` (union, deal email, 400, 404).
2. Service: `backend/app/services/sales/activity_timeline.py`.
3. Router: extend `GET /api/timeline/{entity_type}/{entity_id}` for lead/client/deal; keep audit-only for invoice/task/user.
4. UI: `ActivityFeed`; hide compose-panel history lists on lead + deal.
5. Mark 6.4 DONE in IMPLEMENTATION_PLAN.md.
