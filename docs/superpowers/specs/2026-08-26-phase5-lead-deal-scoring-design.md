# Phase 5.2 — Lead / deal scoring (design)

> Companion to [IMPLEMENTATION_PLAN.md](../../IMPLEMENTATION_PLAN.md) Phase 5.2.

## Problem

HubSpot/Zoho/Freshsales let a company define scoring rules ("source = Referral
→ +20", "no contact in 30 days → −15") so sales sees hot records first. We have
no scoring. 5.2 is the **deterministic, admin-configurable** version; the ML /
predictive win-probability path is explicitly **5.3** and out of scope here.

## Decisions (locked)

1. **Scope** — both leads and deals, one shared engine, two `entity_type` values
   (`lead`, `deal`).

2. **Rules are admin-configurable** — company admin/MD create rows in a new
   `scoring_rules` table; no hardcoded formula. Sales/manager cannot edit rules.

3. **`scoring_rules` columns** — `id, company_id, entity_type, field, operator,
   value, points, is_active, created_at`. `points` is a signed integer (rules
   may subtract). `value` is stored as text and coerced per field type at eval.

4. **Operators** — `eq, ne, in, gt, gte, lt, lte, is_set, is_empty`. `in` splits
   `value` on commas. `is_set` / `is_empty` ignore `value`.

5. **Field whitelist** — rules may only reference these fields; an unknown field
   is rejected at rule-create with 400.
   - **Leads:** `source, industry, status, email, phone, website,
     days_since_last_contact*, age_days*`
   - **Deals:** `amount, stage_id, probability, days_to_expected_close*, age_days*`
   - `*` = **computed** at eval time (see §6), not a raw column.
   - String fields (`source, industry, status`) support `eq, ne, in, is_set,
     is_empty`. Presence fields (`email, phone, website`) support `is_set,
     is_empty`. Numeric/computed fields support `gt, gte, lt, lte, eq, ne`.
     Operator not valid for the field → 400.

6. **Computed fields** (evaluated from timestamps, `now` = UTC now):
   - `days_since_last_contact` — `(now − leads.last_contacted_at).days`; if
     `last_contacted_at` is NULL, treat as a large sentinel (`10**6`) so
     "no contact in N days" rules still fire.
   - `age_days` — `(now − created_at).days`.
   - `days_to_expected_close` — `(deals.expected_close − today).days`; NULL
     `expected_close` → sentinel `10**6`.

7. **Engine** — pure function `score_entity(entity, rules) -> (total, breakdown)`
   in a new `app/services/scoring/engine.py`. No DB access, no I/O.
   `breakdown` = `[{rule_id, field, operator, value, points, matched}]`. `total`
   = sum of `points` over matched **active** rules; may be negative. A rule whose
   field/operator/coercion raises is treated as **not matched** (never crashes a
   recompute) — engine is total.

8. **Stored score** — add `score` (INTEGER, nullable) and `score_updated_at`
   (TIMESTAMP) to `leads` and `deals`, so list endpoints can sort/filter without
   re-evaluating every row. `score` NULL = never computed.

9. **Recompute triggers** (no worker/queue — matches reminders/webhooks pattern):
   - **(a)** On lead create + update, and deal create + update, recompute that
     one row's stored `score` + `score_updated_at`. Wrapped so a scoring failure
     never fails the underlying write.
   - **(b)** On any `scoring_rules` create/update/delete, recompute **all** rows
     of that `entity_type` for the company (synchronous, batched).
   - **(c)** `POST /api/scoring/recompute {entity_type}` — admin/MD, bulk
     recompute all rows of that type for the company. Idempotent.
   - Recency drift between recomputes is accepted: stored score is "as of
     `score_updated_at`". Documented residual (no scheduler).

10. **API** — new router `app/routers/sales/scoring.py`:
    - `GET /api/scoring/rules?entity_type=` — list company rules.
    - `POST /api/scoring/rules` — admin/MD; validates field+operator whitelist.
    - `PUT /api/scoring/rules/{id}`, `DELETE /api/scoring/rules/{id}` — admin/MD,
      company-scoped (foreign id → 404). Mutation triggers §9(b).
    - `POST /api/scoring/recompute` — admin/MD, §9(c).
    - `GET /api/leads/{id}/score`, `GET /api/deals/{id}/score` — any company
      user; returns `{score, score_updated_at, breakdown}` computed **live**
      against current rules (does not persist).
    - Lead + deal **list** payloads gain `score`; lists accept `sort=score`
      (desc) and `min_score=<int>`.

11. **Cross-tenant** — `scoring_rules` scoped by `company_id` on every path;
    another tenant's rule id → 404. Score endpoints reuse existing lead/deal
    company-scope (foreign id → 404). Positive-control tenancy tests required.

12. **Migration** — model imported so `create_all` builds `scoring_rules`;
    `score` / `score_updated_at` added to `MISSING_COLUMNS` in
    `app/schema_sync.py`; new Alembic `018_scoring` (down_revision
    `017_enrichment`) calling `apply_schema`. Deploy: `alembic upgrade head`
    and/or `python create_missing_tables.py`.

13. **Privacy** — `score` is derived, not PII, but for consistency with 5.1 the
    lead export includes `score`; lead erase nulls `score` + `score_updated_at`.

14. **UI** — `/settings/scoring` rule CRUD (mirrors `/settings/territories`,
    admin/MD sidebar entry); score badge + expandable breakdown on lead detail
    and deal detail.

## Non-goals

ML / predictive win-probability (**5.3**), automatic daily decay/recompute
scheduler, score-change as a workflow trigger, custom-field-based rules, score
history/audit timeline, per-user or team score weighting, negative-clamping
(scores may go below zero by design).

## Verification

- `tests/sales/test_scoring_engine.py` — pure engine: each operator, computed
  fields, NULL sentinels, negative totals, unknown-field-not-crash.
- `tests/sales/test_scoring_api.py` — rule CRUD, whitelist 400s, recompute,
  `GET score` breakdown, list sort/filter, role gating (sales cannot mutate).
- `tests/sales/test_scoring_cross_tenant.py` — foreign rule/lead/deal → 404,
  each with a positive control.
- `frontend` build clean; `/settings/scoring` reachable for admin/md only.
