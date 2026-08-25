# Lead / Deal Scoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give companies admin-configurable, deterministic point rules that produce an explainable score on every lead and deal.

**Architecture:** One `scoring_rules` table (company-scoped, `entity_type` = `lead`|`deal`) drives a pure evaluator (`app/services/scoring/engine.py`) that returns a total + per-rule breakdown. A thin recompute service persists `leads.score` / `deals.score` on create/update, on rule change, and via a bulk endpoint. A CRUD router mirrors `territories.py`; the UI mirrors `/settings/territories`.

**Tech Stack:** FastAPI, SQLAlchemy, Pydantic, pytest (backend); Next.js/React (frontend). No new pip/npm deps.

**Spec:** `docs/superpowers/specs/2026-08-26-phase5-lead-deal-scoring-design.md`

## Global Constraints

- **No new dependencies** (pip or npm). Stdlib + existing libs only.
- **New tables** ship via `Base.metadata.create_all` — the model MUST be imported in `backend/app/models/sales/__init__.py`. **New columns** ship via `MISSING_COLUMNS` in `backend/app/schema_sync.py`. Plus one Alembic revision `018_scoring` (down_revision `017_enrichment`) whose `upgrade()` calls `apply_schema(op.get_bind())`.
- **Tenancy:** every query goes through `apply_company_scope(query, Model, current_user)`; single-row fetches also call `ensure_company_access(obj, current_user)`. A foreign-tenant id returns **404**, never 403. RLS auto-covers any table with a `company_id` column — no manual registration.
- **Role gating:** rule mutation + bulk recompute require `Depends(require_admin_or_md)`; reads require `Depends(get_current_user)`.
- **Repo commit convention:** work stays uncommitted on `main` (prior phases did the same); the task terminator is a **green test suite**, not a commit. Leave committing to the user.
- **Engine is total:** a rule whose evaluation raises is treated as *not matched* — a recompute never crashes.
- **`now`** is `datetime.now(timezone.utc)`; computed-field NULL timestamps use sentinel `10**6` days.

---

### Task 1: Model, columns, migration

**Files:**
- Create: `backend/app/models/sales/scoring.py`
- Modify: `backend/app/models/sales/__init__.py` (add import)
- Modify: `backend/app/schema_sync.py:9` (append to `MISSING_COLUMNS`)
- Create: `backend/alembic/versions/018_scoring.py`
- Test: `backend/tests/sales/test_scoring_schema.py`

**Interfaces:**
- Produces: `ScoringRule(id, company_id, entity_type, field, operator, value, points, is_active, created_at)`; columns `leads.score`/`leads.score_updated_at`, `deals.score`/`deals.score_updated_at`.

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/sales/test_scoring_schema.py
from sqlalchemy import inspect
from app.models.sales.scoring import ScoringRule
from app.models.sales.lead import Lead
from app.models.sales.deal import Deal


def test_scoring_rule_table_columns():
    cols = {c.name for c in ScoringRule.__table__.columns}
    assert cols == {
        "id", "company_id", "entity_type", "field",
        "operator", "value", "points", "is_active", "created_at",
    }


def test_score_columns_on_lead_and_deal():
    assert "score" in Lead.__table__.columns
    assert "score_updated_at" in Lead.__table__.columns
    assert "score" in Deal.__table__.columns
    assert "score_updated_at" in Deal.__table__.columns


def test_scoring_rule_persists(db):
    rule = ScoringRule(
        company_id=1, entity_type="lead", field="source",
        operator="eq", value="Referral", points=20, is_active=True,
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)
    assert rule.id is not None
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd backend && python -m pytest tests/sales/test_scoring_schema.py -v`
Expected: FAIL (`ModuleNotFoundError: app.models.sales.scoring`).

- [ ] **Step 3: Create the model**

```python
# backend/app/models/sales/scoring.py
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.sql import func

from app.database import Base


class ScoringRule(Base):
    __tablename__ = "scoring_rules"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    entity_type = Column(String(8), nullable=False, index=True)  # 'lead' | 'deal'
    field = Column(String(48), nullable=False)
    operator = Column(String(12), nullable=False)
    value = Column(String(255), nullable=True)
    points = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, server_default=func.now())
```

- [ ] **Step 4: Register the model and score columns**

In `backend/app/models/sales/__init__.py` add (near the other `from .` lines):

```python
from .scoring import ScoringRule
```

In `backend/app/models/sales/lead.py`, after line 27 (`enrichment_source`):

```python
    score = Column(Integer, nullable=True)
    score_updated_at = Column(DateTime, nullable=True)
```

In `backend/app/models/sales/deal.py`, after line 28 (`source = Column(...)`):

```python
    score = Column(Integer, nullable=True)
    score_updated_at = Column(DateTime, nullable=True)
```

In `backend/app/schema_sync.py`, append to the `MISSING_COLUMNS` list:

```python
    ("leads", "score", "INTEGER"),
    ("leads", "score_updated_at", "TIMESTAMP"),
    ("deals", "score", "INTEGER"),
    ("deals", "score_updated_at", "TIMESTAMP"),
```

- [ ] **Step 5: Create the Alembic revision**

```python
# backend/alembic/versions/018_scoring.py
"""Apply schema after scoring table + columns.

Revision ID: 018_scoring
Revises: 017_enrichment
Create Date: 2026-08-26
"""
from typing import Sequence, Union

from alembic import op

revision: str = "018_scoring"
down_revision: Union[str, None] = "017_enrichment"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from app.schema_sync import apply_schema

    apply_schema(op.get_bind())


def downgrade() -> None:
    pass
```

- [ ] **Step 6: Run to verify pass + head is unique**

Run: `cd backend && python -m pytest tests/sales/test_scoring_schema.py tests/ops/test_alembic_heads.py -v`
Expected: PASS. If `test_alembic_heads` asserts a specific head string, update its expectation to `018_scoring` in the same commit.

---

### Task 2: Scoring engine (pure)

**Files:**
- Create: `backend/app/services/scoring/__init__.py` (empty)
- Create: `backend/app/services/scoring/engine.py`
- Test: `backend/tests/sales/test_scoring_engine.py`

**Interfaces:**
- Produces:
  - `LEAD_FIELDS: dict[str, set[str]]`, `DEAL_FIELDS: dict[str, set[str]]` — field → allowed operators.
  - `OPERATORS: set[str]`
  - `def fields_for(entity_type: str) -> dict[str, set[str]]`
  - `def score_entity(entity, rules, now=None) -> dict` → `{"total": int, "breakdown": [{"rule_id","field","operator","value","points","matched"}]}`. `rules` is any iterable of objects with `.id/.field/.operator/.value/.points/.is_active`; inactive rules are skipped entirely.

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/sales/test_scoring_engine.py
from datetime import datetime, timezone, timedelta
from types import SimpleNamespace

from app.services.scoring.engine import score_entity, fields_for, LEAD_FIELDS, DEAL_FIELDS

NOW = datetime(2026, 8, 26, tzinfo=timezone.utc)


def rule(**kw):
    kw.setdefault("id", 1)
    kw.setdefault("is_active", True)
    kw.setdefault("points", 10)
    kw.setdefault("value", None)
    return SimpleNamespace(**kw)


def lead(**kw):
    kw.setdefault("created_at", NOW)
    kw.setdefault("last_contacted_at", None)
    return SimpleNamespace(**kw)


def test_eq_case_insensitive_string_matches():
    r = rule(field="source", operator="eq", value="Referral", points=20)
    out = score_entity(lead(source="referral"), [r], now=NOW)
    assert out["total"] == 20
    assert out["breakdown"][0]["matched"] is True


def test_ne_and_in():
    r_ne = rule(id=1, field="status", operator="ne", value="Lost", points=5)
    r_in = rule(id=2, field="source", operator="in", value="Referral, Website", points=7)
    out = score_entity(lead(status="Active", source="website"), [r_ne, r_in], now=NOW)
    assert out["total"] == 12


def test_numeric_operators():
    r = rule(field="amount", operator="gte", value="50000", points=30)
    out = score_entity(SimpleNamespace(amount=50000, created_at=NOW), [r], now=NOW)
    assert out["total"] == 30


def test_is_set_and_is_empty():
    r_set = rule(id=1, field="email", operator="is_set", points=10)
    r_empty = rule(id=2, field="phone", operator="is_empty", points=3)
    out = score_entity(lead(email="a@b.com", phone=None), [r_set, r_empty], now=NOW)
    assert out["total"] == 13


def test_days_since_last_contact_null_is_large_sentinel():
    r = rule(field="days_since_last_contact", operator="gt", value="30", points=-15)
    out = score_entity(lead(last_contacted_at=None), [r], now=NOW)
    assert out["total"] == -15  # NULL -> never contacted -> matches ">30"


def test_days_since_last_contact_recent_does_not_match():
    r = rule(field="days_since_last_contact", operator="gt", value="30", points=-15)
    recent = lead(last_contacted_at=NOW - timedelta(days=2))
    out = score_entity(recent, [r], now=NOW)
    assert out["total"] == 0


def test_negative_total_allowed():
    r = rule(field="source", operator="eq", value="Cold", value_points=None, points=-40)
    out = score_entity(lead(source="Cold"), [r], now=NOW)
    assert out["total"] == -40


def test_inactive_rule_skipped():
    r = rule(field="source", operator="eq", value="X", points=99, is_active=False)
    out = score_entity(lead(source="X"), [r], now=NOW)
    assert out["total"] == 0
    assert out["breakdown"] == []


def test_bad_rule_never_crashes():
    r = rule(field="amount", operator="gt", value="not-a-number", points=10)
    out = score_entity(SimpleNamespace(amount=5, created_at=NOW), [r], now=NOW)
    assert out["total"] == 0
    assert out["breakdown"][0]["matched"] is False


def test_field_whitelists_shape():
    assert "source" in LEAD_FIELDS and "amount" in DEAL_FIELDS
    assert fields_for("lead") is LEAD_FIELDS
    assert fields_for("deal") is DEAL_FIELDS
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd backend && python -m pytest tests/sales/test_scoring_engine.py -v`
Expected: FAIL (module missing).

- [ ] **Step 3: Implement the engine**

```python
# backend/app/services/scoring/engine.py
from datetime import datetime, timezone

_NULL_DAYS = 10 ** 6

_STRING_OPS = {"eq", "ne", "in", "is_set", "is_empty"}
_ENUM_OPS = {"eq", "ne", "in"}
_PRESENCE_OPS = {"is_set", "is_empty"}
_NUM_OPS = {"eq", "ne", "gt", "gte", "lt", "lte"}

OPERATORS = {"eq", "ne", "in", "gt", "gte", "lt", "lte", "is_set", "is_empty"}

LEAD_FIELDS = {
    "source": _STRING_OPS,
    "industry": _STRING_OPS,
    "status": _ENUM_OPS,
    "email": _PRESENCE_OPS,
    "phone": _PRESENCE_OPS,
    "website": _PRESENCE_OPS,
    "days_since_last_contact": _NUM_OPS,
    "age_days": _NUM_OPS,
}

DEAL_FIELDS = {
    "amount": _NUM_OPS,
    "stage_id": _ENUM_OPS,
    "probability": _NUM_OPS,
    "days_to_expected_close": _NUM_OPS,
    "age_days": _NUM_OPS,
}

_COMPUTED = {"days_since_last_contact", "age_days", "days_to_expected_close"}


def fields_for(entity_type: str) -> dict:
    return DEAL_FIELDS if entity_type == "deal" else LEAD_FIELDS


def _days_between(later, earlier) -> int:
    later = _aware(later)
    earlier = _aware(earlier)
    return int((later - earlier).total_seconds() // 86400)


def _aware(dt):
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _field_value(entity, field, now):
    if field == "days_since_last_contact":
        ts = getattr(entity, "last_contacted_at", None)
        return _NULL_DAYS if ts is None else _days_between(now, ts)
    if field == "age_days":
        ts = getattr(entity, "created_at", None)
        return 0 if ts is None else _days_between(now, ts)
    if field == "days_to_expected_close":
        d = getattr(entity, "expected_close", None)
        if d is None:
            return _NULL_DAYS
        # expected_close is a date; compare to now's date
        return (d - now.date()).days
    return getattr(entity, field, None)


def _matches(entity, rule, now) -> bool:
    op = rule.operator
    actual = _field_value(entity, rule.field, now)

    if op == "is_set":
        return actual is not None and str(actual).strip() != ""
    if op == "is_empty":
        return actual is None or str(actual).strip() == ""

    if actual is None:
        return False

    if rule.field in _COMPUTED or rule.field in ("amount", "probability", "stage_id"):
        left = float(actual)
        if op == "in":
            targets = {float(v.strip()) for v in str(rule.value).split(",") if v.strip()}
            return left in targets
        right = float(rule.value)
        return _num_cmp(op, left, right)

    left = str(actual).strip().lower()
    if op == "in":
        targets = {v.strip().lower() for v in str(rule.value or "").split(",") if v.strip()}
        return left in targets
    right = str(rule.value or "").strip().lower()
    if op == "eq":
        return left == right
    if op == "ne":
        return left != right
    return False


def _num_cmp(op, a, b) -> bool:
    return {
        "eq": a == b, "ne": a != b,
        "gt": a > b, "gte": a >= b,
        "lt": a < b, "lte": a <= b,
    }[op]


def score_entity(entity, rules, now=None) -> dict:
    if now is None:
        now = datetime.now(timezone.utc)
    total = 0
    breakdown = []
    for rule in rules:
        if not rule.is_active:
            continue
        try:
            matched = _matches(entity, rule, now)
        except Exception:
            matched = False
        if matched:
            total += rule.points
        breakdown.append({
            "rule_id": rule.id,
            "field": rule.field,
            "operator": rule.operator,
            "value": rule.value,
            "points": rule.points,
            "matched": matched,
        })
    return {"total": total, "breakdown": breakdown}
```

> Note: the `test_negative_total_allowed` test passes a stray `value_points` kwarg to `SimpleNamespace`; it is ignored by the engine. Keep the assertion on `total == -40`.

- [ ] **Step 4: Run to verify pass**

Run: `cd backend && python -m pytest tests/sales/test_scoring_engine.py -v`
Expected: PASS (all).

---

### Task 3: Recompute service

**Files:**
- Create: `backend/app/services/scoring/recompute.py`
- Test: `backend/tests/sales/test_scoring_recompute.py`

**Interfaces:**
- Consumes: `score_entity` (Task 2), `ScoringRule` (Task 1), `Lead`, `Deal`.
- Produces:
  - `def active_rules(db, company_id, entity_type) -> list[ScoringRule]`
  - `def recompute_one(db, entity, entity_type, rules=None) -> int` — sets `entity.score` + `entity.score_updated_at`, returns total. Does **not** commit. Never raises (returns current/0 on failure).
  - `def recompute_all(db, company_id, entity_type) -> int` — recomputes every lead/deal of that type for the company, returns count. Commits.

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/sales/test_scoring_recompute.py
from app.models.sales.lead import Lead
from app.models.sales.scoring import ScoringRule
from app.services.scoring.recompute import recompute_one, recompute_all, active_rules
from tests.helpers.factories import create_company


def test_recompute_one_sets_score(db):
    company = create_company(db, name="RC1", company_code="RC1")
    db.add(ScoringRule(company_id=company.id, entity_type="lead",
                       field="source", operator="eq", value="Referral",
                       points=25, is_active=True))
    lead = Lead(company_id=company.id, name="A", source="Referral", status="Active")
    db.add(lead)
    db.commit()
    total = recompute_one(db, lead, "lead")
    db.commit()
    assert total == 25
    assert lead.score == 25
    assert lead.score_updated_at is not None


def test_active_rules_excludes_inactive_and_other_type(db):
    company = create_company(db, name="RC2", company_code="RC2")
    db.add(ScoringRule(company_id=company.id, entity_type="lead",
                       field="source", operator="eq", value="X", points=1, is_active=True))
    db.add(ScoringRule(company_id=company.id, entity_type="lead",
                       field="source", operator="eq", value="Y", points=1, is_active=False))
    db.add(ScoringRule(company_id=company.id, entity_type="deal",
                       field="amount", operator="gt", value="1", points=1, is_active=True))
    db.commit()
    rules = active_rules(db, company.id, "lead")
    assert len(rules) == 1


def test_recompute_all_counts_rows(db):
    company = create_company(db, name="RC3", company_code="RC3")
    db.add(ScoringRule(company_id=company.id, entity_type="lead",
                       field="email", operator="is_set", points=5, is_active=True))
    db.add(Lead(company_id=company.id, name="A", email="a@b.com", status="Active"))
    db.add(Lead(company_id=company.id, name="B", email=None, status="Active"))
    db.commit()
    n = recompute_all(db, company.id, "lead")
    assert n == 2
    scores = sorted(l.score for l in db.query(Lead).filter(Lead.company_id == company.id).all())
    assert scores == [0, 5]
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd backend && python -m pytest tests/sales/test_scoring_recompute.py -v`
Expected: FAIL (module missing).

- [ ] **Step 3: Implement**

```python
# backend/app/services/scoring/recompute.py
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.sales.deal import Deal
from app.models.sales.lead import Lead
from app.models.sales.scoring import ScoringRule
from app.services.scoring.engine import score_entity

_MODELS = {"lead": Lead, "deal": Deal}


def active_rules(db: Session, company_id: int, entity_type: str) -> list:
    return (
        db.query(ScoringRule)
        .filter(
            ScoringRule.company_id == company_id,
            ScoringRule.entity_type == entity_type,
            ScoringRule.is_active == True,  # noqa: E712
        )
        .all()
    )


def recompute_one(db: Session, entity, entity_type: str, rules=None) -> int:
    try:
        if rules is None:
            rules = active_rules(db, entity.company_id, entity_type)
        total = score_entity(entity, rules)["total"]
        entity.score = total
        entity.score_updated_at = datetime.now(timezone.utc)
        return total
    except Exception:
        return entity.score or 0


def recompute_all(db: Session, company_id: int, entity_type: str) -> int:
    model = _MODELS[entity_type]
    rules = active_rules(db, company_id, entity_type)
    rows = db.query(model).filter(model.company_id == company_id).all()
    for row in rows:
        recompute_one(db, row, entity_type, rules=rules)
    db.commit()
    return len(rows)
```

- [ ] **Step 4: Run to verify pass**

Run: `cd backend && python -m pytest tests/sales/test_scoring_recompute.py -v`
Expected: PASS.

---

### Task 4: Scoring rules API router

**Files:**
- Create: `backend/app/routers/sales/scoring.py`
- Modify: `backend/app/main.py` (import + `include_router`)
- Test: `backend/tests/sales/test_scoring_api.py`

**Interfaces:**
- Consumes: `require_admin_or_md`, `get_current_user`, `apply_company_scope`, `ensure_company_access`, `active_rules`/`recompute_all` (Task 3), `fields_for`/`OPERATORS` (Task 2).
- Produces routes under `/api/scoring`: `GET/POST /rules`, `PUT/DELETE /rules/{id}`, `POST /recompute`.

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/sales/test_scoring_api.py
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


def _login(client, db, code, role="admin"):
    company = create_company(db, name=f"Co {code}", company_code=code)
    user = create_active_user(db, email=f"{role}@{code.lower()}.com",
                              role=role, company_id=company.id)
    login_user(client, user.email)
    return company, user


def test_create_and_list_rule(client, db):
    _login(client, db, "SCA")
    resp = client.post("/api/scoring/rules", json={
        "entity_type": "lead", "field": "source",
        "operator": "eq", "value": "Referral", "points": 20,
    })
    assert resp.status_code == 201, resp.text
    rid = resp.json()["id"]
    listed = client.get("/api/scoring/rules?entity_type=lead").json()
    assert any(r["id"] == rid for r in listed["items"])


def test_reject_unknown_field(client, db):
    _login(client, db, "SCB")
    resp = client.post("/api/scoring/rules", json={
        "entity_type": "lead", "field": "secret_sauce",
        "operator": "eq", "value": "x", "points": 5,
    })
    assert resp.status_code == 400


def test_reject_operator_not_valid_for_field(client, db):
    _login(client, db, "SCC")
    resp = client.post("/api/scoring/rules", json={
        "entity_type": "lead", "field": "email",
        "operator": "gt", "value": "5", "points": 5,
    })
    assert resp.status_code == 400


def test_sales_cannot_create_rule(client, db):
    _login(client, db, "SCD", role="sales")
    resp = client.post("/api/scoring/rules", json={
        "entity_type": "lead", "field": "source",
        "operator": "eq", "value": "Referral", "points": 20,
    })
    assert resp.status_code == 403


def test_recompute_endpoint(client, db):
    company, _ = _login(client, db, "SCE")
    client.post("/api/scoring/rules", json={
        "entity_type": "lead", "field": "email",
        "operator": "is_set", "points": 5,
    })
    resp = client.post("/api/scoring/recompute", json={"entity_type": "lead"})
    assert resp.status_code == 200, resp.text
    assert "updated" in resp.json()


def test_delete_rule(client, db):
    _login(client, db, "SCF")
    rid = client.post("/api/scoring/rules", json={
        "entity_type": "deal", "field": "amount",
        "operator": "gte", "value": "10000", "points": 15,
    }).json()["id"]
    assert client.delete(f"/api/scoring/rules/{rid}").status_code == 204
    assert client.delete(f"/api/scoring/rules/{rid}").status_code == 404
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd backend && python -m pytest tests/sales/test_scoring_api.py -v`
Expected: FAIL (404s — router not mounted).

- [ ] **Step 3: Implement the router**

```python
# backend/app/routers/sales/scoring.py
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.core.user import User
from app.models.sales.scoring import ScoringRule
from app.services.scoring.engine import fields_for, OPERATORS
from app.services.scoring.recompute import recompute_all
from app.utils.dependencies import (
    apply_company_scope,
    ensure_company_access,
    get_current_user,
    require_admin_or_md,
)

router = APIRouter()

_ENTITY_TYPES = {"lead", "deal"}


class ScoringRuleIn(BaseModel):
    entity_type: str
    field: str
    operator: str
    value: Optional[str] = None
    points: int
    is_active: Optional[bool] = True


class ScoringRulePatch(BaseModel):
    field: Optional[str] = None
    operator: Optional[str] = None
    value: Optional[str] = None
    points: Optional[int] = None
    is_active: Optional[bool] = None


def _serialize(rule: ScoringRule) -> dict:
    return {
        "id": rule.id,
        "entity_type": rule.entity_type,
        "field": rule.field,
        "operator": rule.operator,
        "value": rule.value,
        "points": rule.points,
        "is_active": rule.is_active,
    }


def _validate(entity_type: str, field: str, operator: str, value) -> None:
    if entity_type not in _ENTITY_TYPES:
        raise HTTPException(status_code=400, detail="entity_type must be 'lead' or 'deal'")
    fields = fields_for(entity_type)
    if field not in fields:
        raise HTTPException(status_code=400, detail=f"Invalid field: {field}")
    if operator not in OPERATORS:
        raise HTTPException(status_code=400, detail=f"Invalid operator: {operator}")
    if operator not in fields[field]:
        raise HTTPException(
            status_code=400,
            detail=f"Operator '{operator}' not valid for field '{field}'",
        )
    if operator not in ("is_set", "is_empty") and (value is None or str(value).strip() == ""):
        raise HTTPException(status_code=400, detail="value is required for this operator")


def _get_rule(db: Session, rule_id: int, current_user: User) -> ScoringRule:
    rule = (
        apply_company_scope(db.query(ScoringRule), ScoringRule, current_user)
        .filter(ScoringRule.id == rule_id)
        .first()
    )
    if rule is None:
        raise HTTPException(status_code=404, detail="Rule not found")
    ensure_company_access(rule, current_user)
    return rule


@router.get("/rules")
def list_rules(
    entity_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.company_id is None:
        raise HTTPException(status_code=403, detail="User must belong to a company")
    q = apply_company_scope(db.query(ScoringRule), ScoringRule, current_user)
    if entity_type is not None:
        q = q.filter(ScoringRule.entity_type == entity_type)
    rows = q.order_by(ScoringRule.id.asc()).all()
    return {"items": [_serialize(r) for r in rows], "total": len(rows)}


@router.post("/rules", status_code=status.HTTP_201_CREATED)
def create_rule(
    payload: ScoringRuleIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    if current_user.company_id is None:
        raise HTTPException(status_code=403, detail="User must belong to a company")
    _validate(payload.entity_type, payload.field, payload.operator, payload.value)
    rule = ScoringRule(
        company_id=current_user.company_id,
        entity_type=payload.entity_type,
        field=payload.field,
        operator=payload.operator,
        value=payload.value,
        points=payload.points,
        is_active=payload.is_active if payload.is_active is not None else True,
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)
    recompute_all(db, current_user.company_id, payload.entity_type)
    return _serialize(rule)


@router.put("/rules/{rule_id:int}")
def update_rule(
    rule_id: int,
    payload: ScoringRulePatch,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    rule = _get_rule(db, rule_id, current_user)
    data = payload.model_dump(exclude_unset=True)
    field = data.get("field", rule.field)
    operator = data.get("operator", rule.operator)
    value = data.get("value", rule.value)
    _validate(rule.entity_type, field, operator, value)
    rule.field = field
    rule.operator = operator
    rule.value = value
    if "points" in data and data["points"] is not None:
        rule.points = data["points"]
    if "is_active" in data and data["is_active"] is not None:
        rule.is_active = data["is_active"]
    db.commit()
    db.refresh(rule)
    recompute_all(db, current_user.company_id, rule.entity_type)
    return _serialize(rule)


@router.delete("/rules/{rule_id:int}", status_code=status.HTTP_204_NO_CONTENT)
def delete_rule(
    rule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    rule = _get_rule(db, rule_id, current_user)
    entity_type = rule.entity_type
    db.delete(rule)
    db.commit()
    recompute_all(db, current_user.company_id, entity_type)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


class RecomputeIn(BaseModel):
    entity_type: str


@router.post("/recompute")
def recompute(
    payload: RecomputeIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    if payload.entity_type not in _ENTITY_TYPES:
        raise HTTPException(status_code=400, detail="entity_type must be 'lead' or 'deal'")
    n = recompute_all(db, current_user.company_id, payload.entity_type)
    return {"updated": n, "entity_type": payload.entity_type}
```

- [ ] **Step 4: Mount the router**

In `backend/app/main.py`, near the other sales router imports (around line 32):

```python
from app.routers.sales.scoring import router as scoring_router
```

Near the other `include_router` calls (around line 161):

```python
app.include_router(scoring_router, prefix="/api/scoring", tags=["Scoring"])
```

- [ ] **Step 5: Run to verify pass**

Run: `cd backend && python -m pytest tests/sales/test_scoring_api.py -v`
Expected: PASS.

---

### Task 5: Live score endpoints on lead & deal detail

**Files:**
- Modify: `backend/app/routers/sales/leads.py` (add `GET /{lead_id:int}/score`)
- Modify: `backend/app/routers/sales/deals.py` (add `GET /{deal_id:int}/score`)
- Test: `backend/tests/sales/test_scoring_detail.py`

**Interfaces:**
- Consumes: `active_rules` (Task 3), `score_entity` (Task 2).
- Produces: `GET /api/leads/{id}/score` and `GET /api/deals/{id}/score` → `{"score": int, "score_updated_at": str|None, "breakdown": [...]}` computed live (no persist).

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/sales/test_scoring_detail.py
from app.models.sales.lead import Lead
from app.models.sales.scoring import ScoringRule
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


def _login(client, db, code):
    company = create_company(db, name=f"Co {code}", company_code=code)
    user = create_active_user(db, email=f"admin@{code.lower()}.com",
                              role="admin", company_id=company.id)
    login_user(client, user.email)
    return company, user


def test_lead_score_breakdown_live(client, db):
    company, _ = _login(client, db, "SD1")
    db.add(ScoringRule(company_id=company.id, entity_type="lead",
                       field="source", operator="eq", value="Referral",
                       points=20, is_active=True))
    lead = Lead(company_id=company.id, name="A", source="Referral", status="Active")
    db.add(lead)
    db.commit()
    db.refresh(lead)
    resp = client.get(f"/api/leads/{lead.id}/score")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["score"] == 20
    assert body["breakdown"][0]["matched"] is True


def test_lead_score_foreign_id_404(client, db):
    _login(client, db, "SD2")
    assert client.get("/api/leads/999999/score").status_code == 404
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd backend && python -m pytest tests/sales/test_scoring_detail.py -v`
Expected: FAIL (404 on the valid lead — route missing).

- [ ] **Step 3: Add the lead endpoint**

In `backend/app/routers/sales/leads.py`, add near the top with the other imports:

```python
from app.services.scoring.engine import score_entity
from app.services.scoring.recompute import active_rules
```

Add this route (place it beside the existing `get_lead` handler, e.g. after line 630):

```python
@router.get("/{lead_id:int}/score")
def get_lead_score(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    lead = apply_company_scope(db.query(Lead), Lead, current_user).filter(Lead.id == lead_id).first()
    if lead is None:
        raise HTTPException(status_code=404, detail="Lead not found")
    ensure_company_access(lead, current_user)
    result = score_entity(lead, active_rules(db, lead.company_id, "lead"))
    return {
        "score": result["total"],
        "score_updated_at": lead.score_updated_at.isoformat() if lead.score_updated_at else None,
        "breakdown": result["breakdown"],
    }
```

> Verify `ensure_company_access` and `HTTPException` are already imported in `leads.py` (they are used elsewhere in the file). If not, add them to the existing `from app.utils.dependencies import (...)` / `from fastapi import (...)` lines.

- [ ] **Step 4: Add the deal endpoint**

In `backend/app/routers/sales/deals.py`, add imports:

```python
from app.services.scoring.engine import score_entity
from app.services.scoring.recompute import active_rules
```

Add this route beside `get_deal` (after line 250):

```python
@router.get("/{deal_id:int}/score")
def get_deal_score(
    deal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    deal = apply_company_scope(db.query(Deal), Deal, current_user).filter(Deal.id == deal_id).first()
    if deal is None:
        raise HTTPException(status_code=404, detail="Deal not found")
    ensure_company_access(deal, current_user)
    result = score_entity(deal, active_rules(db, deal.company_id, "deal"))
    return {
        "score": result["total"],
        "score_updated_at": deal.score_updated_at.isoformat() if deal.score_updated_at else None,
        "breakdown": result["breakdown"],
    }
```

- [ ] **Step 5: Run to verify pass**

Run: `cd backend && python -m pytest tests/sales/test_scoring_detail.py -v`
Expected: PASS.

---

### Task 6: Persist score on write; list sort + filter

**Files:**
- Modify: `backend/app/routers/sales/leads.py` (`create_lead` ~line 789 area, `update_lead` ~line 814, `list_leads` ~line 391)
- Modify: `backend/app/routers/sales/deals.py` (`create_deal`, `update_deal`, `move_deal_stage`, `list_deals`, `_serialize_deal`)
- Modify: `backend/app/schemas/sales/sales.py` (`LeadResponse`, add `score`)
- Test: `backend/tests/sales/test_scoring_persist.py`

**Interfaces:**
- Consumes: `recompute_one` (Task 3).
- Produces: `leads.score` / `deals.score` populated on create+update; list items include `score`; lists accept `sort=score` and `min_score=<int>`.

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/sales/test_scoring_persist.py
from app.models.sales.scoring import ScoringRule
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


def _login(client, db, code):
    company = create_company(db, name=f"Co {code}", company_code=code)
    user = create_active_user(db, email=f"admin@{code.lower()}.com",
                              role="admin", company_id=company.id)
    login_user(client, user.email)
    return company, user


def test_lead_score_persisted_on_create(client, db):
    company, _ = _login(client, db, "SP1")
    client.post("/api/scoring/rules", json={
        "entity_type": "lead", "field": "source",
        "operator": "eq", "value": "Referral", "points": 20,
    })
    resp = client.post("/api/leads", json={"name": "A", "source": "Referral"})
    assert resp.status_code == 201, resp.text
    lead_id = resp.json()["id"]
    detail = client.get(f"/api/leads/{lead_id}").json()
    assert detail.get("score") == 20


def test_list_min_score_filter_and_sort(client, db):
    company, _ = _login(client, db, "SP2")
    client.post("/api/scoring/rules", json={
        "entity_type": "lead", "field": "source",
        "operator": "eq", "value": "Referral", "points": 30,
    })
    client.post("/api/leads", json={"name": "hi", "source": "Referral"})
    client.post("/api/leads", json={"name": "lo", "source": "Cold"})
    filtered = client.get("/api/leads?min_score=10").json()["items"]
    assert [l["name"] for l in filtered] == ["hi"]
    ordered = client.get("/api/leads?sort=score").json()["items"]
    assert ordered[0]["name"] == "hi"
    assert all("score" in l for l in ordered)
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd backend && python -m pytest tests/sales/test_scoring_persist.py -v`
Expected: FAIL (`score` absent / filter unsupported).

- [ ] **Step 3: Hook recompute into lead create/update**

In `backend/app/routers/sales/leads.py`, add import (with the Task 5 imports):

```python
from app.services.scoring.recompute import recompute_one
```

In `create_lead`, after `assign_lead_by_territory(db, new_lead)` (line 789) and before the final commit, add:

```python
    recompute_one(db, new_lead, "lead")
```

If the function has already committed before line 789, instead call `recompute_one(db, new_lead, "lead")` immediately after the existing `db.commit()`/`db.refresh(new_lead)` and follow with `db.commit()`. Read the surrounding lines first and place it so `new_lead.score` is written and committed once.

In `update_lead` (line 814), after the fields are mutated and before the final `db.commit()`, add:

```python
    recompute_one(db, lead, "lead")
```

(Use whatever the local lead variable is named in that handler.)

- [ ] **Step 4: Add `score` to lead list + response schema**

In `backend/app/schemas/sales/sales.py`, add to `LeadResponse` (after `assigned_to_name`, before `class Config`):

```python
    score: Optional[int] = None
```

In `list_leads` (`backend/app/routers/sales/leads.py`), add query params to the signature:

```python
    sort: Optional[str] = Query(None),
    min_score: Optional[int] = Query(None),
```

After the `search` filter block and before `total = query.count()`:

```python
    if min_score is not None:
        query = query.filter(Lead.score >= min_score)
    if sort == "score":
        from sqlalchemy import func as _func
        order = _func.coalesce(Lead.score, 0).desc()
    else:
        order = Lead.created_at.desc()
```

Change the `leads = query.order_by(Lead.created_at.desc())...` line to use `order`:

```python
    leads = query.order_by(order).offset(skip).limit(limit).all()
```

Add `"score": lead.score,` to each item dict in the returned `items` list.

- [ ] **Step 5: Hook recompute + list score into deals**

In `backend/app/routers/sales/deals.py` add `from app.services.scoring.recompute import recompute_one` (with Task 5 imports).

In `create_deal`, `update_deal`, and `move_deal_stage`, after the deal's fields are set and before the final `db.commit()`, add `recompute_one(db, deal, "deal")` (match the local variable name).

In `_serialize_deal`, add `"score": deal.score,` to the payload dict.

In `list_deals`, add params `sort: Optional[str] = Query(None), min_score: Optional[int] = Query(None)`; before `total = query.count()` add:

```python
    if min_score is not None:
        query = query.filter(Deal.score >= min_score)
    from sqlalchemy import func as _func
    order = _func.coalesce(Deal.score, 0).desc() if sort == "score" else Deal.created_at.desc()
```

Change `deals = query.order_by(Deal.created_at.desc())...` to `query.order_by(order)`.

- [ ] **Step 6: Run to verify pass + no regressions in leads/deals**

Run: `cd backend && python -m pytest tests/sales/test_scoring_persist.py tests/sales/test_deals_board.py -v`
Expected: PASS. Also run any existing `tests/sales/test_leads*.py` if present.

---

### Task 7: Privacy export/erase

**Files:**
- Modify: `backend/app/services/privacy/dsr.py` (`export_lead` ~line 51, `erase_lead` ~line 109)
- Test: `backend/tests/privacy/test_scoring_privacy.py`

**Interfaces:**
- Produces: lead export includes `"score"`; lead erase sets `score = None`, `score_updated_at = None`.

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/privacy/test_scoring_privacy.py
from app.models.sales.lead import Lead
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


def _login(client, db, code):
    company = create_company(db, name=f"Co {code}", company_code=code)
    user = create_active_user(db, email=f"admin@{code.lower()}.com",
                              role="admin", company_id=company.id)
    login_user(client, user.email)
    return company, user


def test_export_includes_score_and_erase_clears_it(client, db):
    company, _ = _login(client, db, "PSC")
    lead = Lead(company_id=company.id, name="A", email="a@b.com", status="Active", score=42)
    db.add(lead)
    db.commit()
    db.refresh(lead)
    exported = client.get(f"/api/privacy/export/leads/{lead.id}").json()
    assert exported["score"] == 42
    assert client.post(f"/api/privacy/erase/leads/{lead.id}").status_code == 200
    db.refresh(lead)
    assert lead.score is None
    assert lead.score_updated_at is None
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd backend && python -m pytest tests/privacy/test_scoring_privacy.py -v`
Expected: FAIL (`score` missing from export).

- [ ] **Step 3: Update dsr.py**

In `export_lead`'s returned dict (after `"linkedin_url": lead.linkedin_url,`):

```python
        "score": lead.score,
```

In `erase_lead`, after `lead.enrichment_source = None`:

```python
    lead.score = None
    lead.score_updated_at = None
```

- [ ] **Step 4: Run to verify pass + privacy suite**

Run: `cd backend && python -m pytest tests/privacy/ -v`
Expected: PASS.

---

### Task 8: Cross-tenant isolation tests

**Files:**
- Test: `backend/tests/sales/test_scoring_cross_tenant.py`

**Interfaces:**
- Consumes: all scoring routes.

- [ ] **Step 1: Write the tests**

```python
# backend/tests/sales/test_scoring_cross_tenant.py
from app.models.sales.deal import Deal
from app.models.sales.lead import Lead
from app.models.sales.scoring import ScoringRule
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


def _admin(client, db, code):
    company = create_company(db, name=f"Co {code}", company_code=code)
    admin = create_active_user(db, email=f"admin@{code.lower()}.com",
                               role="admin", company_id=company.id)
    return company, admin


def test_foreign_rule_update_and_delete_404(client, db):
    company_a, admin_a = _admin(client, db, "XTA")
    company_b, admin_b = _admin(client, db, "XTB")
    rule = ScoringRule(company_id=company_a.id, entity_type="lead",
                       field="source", operator="eq", value="X", points=1, is_active=True)
    db.add(rule)
    db.commit()
    db.refresh(rule)

    login_user(client, admin_b.email)  # B attacks A's rule
    assert client.put(f"/api/scoring/rules/{rule.id}", json={"points": 99}).status_code == 404
    assert client.delete(f"/api/scoring/rules/{rule.id}").status_code == 404
    assert all(r["id"] != rule.id for r in client.get("/api/scoring/rules").json()["items"])

    login_user(client, admin_a.email)  # positive control
    assert client.put(f"/api/scoring/rules/{rule.id}", json={"points": 5}).status_code == 200


def test_foreign_lead_and_deal_score_404(client, db):
    company_a, admin_a = _admin(client, db, "XTC")
    company_b, admin_b = _admin(client, db, "XTD")
    lead = Lead(company_id=company_a.id, name="A", status="Active")
    db.add(lead)
    db.commit()
    db.refresh(lead)

    login_user(client, admin_b.email)
    assert client.get(f"/api/leads/{lead.id}/score").status_code == 404

    login_user(client, admin_a.email)  # positive control
    assert client.get(f"/api/leads/{lead.id}/score").status_code == 200
```

- [ ] **Step 2: Run to verify pass**

Run: `cd backend && python -m pytest tests/sales/test_scoring_cross_tenant.py -v`
Expected: PASS.

- [ ] **Step 3: Full backend suite green**

Run: `cd backend && python -m pytest -q`
Expected: all pass (prior baseline + the new scoring tests). Investigate any regression before proceeding.

---

### Task 9: Frontend — settings page + score badge

**Files:**
- Create: `frontend/app/settings/scoring/page.jsx` (mirror `frontend/app/settings/territories/page.jsx`)
- Modify: the settings sidebar/nav that lists Territories, to add a Scoring link (admin/md only)
- Modify: lead detail component + deal detail component to show score badge + breakdown
- Test: `frontend` build

**Interfaces:**
- Consumes: `/api/scoring/rules`, `/api/scoring/recompute`, `/api/leads/{id}/score`, `/api/deals/{id}/score`.

- [ ] **Step 1: Read the territories page as the template**

Run: `cat frontend/app/settings/territories/page.jsx` and the file that renders the settings nav (grep for `territories` under `frontend/`). Mirror its data-fetch, role guard, table, and create-form structure.

- [ ] **Step 2: Build `/settings/scoring`**

A page with: an entity-type toggle (Leads / Deals); a table of rules (`field`, `operator`, `value`, `points`, `is_active`, delete); a create form whose **field** dropdown is populated from a static map matching the backend whitelist (source/industry/status/email/phone/website/days_since_last_contact/age_days for leads; amount/stage_id/probability/days_to_expected_close/age_days for deals) and whose **operator** dropdown filters to the operators valid for the chosen field; and a "Recompute now" button calling `POST /api/scoring/recompute`. Reuse the axios client and toast patterns from the territories page. Guard to admin/md exactly as territories does.

- [ ] **Step 3: Add the sidebar link**

In the same nav file that shows the Territories settings link, add a Scoring link pointing to `/settings/scoring`, gated to the same roles.

- [ ] **Step 4: Score badge on lead + deal detail**

On lead detail and deal detail pages, fetch `GET /api/{leads|deals}/{id}/score` and render a small badge showing the numeric score with an expandable list of matched rules (`field operator value → +points`). Follow the existing detail-panel styling; handle loading/empty (no rules → score 0, show "No scoring rules configured").

- [ ] **Step 5: Build**

Run: `cd frontend && npm run build`
Expected: clean build, no type/lint errors. If the repo has a lighter check (e.g. `npm run lint`), run that too.

---

## Self-Review

- **Spec coverage:** §1 scope → Tasks 2/4/5/6 (both types). §2–5 rules/operators/fields/computed → Task 2 + Task 4 validation. §6 engine → Task 2. §7 computed sentinels → Task 2. §8 stored score → Task 1 + Task 6. §9 recompute triggers (a/b/c) → Task 6 (write hooks), Task 4 (rule-change + bulk endpoint). §10 API → Tasks 4/5/6. §11 cross-tenant → Task 8. §12 migration → Task 1. §13 privacy → Task 7. §14 UI → Task 9. All covered.
- **Placeholder scan:** every code step has real code; frontend Task 9 references concrete endpoints and the territories template rather than "TBD".
- **Type consistency:** `score_entity(entity, rules, now)` returns `{"total", "breakdown"}` — consumed identically in Tasks 3/5. `active_rules`/`recompute_one`/`recompute_all` signatures match across Tasks 3/4/5/6. `fields_for`/`OPERATORS` defined in Task 2, used in Task 4. Field whitelist in Task 2 matches the frontend dropdown map in Task 9.
- **Known follow-up for the executor:** several modify-steps say "before the final commit" — the executor MUST read the actual handler first (line numbers are approximate) and place the `recompute_one` call where `.score` is written and committed exactly once. Flagged, not hidden.
