# Phase 7.10 — Deal / discount approvals Implementation Plan

**Goal:** Gate large deal closes and discounted quotes behind admin/MD approval thresholds.

**Spec:** [`docs/superpowers/specs/2026-08-26-phase7-deal-discount-approvals-design.md`](../specs/2026-08-26-phase7-deal-discount-approvals-design.md)

## Tasks

1. Settings columns + `GET/PUT /api/settings/approvals`
2. `approval_status` on deals/quotes; `app/services/sales/approvals.py`
3. Wire deal create/update/stage won|lost; quote create/accept
4. `GET /api/approvals/pending`; `POST /deals|quotes/{id}/approve`
5. Tests + settings/deal detail UI
6. Alembic `034_deal_discount_approvals`
