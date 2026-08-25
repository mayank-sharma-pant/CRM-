# Phase 5.3 — Predictive AI (convert / churn) (design)

> Companion to [IMPLEMENTATION_PLAN.md](../../IMPLEMENTATION_PLAN.md) Phase 5.3.

## Problem

HubSpot/Zoho sell "predictive" deal win-probability and churn risk. We have
rule-based scoring (5.2) but nothing that *learns* from outcomes. 5.3 adds a
per-company trained convert model and a derived churn-risk model — **stdlib
only, no ML dependency**.

## The learnable/derived split (locked)

- **Convert = trained.** Deals carry explicit WON/LOST outcomes, so a per-company
  model learns win patterns from that company's own closed deals.
- **Churn = derived.** No churn label exists in the schema; churn is an RFM
  recency/cadence risk score over a client's invoices — deterministic, **not**
  presented as "trained".

## Decisions (locked)

1. **Scope** — v0 ships two model kinds: `deal_convert` (trained) and
   `client_churn` (derived). **No** lead-convert model in v0 (leads have 5.2
   scoring; deal win-probability is the convert signal). Same engine extends to
   leads later.

2. **Convert model = log-odds scorecard (Naive-Bayes style)**, not
   gradient-descent logistic regression. Realises the "trained per-company,
   transparent weights, base-rate fallback" contract; chosen over GD-LR for
   robustness on tiny/imbalanced per-tenant data (no learning-rate/scaling/
   divergence). Pure stdlib.

3. **Convert training data** — the company's **closed** deals: stage
   `stage_type` in (WON, LOST). Label `y = 1` if WON else `0`. Deals still open
   are excluded from training.

4. **Convert features** (chosen to avoid outcome leakage — a closed deal's
   current stage/probability equals its outcome, so those are excluded):
   - `source` — categorical; per-value smoothed win-rate (Laplace α over the
     base rate). Unseen source at predict time → base rate contribution (neutral).
   - `amount_band` — `low`/`med`/`high` by the company's own amount terciles
     (computed at train time; thresholds stored). Each band gets a smoothed
     win-rate.
   - `has_client` — deal linked to a client (0/1); smoothed win-rate per value.
   - `has_owner` — `assigned_to_id` set (0/1); smoothed win-rate per value.

5. **Scorecard math** — log-odds additive:
   `logit = ln(base_odds) + Σ_feature [ ln(odds_featureValue) − ln(base_odds) ]`,
   `p = sigmoid(logit)`. `base_odds = base_rate/(1−base_rate)`;
   `base_rate = (wins + α·0.5)/(n + α)`. Per-feature-value odds use the same
   Laplace smoothing over the base rate. Contribution of a feature value =
   `ln(odds_value) − ln(base_odds)` (the log-odds delta shown in the "why").

6. **Cold start / fallback** — if `n_closed < 10` **or** only one class present,
   the model is not fit; `predict` returns `{probability: base_rate_or_0.5,
   model: "fallback", ...}` with no per-feature factors. A fitted model returns
   `model: "trained"`.

7. **Convert storage** — `prediction_models` table: `id, company_id, kind,
   trained_at, sample_count, base_rate, params (JSON text), version`. One row per
   `(company_id, kind)` (latest wins; retrain overwrites). Params JSON holds the
   smoothed odds per feature-value + amount-band thresholds. **Prediction is
   computed live** by loading the row and applying the scorecard — no stored
   column on `deals`, no write hooks.

8. **Lazy train** — `GET /api/deals/{id}/prediction` trains + stores the model if
   none exists for the company (best-effort; a train failure falls back to base
   rate, never 500s the read).

9. **Churn model (clients)** — derived, stateless. Over a client's `invoices`
   (all statuses; `created_at` as the event time, `paid_date` preferred when set):
   - `days_since_last_invoice` (recency).
   - `typical_interval_days` — median gap between the client's consecutive
     invoices (needs ≥ 2 invoices).
   - `cadence_gap = days_since_last_invoice / typical_interval_days`.
   - **Risk** = a bounded function of `cadence_gap` (≥1 invoice pair) or of raw
     recency vs a 90-day default (single invoice): `risk ∈ [0,1]`, band
     `low < 0.4 ≤ med < 0.7 ≤ high`. Clients with **0** invoices are not churn
     subjects (404-style "not a customer" → excluded from the list, and the
     detail endpoint returns `{risk: null, reason: "no invoices"}`).
   - Output: `{risk, band, days_since_last_invoice, typical_interval_days,
     invoice_count, reasons: [str]}`.

10. **API** — new router `app/routers/sales/predictions.py`, prefix
    `/api/predictions`, plus two detail routes on existing routers:
    - `POST /api/predictions/train` `{kind:"deal_convert"}` — admin/MD; trains +
      stores; returns `{sample_count, base_rate, model, weights}`.
    - `GET /api/predictions/models` — admin/MD; stored model metadata.
    - `GET /api/predictions/churn?band=` — ranked at-risk clients (desc risk),
      any company user.
    - `GET /api/deals/{id}/prediction` (on deals router) — win prob + factors.
    - `GET /api/clients/{id}/churn` (on clients router) — churn detail.
    - All company-scoped; foreign id → 404; positive-control tenancy tests.

11. **Tenancy / privacy** — `prediction_models` has `company_id` (RLS auto-covers).
    Params JSON is aggregate stats + source *names* (not PII). Churn reads
    already-scoped clients/invoices. No new PII, no export/erase change.

12. **Migration** — model imported in `app/models/sales/__init__.py`
    (`create_all`); no new columns on existing tables; Alembic `020_predictions`
    (down_revision `019_scoring`) calling `apply_schema`. Deploy: `alembic
    upgrade head` and/or `python create_missing_tables.py`.

13. **UI** — `/settings/predictions` (model status, "Train now", learned weights;
    admin/MD); `PredictionBadge` (win prob + factors) on deal detail;
    `ChurnBadge` (risk + reasons) on client detail; at-risk clients list on the
    predictions page.

## Non-goals

Neural nets / external ML / LLM; gradient-descent LR; live retrain scheduler;
lead-convert model; deal win-probability stored column or list sort; churn label
backfill; account-level (vs client) churn; time-series forecasting.

## Verification

- `tests/sales/test_predict_scorecard.py` — pure model: fit on a labelled set,
  monotonic sanity (a source with all-wins raises prob), fallback on thin/single
  -class data, sigmoid bounds, contribution signs.
- `tests/sales/test_predict_churn.py` — pure churn: recency/cadence bands, single
  -invoice path, zero-invoice excluded.
- `tests/sales/test_predictions_api.py` — train, models list, deal prediction
  (trained + lazy fallback), churn detail + list, role gating (sales cannot train).
- `tests/sales/test_predictions_cross_tenant.py` — foreign deal/client/model →
  404, each with a positive control.
- `frontend` build clean; `/settings/predictions` reachable for admin/md only.
