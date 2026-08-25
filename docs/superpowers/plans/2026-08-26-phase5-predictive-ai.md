# Predictive AI (convert / churn) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A per-company trained deal win-probability model plus a derived client churn-risk score, both stdlib-only and transparent.

**Architecture:** `deal_convert` is a log-odds scorecard (Naive-Bayes style) fit from the company's closed deals and stored as a JSON row in `prediction_models`; predictions apply the stored scorecard live. `client_churn` is a stateless RFM function over a client's invoices. Two pure engines, thin services, one router + two detail routes, and a settings page.

**Tech Stack:** FastAPI, SQLAlchemy, Pydantic, pytest (backend); Next.js/React (frontend). Pure Python math (`math` stdlib). No new pip/npm deps.

**Spec:** `docs/superpowers/specs/2026-08-26-phase5-predictive-ai-design.md`

## Global Constraints

- **No new dependencies** (pip or npm). `math`/`json`/`statistics` stdlib only — no numpy/scipy/sklearn.
- **New table** ships via `create_all` — model MUST be imported in `backend/app/models/sales/__init__.py`. No new columns on existing tables. One Alembic revision `020_predictions` (down_revision `019_scoring`) whose `upgrade()` calls `apply_schema(op.get_bind())`.
- **Alembic head is currently `019_scoring`** (verify with the ops test; if it says otherwise, chain off whatever the single head actually is and update the head assertion). Prior specs have named the head wrong before — trust `tests/ops/test_alembic_heads.py`, not memory.
- **Tenancy:** every query through `apply_company_scope`; single-row fetch + `ensure_company_access`; foreign id → **404**. RLS auto-covers tables with `company_id`.
- **Role gating:** `POST /predictions/train`, `GET /predictions/models` require `require_admin_or_md`; all reads require `get_current_user`.
- **Engines are total:** a fit/predict on degenerate data returns a `"fallback"` result, never raises. Reads never 500 on a model/training failure.
- **Repo commit convention:** work stays uncommitted on `main`; the task terminator is a green suite, not a commit. Leave committing to the user.
- **`now`** is `datetime.now(timezone.utc)`.

---

### Task 1: Model + migration

**Files:**
- Create: `backend/app/models/sales/prediction.py`
- Modify: `backend/app/models/sales/__init__.py`
- Create: `backend/alembic/versions/020_predictions.py`
- Modify: `backend/tests/ops/test_alembic_heads.py` (head assertion + new test)
- Test: `backend/tests/sales/test_prediction_schema.py`

**Interfaces:**
- Produces: `PredictionModel(id, company_id, kind, trained_at, sample_count, base_rate, params, version)` where `params` is JSON text.

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/sales/test_prediction_schema.py
from app.models.sales.prediction import PredictionModel


def test_prediction_model_columns():
    cols = {c.name for c in PredictionModel.__table__.columns}
    assert cols == {
        "id", "company_id", "kind", "trained_at",
        "sample_count", "base_rate", "params", "version",
    }


def test_prediction_model_persists(db):
    m = PredictionModel(company_id=1, kind="deal_convert", sample_count=12,
                        base_rate=0.5, params="{}", version=1)
    db.add(m)
    db.commit()
    db.refresh(m)
    assert m.id is not None
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd backend && ./.venv/bin/python -m pytest tests/sales/test_prediction_schema.py -q`
Expected: FAIL (module missing). (Use whatever venv runs the suite; the repo has `backend/.venv`.)

- [ ] **Step 3: Create the model**

```python
# backend/app/models/sales/prediction.py
from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.sql import func

from app.database import Base


class PredictionModel(Base):
    __tablename__ = "prediction_models"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    kind = Column(String(32), nullable=False, index=True)  # 'deal_convert'
    trained_at = Column(DateTime, server_default=func.now())
    sample_count = Column(Integer, nullable=False, default=0)
    base_rate = Column(Float, nullable=False, default=0.5)
    params = Column(Text, nullable=False, default="{}")
    version = Column(Integer, nullable=False, default=1)
```

- [ ] **Step 4: Register the model**

In `backend/app/models/sales/__init__.py`, after the `from .scoring import ScoringRule` line:

```python
from .prediction import PredictionModel
```

- [ ] **Step 5: Create the Alembic revision**

```python
# backend/alembic/versions/020_predictions.py
"""Apply schema after prediction_models table.

Revision ID: 020_predictions
Revises: 019_scoring
Create Date: 2026-08-26
"""
from typing import Sequence, Union

from alembic import op

revision: str = "020_predictions"
down_revision: Union[str, None] = "019_scoring"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from app.schema_sync import apply_schema

    apply_schema(op.get_bind())


def downgrade() -> None:
    pass
```

- [ ] **Step 6: Update the heads test**

In `backend/tests/ops/test_alembic_heads.py` change the head assertion to `["020_predictions"]` and add:

```python
def test_predictions_revision_follows_019():
    rev = _scripts().get_revision("020_predictions")
    assert rev is not None
    assert rev.down_revision == "019_scoring"
```

- [ ] **Step 7: Run to verify pass**

Run: `cd backend && ./.venv/bin/python -m pytest tests/sales/test_prediction_schema.py tests/ops/test_alembic_heads.py -q`
Expected: PASS.

---

### Task 2: Convert scorecard engine (pure)

**Files:**
- Create: `backend/app/services/predictions/__init__.py` (empty)
- Create: `backend/app/services/predictions/scorecard.py`
- Test: `backend/tests/sales/test_predict_scorecard.py`

**Interfaces:**
- Produces:
  - `MIN_SAMPLES = 10`
  - `def fit_scorecard(rows: list[dict]) -> dict` — `rows` items: `{"won": bool, "source": str|None, "amount": float, "has_client": bool, "has_owner": bool}`. Returns a params dict (JSON-serialisable) with `model` = `"trained"` or `"fallback"`, `base_rate`, `sample_count`, and (trained) `amount_thresholds` + `features`.
  - `def predict_scorecard(params: dict, feats: dict) -> dict` — `feats`: `{"source","amount","has_client","has_owner"}`. Returns `{"probability": float, "model": str, "base_rate": float, "factors": [{"feature","value","contribution"}]}`.
  - `def amount_band(amount: float, thresholds: list[float]) -> str`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/sales/test_predict_scorecard.py
from app.services.predictions.scorecard import fit_scorecard, predict_scorecard, MIN_SAMPLES


def _rows(n_per, source_win):
    rows = []
    for src, wins in source_win.items():
        for i in range(n_per):
            rows.append({
                "won": i < wins,
                "source": src,
                "amount": 1000.0 * (i + 1),
                "has_client": bool(i % 2),
                "has_owner": True,
            })
    return rows


def test_fallback_when_thin():
    params = fit_scorecard(_rows(2, {"A": 1}))  # 4 rows < MIN_SAMPLES
    assert params["model"] == "fallback"
    out = predict_scorecard(params, {"source": "A", "amount": 500, "has_client": True, "has_owner": True})
    assert 0.0 <= out["probability"] <= 1.0
    assert out["model"] == "fallback"
    assert out["factors"] == []


def test_fallback_single_class():
    rows = _rows(20, {"A": 20})  # all won -> single class
    assert fit_scorecard(rows)["model"] == "fallback"


def test_trained_ranks_winning_source_higher():
    # A wins 8/10, B wins 2/10 -> plenty of samples, both classes present
    rows = _rows(10, {"A": 8, "B": 2})
    params = fit_scorecard(rows)
    assert params["model"] == "trained"
    pa = predict_scorecard(params, {"source": "A", "amount": 5000, "has_client": True, "has_owner": True})
    pb = predict_scorecard(params, {"source": "B", "amount": 5000, "has_client": True, "has_owner": True})
    assert pa["probability"] > pb["probability"]
    assert 0.0 <= pb["probability"] <= 1.0 and 0.0 <= pa["probability"] <= 1.0
    # winning source yields a positive contribution
    src_factor = next(f for f in pa["factors"] if f["feature"] == "source")
    assert src_factor["contribution"] > 0


def test_unseen_source_is_neutral():
    rows = _rows(10, {"A": 8, "B": 2})
    params = fit_scorecard(rows)
    out = predict_scorecard(params, {"source": "ZZZ", "amount": 5000, "has_client": True, "has_owner": True})
    src_factor = next((f for f in out["factors"] if f["feature"] == "source"), None)
    assert src_factor is None or src_factor["contribution"] == 0
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd backend && ./.venv/bin/python -m pytest tests/sales/test_predict_scorecard.py -q`
Expected: FAIL (module missing).

- [ ] **Step 3: Implement the scorecard**

```python
# backend/app/services/predictions/scorecard.py
import math

MIN_SAMPLES = 10
_ALPHA = 1.0  # Laplace smoothing strength
_BINARY_FEATURES = ("has_client", "has_owner")


def _odds(p: float) -> float:
    p = min(max(p, 1e-6), 1 - 1e-6)
    return p / (1 - p)


def _sigmoid(x: float) -> float:
    if x < 0:
        z = math.exp(x)
        return z / (1 + z)
    return 1 / (1 + math.exp(-x))


def _terciles(values: list[float]) -> list[float]:
    s = sorted(values)
    if not s:
        return [0.0, 0.0]
    t1 = s[len(s) // 3]
    t2 = s[(2 * len(s)) // 3]
    return [t1, t2]


def amount_band(amount: float, thresholds: list[float]) -> str:
    t1, t2 = thresholds
    if amount < t1:
        return "low"
    if amount < t2:
        return "med"
    return "high"


def _smoothed_rate(wins: int, n: int, base_rate: float) -> float:
    return (wins + _ALPHA * base_rate) / (n + _ALPHA)


def fit_scorecard(rows: list[dict]) -> dict:
    n = len(rows)
    wins = sum(1 for r in rows if r["won"])
    if n == 0:
        return {"model": "fallback", "base_rate": 0.5, "sample_count": 0}
    base_rate = (wins + _ALPHA * 0.5) / (n + _ALPHA)
    if n < MIN_SAMPLES or wins == 0 or wins == n:
        return {"model": "fallback", "base_rate": round(base_rate, 6), "sample_count": n}

    thresholds = _terciles([float(r["amount"] or 0.0) for r in rows])

    def value_of(r, feature):
        if feature == "source":
            return (r.get("source") or "").strip().lower() or "(none)"
        if feature == "amount_band":
            return amount_band(float(r["amount"] or 0.0), thresholds)
        return "true" if r.get(feature) else "false"

    features = {}
    for feature in ("source", "amount_band", *_BINARY_FEATURES):
        counts = {}
        for r in rows:
            v = value_of(r, feature)
            agg = counts.setdefault(v, [0, 0])  # [wins, n]
            agg[1] += 1
            if r["won"]:
                agg[0] += 1
        features[feature] = {
            v: round(_smoothed_rate(w, cnt, base_rate), 6) for v, (w, cnt) in counts.items()
        }

    return {
        "model": "trained",
        "base_rate": round(base_rate, 6),
        "sample_count": n,
        "amount_thresholds": thresholds,
        "features": features,
    }


def predict_scorecard(params: dict, feats: dict) -> dict:
    base_rate = params.get("base_rate", 0.5)
    if params.get("model") != "trained":
        return {"probability": round(base_rate, 4), "model": "fallback",
                "base_rate": round(base_rate, 6), "factors": []}

    thresholds = params["amount_thresholds"]
    features = params["features"]
    base_logit = math.log(_odds(base_rate))
    logit = base_logit
    factors = []

    def value_of(feature):
        if feature == "source":
            return (feats.get("source") or "").strip().lower() or "(none)"
        if feature == "amount_band":
            return amount_band(float(feats.get("amount") or 0.0), thresholds)
        return "true" if feats.get(feature) else "false"

    for feature, table in features.items():
        v = value_of(feature)
        rate = table.get(v)
        if rate is None:
            continue  # unseen value -> neutral
        contribution = math.log(_odds(rate)) - base_logit
        logit += contribution
        factors.append({"feature": feature, "value": v, "contribution": round(contribution, 4)})

    factors.sort(key=lambda f: abs(f["contribution"]), reverse=True)
    return {
        "probability": round(_sigmoid(logit), 4),
        "model": "trained",
        "base_rate": round(base_rate, 6),
        "factors": factors,
    }
```

- [ ] **Step 4: Run to verify pass**

Run: `cd backend && ./.venv/bin/python -m pytest tests/sales/test_predict_scorecard.py -q`
Expected: PASS.

---

### Task 3: Convert service (train / load / predict)

**Files:**
- Create: `backend/app/services/predictions/convert.py`
- Test: `backend/tests/sales/test_predict_convert_service.py`

**Interfaces:**
- Consumes: `fit_scorecard`/`predict_scorecard` (Task 2), `PredictionModel` (Task 1), `Deal`, `Pipeline`, `PipelineStage`, `DealStageType`.
- Produces:
  - `CONVERT_KIND = "deal_convert"`
  - `def closed_deal_rows(db, company_id) -> list[dict]`
  - `def train_convert(db, company_id) -> PredictionModel` — fit + upsert the row (one per company/kind), commit.
  - `def load_model(db, company_id, kind) -> PredictionModel | None`
  - `def predict_deal(db, deal) -> dict` — load or lazy-train, then `predict_scorecard`; never raises.

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/sales/test_predict_convert_service.py
from datetime import datetime
from app.models.sales.deal import Deal
from app.models.sales.pipeline import Pipeline, PipelineStage
from app.models.core.enums import DealStageType
from app.services.predictions.convert import (
    train_convert, predict_deal, load_model, CONVERT_KIND, closed_deal_rows,
)
from tests.helpers.factories import create_company


def _pipeline_with_stages(db, company_id):
    p = Pipeline(company_id=company_id, name="P")
    db.add(p); db.flush()
    won = PipelineStage(company_id=company_id, pipeline_id=p.id, name="Won",
                        position=3, stage_type=DealStageType.WON)
    lost = PipelineStage(company_id=company_id, pipeline_id=p.id, name="Lost",
                         position=4, stage_type=DealStageType.LOST)
    open_ = PipelineStage(company_id=company_id, pipeline_id=p.id, name="New",
                          position=1, stage_type=DealStageType.OPEN)
    db.add_all([won, lost, open_]); db.flush()
    return p, won, lost, open_


def _seed_closed(db, company_id, p, won, lost):
    # A wins 8/10, B wins 2/10
    for src, wins, stage_pair in [("A", 8, (won, lost)), ("B", 2, (won, lost))]:
        for i in range(10):
            stage = won if i < wins else lost
            db.add(Deal(company_id=company_id, title=f"{src}{i}", amount=1000 * (i + 1),
                        pipeline_id=p.id, stage_id=stage.id, source=src,
                        closed_at=datetime.utcnow()))
    db.commit()


def test_closed_deal_rows_labels(db):
    company = create_company(db, name="PC1", company_code="PC1")
    p, won, lost, open_ = _pipeline_with_stages(db, company.id)
    _seed_closed(db, company.id, p, won, lost)
    # one still-open deal must be excluded from training rows
    db.add(Deal(company_id=company.id, title="open", amount=500,
                pipeline_id=p.id, stage_id=open_.id, source="A"))
    db.commit()
    rows = closed_deal_rows(db, company.id)
    assert len(rows) == 20
    assert sum(1 for r in rows if r["won"]) == 10


def test_train_and_predict(db):
    company = create_company(db, name="PC2", company_code="PC2")
    p, won, lost, open_ = _pipeline_with_stages(db, company.id)
    _seed_closed(db, company.id, p, won, lost)
    model = train_convert(db, company.id)
    assert model.sample_count == 20
    assert load_model(db, company.id, CONVERT_KIND) is not None

    deal_a = Deal(company_id=company.id, title="live-A", amount=5000,
                  pipeline_id=p.id, stage_id=open_.id, source="A")
    deal_b = Deal(company_id=company.id, title="live-B", amount=5000,
                  pipeline_id=p.id, stage_id=open_.id, source="B")
    db.add_all([deal_a, deal_b]); db.commit()
    pa = predict_deal(db, deal_a)
    pb = predict_deal(db, deal_b)
    assert pa["probability"] > pb["probability"]


def test_predict_lazy_fallback_when_untrained(db):
    company = create_company(db, name="PC3", company_code="PC3")
    p, won, lost, open_ = _pipeline_with_stages(db, company.id)
    deal = Deal(company_id=company.id, title="x", amount=100,
                pipeline_id=p.id, stage_id=open_.id, source="A")
    db.add(deal); db.commit()
    out = predict_deal(db, deal)  # no closed history -> fallback, no crash
    assert out["model"] == "fallback"
    assert 0.0 <= out["probability"] <= 1.0
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd backend && ./.venv/bin/python -m pytest tests/sales/test_predict_convert_service.py -q`
Expected: FAIL (module missing).

- [ ] **Step 3: Implement the service**

```python
# backend/app/services/predictions/convert.py
import json
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.core.enums import DealStageType
from app.models.sales.deal import Deal
from app.models.sales.pipeline import PipelineStage
from app.models.sales.prediction import PredictionModel
from app.services.predictions.scorecard import fit_scorecard, predict_scorecard

CONVERT_KIND = "deal_convert"


def closed_deal_rows(db: Session, company_id: int) -> list[dict]:
    rows = (
        db.query(Deal, PipelineStage.stage_type)
        .join(PipelineStage, PipelineStage.id == Deal.stage_id)
        .filter(
            Deal.company_id == company_id,
            PipelineStage.stage_type.in_([DealStageType.WON, DealStageType.LOST]),
        )
        .all()
    )
    out = []
    for deal, stage_type in rows:
        out.append({
            "won": stage_type == DealStageType.WON,
            "source": deal.source,
            "amount": float(deal.amount or 0),
            "has_client": deal.client_id is not None,
            "has_owner": deal.assigned_to_id is not None,
        })
    return out


def load_model(db: Session, company_id: int, kind: str) -> PredictionModel | None:
    return (
        db.query(PredictionModel)
        .filter(PredictionModel.company_id == company_id, PredictionModel.kind == kind)
        .order_by(PredictionModel.id.desc())
        .first()
    )


def train_convert(db: Session, company_id: int) -> PredictionModel:
    rows = closed_deal_rows(db, company_id)
    params = fit_scorecard(rows)
    model = load_model(db, company_id, CONVERT_KIND)
    if model is None:
        model = PredictionModel(company_id=company_id, kind=CONVERT_KIND)
        db.add(model)
    model.sample_count = params.get("sample_count", 0)
    model.base_rate = params.get("base_rate", 0.5)
    model.params = json.dumps(params)
    model.trained_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(model)
    return model


def _deal_features(deal: Deal) -> dict:
    return {
        "source": deal.source,
        "amount": float(deal.amount or 0),
        "has_client": deal.client_id is not None,
        "has_owner": deal.assigned_to_id is not None,
    }


def predict_deal(db: Session, deal: Deal) -> dict:
    try:
        model = load_model(db, deal.company_id, CONVERT_KIND)
        if model is None:
            model = train_convert(db, deal.company_id)
        params = json.loads(model.params or "{}")
        return predict_scorecard(params, _deal_features(deal))
    except Exception:
        return {"probability": 0.5, "model": "fallback", "base_rate": 0.5, "factors": []}
```

- [ ] **Step 4: Run to verify pass**

Run: `cd backend && ./.venv/bin/python -m pytest tests/sales/test_predict_convert_service.py -q`
Expected: PASS.

---

### Task 4: Churn engine (pure)

**Files:**
- Create: `backend/app/services/predictions/churn.py`
- Test: `backend/tests/sales/test_predict_churn.py`

**Interfaces:**
- Produces:
  - `def churn_score(event_dates: list, now) -> dict` — `event_dates`: list of `date`/`datetime` (invoice event times, any order). Returns `{"risk","band","days_since_last_invoice","typical_interval_days","invoice_count","reasons"}`. `risk`/`band` are `None` for zero invoices.
  - `def band_for(risk: float) -> str`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/sales/test_predict_churn.py
from datetime import datetime, timedelta, timezone
from app.services.predictions.churn import churn_score

NOW = datetime(2026, 8, 26, tzinfo=timezone.utc)


def _days_ago(n):
    return NOW - timedelta(days=n)


def test_zero_invoices_is_none():
    out = churn_score([], NOW)
    assert out["risk"] is None
    assert out["invoice_count"] == 0


def test_on_cadence_is_low_risk():
    # invoices every 30 days, last one 30 days ago -> gap ~1 -> low
    dates = [_days_ago(90), _days_ago(60), _days_ago(30)]
    out = churn_score(dates, NOW)
    assert out["band"] == "low"
    assert out["typical_interval_days"] == 30


def test_overdue_is_high_risk():
    # usually every 30 days, but last was 150 days ago -> gap 5 -> high
    dates = [_days_ago(210), _days_ago(180), _days_ago(150)]
    out = churn_score(dates, NOW)
    assert out["band"] == "high"
    assert out["risk"] >= 0.7


def test_single_invoice_recent_low():
    out = churn_score([_days_ago(10)], NOW)
    assert out["invoice_count"] == 1
    assert out["band"] == "low"
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd backend && ./.venv/bin/python -m pytest tests/sales/test_predict_churn.py -q`
Expected: FAIL (module missing).

- [ ] **Step 3: Implement churn**

```python
# backend/app/services/predictions/churn.py
from datetime import timezone
from statistics import median

_SINGLE_INVOICE_HORIZON = 180.0  # days -> risk 1.0 for a lone old invoice


def band_for(risk: float) -> str:
    if risk < 0.4:
        return "low"
    if risk < 0.7:
        return "med"
    return "high"


def _as_dt(d):
    # accept date or datetime; normalise to naive-comparable via .toordinal fallback
    return d


def _days_between(later, earlier) -> int:
    # both date or datetime; use ordinal day difference to avoid tz/date-vs-datetime issues
    lo = later.date() if hasattr(later, "date") else later
    eo = earlier.date() if hasattr(earlier, "date") else earlier
    return (lo - eo).days


def churn_score(event_dates: list, now) -> dict:
    dates = sorted(event_dates)
    count = len(dates)
    if count == 0:
        return {"risk": None, "band": None, "days_since_last_invoice": None,
                "typical_interval_days": None, "invoice_count": 0,
                "reasons": ["No invoices — not a customer yet."]}

    last = dates[-1]
    recency = max(0, _days_between(now, last))

    if count >= 2:
        gaps = [_days_between(dates[i + 1], dates[i]) for i in range(count - 1)]
        typical = max(1, int(median(gaps)))
        cadence_gap = recency / typical
        risk = min(1.0, max(0.0, (cadence_gap - 1.0) / 2.0))
        reasons = [
            f"Last invoice {recency}d ago; usual gap ~{typical}d.",
            f"That is {cadence_gap:.1f}× the usual cadence.",
        ]
    else:
        typical = None
        risk = min(1.0, recency / _SINGLE_INVOICE_HORIZON)
        reasons = [f"Single invoice, {recency}d ago."]

    return {
        "risk": round(risk, 4),
        "band": band_for(risk),
        "days_since_last_invoice": recency,
        "typical_interval_days": typical,
        "invoice_count": count,
        "reasons": reasons,
    }
```

- [ ] **Step 4: Run to verify pass**

Run: `cd backend && ./.venv/bin/python -m pytest tests/sales/test_predict_churn.py -q`
Expected: PASS.

---

### Task 5: Predictions API router (train / models / churn list)

**Files:**
- Create: `backend/app/services/predictions/churn_service.py`
- Create: `backend/app/routers/sales/predictions.py`
- Modify: `backend/app/main.py` (import + include_router)
- Test: `backend/tests/sales/test_predictions_api.py`

**Interfaces:**
- Consumes: `train_convert`/`load_model`/`CONVERT_KIND` (Task 3), `churn_score` (Task 4).
- Produces:
  - `churn_service.churn_for_client(db, company_id, client) -> dict` and `churn_service.ranked_churn(db, company_id) -> list[dict]`.
  - Routes: `POST /api/predictions/train`, `GET /api/predictions/models`, `GET /api/predictions/churn`.

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/sales/test_predictions_api.py
from datetime import datetime, timedelta
from app.models.sales.deal import Deal
from app.models.sales.pipeline import Pipeline, PipelineStage
from app.models.sales.client import Client
from app.models.finance.invoice import Invoice
from app.models.core.enums import DealStageType
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


def _login(client, db, code, role="admin"):
    company = create_company(db, name=f"Co {code}", company_code=code)
    user = create_active_user(db, email=f"{role}@{code.lower()}.com",
                              role=role, company_id=company.id)
    login_user(client, user.email)
    return company, user


def _closed_deals(db, company_id):
    p = Pipeline(company_id=company_id, name="P"); db.add(p); db.flush()
    won = PipelineStage(company_id=company_id, pipeline_id=p.id, name="Won", position=3, stage_type=DealStageType.WON)
    lost = PipelineStage(company_id=company_id, pipeline_id=p.id, name="Lost", position=4, stage_type=DealStageType.LOST)
    db.add_all([won, lost]); db.flush()
    for src, wins in [("A", 8), ("B", 2)]:
        for i in range(10):
            db.add(Deal(company_id=company_id, title=f"{src}{i}", amount=1000 * (i + 1),
                        pipeline_id=p.id, stage_id=(won.id if i < wins else lost.id),
                        source=src, closed_at=datetime.utcnow()))
    db.commit()


def test_train_and_models(client, db):
    company, _ = _login(client, db, "PA1")
    _closed_deals(db, company.id)
    resp = client.post("/api/predictions/train", json={"kind": "deal_convert"})
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["sample_count"] == 20
    assert body["model"] == "trained"
    models = client.get("/api/predictions/models").json()
    assert any(m["kind"] == "deal_convert" for m in models["items"])


def test_sales_cannot_train(client, db):
    _login(client, db, "PA2", role="sales")
    assert client.post("/api/predictions/train", json={"kind": "deal_convert"}).status_code == 403


def test_churn_list_ranks_overdue_first(client, db):
    company, _ = _login(client, db, "PA3")
    # overdue client
    c1 = Client(company_id=company.id, name="Overdue")
    c2 = Client(company_id=company.id, name="Fresh")
    db.add_all([c1, c2]); db.flush()
    now = datetime.utcnow()
    for d in (210, 180, 150):
        db.add(Invoice(company_id=company.id, client_id=c1.id, total=100,
                       created_at=now - timedelta(days=d)))
    for d in (60, 30, 1):
        db.add(Invoice(company_id=company.id, client_id=c2.id, total=100,
                       created_at=now - timedelta(days=d)))
    db.commit()
    rows = client.get("/api/predictions/churn").json()["items"]
    assert rows[0]["client_id"] == c1.id
    assert rows[0]["band"] == "high"
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd backend && ./.venv/bin/python -m pytest tests/sales/test_predictions_api.py -q`
Expected: FAIL (404s — router not mounted).

- [ ] **Step 3: Implement the churn service**

```python
# backend/app/services/predictions/churn_service.py
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.finance.invoice import Invoice
from app.services.predictions.churn import churn_score


def _invoice_dates(db: Session, company_id: int, client_id: int) -> list:
    rows = (
        db.query(Invoice.created_at, Invoice.paid_date)
        .filter(Invoice.company_id == company_id, Invoice.client_id == client_id)
        .all()
    )
    dates = []
    for created_at, paid_date in rows:
        dates.append(paid_date or created_at)
    return [d for d in dates if d is not None]


def churn_for_client(db: Session, company_id: int, client) -> dict:
    now = datetime.now(timezone.utc)
    result = churn_score(_invoice_dates(db, company_id, client.id), now)
    result["client_id"] = client.id
    result["client_name"] = client.name
    return result


def ranked_churn(db: Session, company_id: int) -> list:
    from app.models.sales.client import Client
    clients = db.query(Client).filter(Client.company_id == company_id).all()
    scored = [churn_for_client(db, company_id, c) for c in clients]
    scored = [s for s in scored if s["risk"] is not None]
    scored.sort(key=lambda s: s["risk"], reverse=True)
    return scored
```

- [ ] **Step 4: Implement the router**

```python
# backend/app/routers/sales/predictions.py
import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.core.user import User
from app.models.sales.prediction import PredictionModel
from app.services.predictions.convert import train_convert, CONVERT_KIND
from app.services.predictions.churn_service import ranked_churn
from app.utils.dependencies import (
    apply_company_scope,
    get_current_user,
    require_admin_or_md,
)

router = APIRouter()

_KINDS = {"deal_convert"}


class TrainIn(BaseModel):
    kind: str = "deal_convert"


@router.post("/train")
def train(payload: TrainIn, db: Session = Depends(get_db),
          current_user: User = Depends(require_admin_or_md)):
    if payload.kind not in _KINDS:
        raise HTTPException(status_code=400, detail="Unknown model kind")
    model = train_convert(db, current_user.company_id)
    params = json.loads(model.params or "{}")
    return {
        "kind": model.kind,
        "sample_count": model.sample_count,
        "base_rate": model.base_rate,
        "model": params.get("model", "fallback"),
        "weights": params.get("features", {}),
        "trained_at": model.trained_at.isoformat() if model.trained_at else None,
    }


@router.get("/models")
def list_models(db: Session = Depends(get_db),
                current_user: User = Depends(require_admin_or_md)):
    rows = apply_company_scope(db.query(PredictionModel), PredictionModel, current_user).all()
    return {"items": [
        {
            "id": m.id, "kind": m.kind, "sample_count": m.sample_count,
            "base_rate": m.base_rate,
            "model": json.loads(m.params or "{}").get("model", "fallback"),
            "trained_at": m.trained_at.isoformat() if m.trained_at else None,
        }
        for m in rows
    ]}


@router.get("/churn")
def churn_list(band: Optional[str] = Query(None),
               db: Session = Depends(get_db),
               current_user: User = Depends(get_current_user)):
    if current_user.company_id is None:
        raise HTTPException(status_code=403, detail="User must belong to a company")
    rows = ranked_churn(db, current_user.company_id)
    if band:
        rows = [r for r in rows if r["band"] == band]
    return {"items": rows, "total": len(rows)}
```

- [ ] **Step 5: Mount the router**

In `backend/app/main.py`, with the other sales imports:

```python
from app.routers.sales.predictions import router as predictions_router
```

With the other `include_router` calls (next to the scoring one):

```python
app.include_router(predictions_router, prefix="/api/predictions", tags=["Predictions"])
```

- [ ] **Step 6: Run to verify pass**

Run: `cd backend && ./.venv/bin/python -m pytest tests/sales/test_predictions_api.py -q`
Expected: PASS.

---

### Task 6: Detail endpoints (deal prediction, client churn)

**Files:**
- Modify: `backend/app/routers/sales/deals.py` (add `GET /{deal_id:int}/prediction`)
- Modify: `backend/app/routers/sales/clients.py` (add `GET /{client_id}/churn`)
- Test: `backend/tests/sales/test_predictions_detail.py`

**Interfaces:**
- Consumes: `predict_deal` (Task 3), `churn_for_client` (Task 5).
- Produces: `GET /api/deals/{id}/prediction` → scorecard output; `GET /api/clients/{id}/churn` → churn dict.

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/sales/test_predictions_detail.py
from datetime import datetime, timedelta
from app.models.sales.deal import Deal
from app.models.sales.pipeline import Pipeline, PipelineStage
from app.models.sales.client import Client
from app.models.finance.invoice import Invoice
from app.models.core.enums import DealStageType
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


def _login(client, db, code):
    company = create_company(db, name=f"Co {code}", company_code=code)
    user = create_active_user(db, email=f"admin@{code.lower()}.com",
                              role="admin", company_id=company.id)
    login_user(client, user.email)
    return company, user


def test_deal_prediction_returns_probability(client, db):
    company, _ = _login(client, db, "PD1")
    p = Pipeline(company_id=company.id, name="P"); db.add(p); db.flush()
    open_ = PipelineStage(company_id=company.id, pipeline_id=p.id, name="New",
                          position=1, stage_type=DealStageType.OPEN)
    db.add(open_); db.flush()
    deal = Deal(company_id=company.id, title="x", amount=1000,
                pipeline_id=p.id, stage_id=open_.id, source="A")
    db.add(deal); db.commit()
    resp = client.get(f"/api/deals/{deal.id}/prediction")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert 0.0 <= body["probability"] <= 1.0
    assert "model" in body


def test_deal_prediction_foreign_404(client, db):
    _login(client, db, "PD2")
    assert client.get("/api/deals/999999/prediction").status_code == 404


def test_client_churn_detail(client, db):
    company, _ = _login(client, db, "PD3")
    c = Client(company_id=company.id, name="Acme"); db.add(c); db.flush()
    now = datetime.utcnow()
    for d in (120, 60):
        db.add(Invoice(company_id=company.id, client_id=c.id, total=100,
                       created_at=now - timedelta(days=d)))
    db.commit()
    body = client.get(f"/api/clients/{c.id}/churn").json()
    assert body["invoice_count"] == 2
    assert body["band"] in {"low", "med", "high"}


def test_client_churn_foreign_404(client, db):
    _login(client, db, "PD4")
    assert client.get("/api/clients/999999/churn").status_code == 404
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd backend && ./.venv/bin/python -m pytest tests/sales/test_predictions_detail.py -q`
Expected: FAIL (routes missing).

- [ ] **Step 3: Add the deal prediction route**

In `backend/app/routers/sales/deals.py`, add import near the scoring imports:

```python
from app.services.predictions.convert import predict_deal
```

Add the route beside `get_deal_score` (before `update_deal`):

```python
@router.get("/{deal_id:int}/prediction")
def get_deal_prediction(deal_id: int, db: Session = Depends(get_db),
                        current_user: User = Depends(get_current_user)):
    deal = apply_company_scope(db.query(Deal), Deal, current_user).filter(Deal.id == deal_id).first()
    if deal is None:
        raise HTTPException(status_code=404, detail="Deal not found")
    ensure_company_access(deal, current_user)
    return predict_deal(db, deal)
```

- [ ] **Step 4: Add the client churn route**

In `backend/app/routers/sales/clients.py`, add import:

```python
from app.services.predictions.churn_service import churn_for_client
```

Add the route (place it after `get_client`, mirroring the get_client scope pattern — read the actual `get_client` to match the id type; it uses `/{client_id}` without an `:int` converter):

```python
@router.get("/{client_id}/churn")
def get_client_churn(client_id: int, db: Session = Depends(get_db),
                     current_user: User = Depends(get_current_user)):
    client = apply_company_scope(db.query(Client), Client, current_user).filter(Client.id == client_id).first()
    if client is None:
        raise HTTPException(status_code=404, detail="Client not found")
    ensure_company_access(client, current_user)
    return churn_for_client(db, current_user.company_id, client)
```

> Verify `Client`, `HTTPException`, `apply_company_scope`, `ensure_company_access`, `get_current_user`, `Session`, `Depends`, `get_db` are already imported in `clients.py` (they are used by `get_client`). Add any that are missing.

- [ ] **Step 5: Run to verify pass**

Run: `cd backend && ./.venv/bin/python -m pytest tests/sales/test_predictions_detail.py -q`
Expected: PASS.

---

### Task 7: Cross-tenant tests + full suite

**Files:**
- Test: `backend/tests/sales/test_predictions_cross_tenant.py`

- [ ] **Step 1: Write the tests**

```python
# backend/tests/sales/test_predictions_cross_tenant.py
from app.models.sales.client import Client
from app.models.sales.deal import Deal
from app.models.sales.pipeline import Pipeline, PipelineStage
from app.models.core.enums import DealStageType
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


def _admin(client, db, code):
    company = create_company(db, name=f"Co {code}", company_code=code)
    admin = create_active_user(db, email=f"admin@{code.lower()}.com",
                               role="admin", company_id=company.id)
    return company, admin


def test_foreign_deal_prediction_and_client_churn_404(client, db):
    company_a, admin_a = _admin(client, db, "PXA")
    company_b, admin_b = _admin(client, db, "PXB")
    p = Pipeline(company_id=company_a.id, name="P"); db.add(p); db.flush()
    open_ = PipelineStage(company_id=company_a.id, pipeline_id=p.id, name="New",
                          position=1, stage_type=DealStageType.OPEN)
    db.add(open_); db.flush()
    deal = Deal(company_id=company_a.id, title="x", amount=1,
                pipeline_id=p.id, stage_id=open_.id, source="A")
    cl = Client(company_id=company_a.id, name="A")
    db.add_all([deal, cl]); db.commit()

    login_user(client, admin_b.email)
    assert client.get(f"/api/deals/{deal.id}/prediction").status_code == 404
    assert client.get(f"/api/clients/{cl.id}/churn").status_code == 404

    login_user(client, admin_a.email)  # positive controls
    assert client.get(f"/api/deals/{deal.id}/prediction").status_code == 200
    assert client.get(f"/api/clients/{cl.id}/churn").status_code == 200


def test_train_is_company_scoped(client, db):
    company_a, admin_a = _admin(client, db, "PXC")
    company_b, admin_b = _admin(client, db, "PXD")
    login_user(client, admin_a.email)
    client.post("/api/predictions/train", json={"kind": "deal_convert"})
    login_user(client, admin_b.email)
    # B sees only its own (empty) model list, never A's
    models = client.get("/api/predictions/models").json()["items"]
    assert all(m["kind"] == "deal_convert" for m in models)  # only B's, and B trained none
    assert models == []
```

- [ ] **Step 2: Run to verify pass**

Run: `cd backend && ./.venv/bin/python -m pytest tests/sales/test_predictions_cross_tenant.py -q`
Expected: PASS.

- [ ] **Step 3: Full backend suite**

Run: `cd backend && ./.venv/bin/python -m pytest -q`
Expected: all new prediction tests pass. There are **3 known pre-existing unrelated failures** (accept-invite sanitize, api-key UTC-day quota, reminder due-follow-up) — confirm the count is still exactly those 3 and nothing new broke.

---

### Task 8: Frontend — predictions page + badges

**Files:**
- Create: `frontend/app/settings/predictions/page.jsx`
- Modify: `frontend/app/settings/page.jsx` (add a Predictions card)
- Create: `frontend/components/PredictionBadge.jsx`, `frontend/components/ChurnBadge.jsx`
- Modify: `frontend/components/deals/DealDetailPage.jsx` (win-prob badge)
- Modify: `frontend/components/clients/ClientDetailPage.jsx` (churn badge)
- Test: `frontend` build

**Interfaces:**
- Consumes: `/api/predictions/train`, `/api/predictions/models`, `/api/predictions/churn`, `/api/deals/{id}/prediction`, `/api/clients/{id}/churn`.

- [ ] **Step 1: Add the settings card**

In `frontend/app/settings/page.jsx`, add `Brain` (or reuse an existing icon) to the lucide import, and a card block after the scoring card, linking `/settings/predictions` (label "Predictive AI", copy "Win-probability and churn risk from your own history"). Mirror the scoring card markup exactly.

- [ ] **Step 2: Build `PredictionBadge` and `ChurnBadge`**

Model both on `frontend/components/ScoreBadge.jsx` (same fetch/expand/error pattern):

`PredictionBadge({ id })` fetches `/deals/${id}/prediction`; renders `Win {Math.round(probability*100)}%` with a colour by band (≥0.66 green, ≥0.33 amber, else slate); expands to list `factors` (`feature value → +contribution`); when `model === "fallback"` show a muted "baseline (train for a model)" note instead of factors.

`ChurnBadge({ id })` fetches `/clients/${id}/churn`; if `risk === null` render nothing (or a muted "no invoices"); else render `Churn {band}` coloured (high red, med amber, low slate) and expand to the `reasons` list.

- [ ] **Step 3: Wire badges into detail headers**

In `DealDetailPage.jsx`, import `PredictionBadge` and render `<PredictionBadge id={id} />` next to the existing `<ScoreBadge entity="deals" id={id} />`.

In `ClientDetailPage.jsx`, import `ChurnBadge` and render `<ChurnBadge id={params.id} />` inside the `<h1>` next to the "Client" span (around line 174).

- [ ] **Step 4: Build the predictions settings page**

`/settings/predictions` (admin/md guarded, mirror `frontend/app/settings/scoring/page.jsx`):
- A "Deal win-probability model" card: shows the stored model status from `GET /api/predictions/models` (sample_count, base_rate, trained/fallback), a **Train now** button calling `POST /api/predictions/train {kind:"deal_convert"}`, and — when trained — a small table of learned weights from the train response (`weights[feature][value]` = smoothed win-rate).
- A "Churn risk" card: fetch `GET /api/predictions/churn`, list at-risk clients (name, band pill, days since last invoice), with a band filter. Link each to the client record.
- Handle loading/empty/error states.

- [ ] **Step 5: Build**

Run: `cd frontend && npm run build`
Expected: clean build. `/settings/predictions` appears in the route list.

---

## Self-Review

- **Spec coverage:** §1 scope (deal_convert + client_churn) → Tasks 3/4/5/6. §2 scorecard model → Task 2. §3 training data → Task 3 `closed_deal_rows`. §4 features → Task 2/3. §5 scorecard math → Task 2. §6 fallback → Task 2 + Task 3. §7 storage → Task 1 + Task 3. §8 lazy train → Task 3 `predict_deal`. §9 churn → Task 4 + Task 5. §10 API → Tasks 5/6. §11 tenancy → Task 7. §12 migration → Task 1. §13 UI → Task 8. Covered.
- **Placeholder scan:** all backend steps carry real code; Task 8 references concrete endpoints + the ScoreBadge/scoring-page templates.
- **Type consistency:** `fit_scorecard`→`predict_scorecard` params/feats dicts match across Tasks 2/3. `predict_deal`/`train_convert`/`load_model`/`CONVERT_KIND` consistent Tasks 3/5/6. `churn_score`→`churn_for_client`→`ranked_churn` return keys (`risk`,`band`,`client_id`) match across Tasks 4/5/6/8.
- **Executor note:** Task 1 Step 6 and the Global Constraints both say to trust `test_alembic_heads` for the real head rather than the assumed `019_scoring` — reconcile before writing the revision.
