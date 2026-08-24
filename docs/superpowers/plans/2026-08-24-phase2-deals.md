# Deal Object & Configurable Pipeline — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a self-contained Deal object with a company-configurable stage pipeline and an amount-weighted forecast board, without touching the existing lead-count dashboards.

**Architecture:** Three new tables (`pipelines`, `pipeline_stages`, `deals`) created via `Base.metadata.create_all` (no Alembic — two pre-existing heads, same decision as Phase 1). A lazy `ensure_default_pipeline(db, company_id)` seeds a default 5-stage pipeline per tenant on first use. A new `/api/deals` router mirrors the existing sales-router conventions (company scoping via `apply_company_scope`, `ensure_company_access`, audit via `log_activity`). A minimal Next.js deals surface reuses the `sales/leads` patterns.

**Tech Stack:** FastAPI, SQLAlchemy (non-native string enums), Pydantic, pytest (in-memory SQLite), Next.js (JSX).

**Spec:** [`docs/superpowers/specs/2026-08-24-phase2-deals-design.md`](../specs/2026-08-24-phase2-deals-design.md)

## Global Constraints

- **Money is `Numeric(12,2)`**, never Float (match `Invoice`). Currency `String(3)` default `"INR"`.
- **Enums are non-native string enums:** `Column(Enum(X, values_callable=lambda x: [e.value for e in x], native_enum=False), default=...)` — match the existing pattern in `app/models/core/enums.py` consumers.
- **Every tenant table has `company_id` FK → `companies.id`, indexed, `nullable=False`.** All queries go through `apply_company_scope(db.query(Model), Model, current_user)`; all by-id fetches also call `ensure_company_access(entity, current_user)`.
- **No Alembic migration.** New tables come from `create_all`; models must be imported in `app/models/sales/__init__.py` so `create_missing_tables.py` (which does `from app.models.sales import *`) picks them up. No new columns on existing tables.
- **Cross-tenant access returns 404, not 403**, for by-id read/mutate/delete (Phase-0 gate invariant).
- Tests run from `backend/`: `cd backend && python -m pytest`.
- Audit via `log_activity(db, user=current_user, action=..., entity_type="deal", entity_id=..., entity_name=..., after=...)`; caller commits.

---

### Task 1: Models — enum + pipelines/pipeline_stages/deals tables

**Files:**
- Modify: `backend/app/models/core/enums.py` (add `DealStageType`)
- Create: `backend/app/models/sales/pipeline.py` (`Pipeline`, `PipelineStage`)
- Create: `backend/app/models/sales/deal.py` (`Deal`)
- Modify: `backend/app/models/sales/__init__.py` (export the three models)
- Test: `backend/tests/sales/test_deals_schema.py`

**Interfaces:**
- Produces: `DealStageType(OPEN="open", WON="won", LOST="lost")`; `Pipeline(id, company_id, name, is_default, is_active, created_at, updated_at)`; `PipelineStage(id, company_id, pipeline_id, name, position, stage_type, default_probability, is_active, created_at)`; `Deal(id, company_id, title, amount, currency, pipeline_id, stage_id, probability, expected_close, closed_at, lead_id, client_id, assigned_to_id, created_by_id, team_id, source, created_at, updated_at)`.

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/sales/test_deals_schema.py
from decimal import Decimal
from sqlalchemy import inspect

from app.models.core.enums import DealStageType
from app.models.sales.pipeline import Pipeline, PipelineStage
from app.models.sales.deal import Deal


def test_deal_tables_exist_and_have_company_id(db_engine):
    tables = set(inspect(db_engine).get_table_names())
    assert {"pipelines", "pipeline_stages", "deals"} <= tables
    for t in ("pipelines", "pipeline_stages", "deals"):
        cols = {c["name"] for c in inspect(db_engine).get_columns(t)}
        assert "company_id" in cols


def test_deal_stage_type_values():
    assert DealStageType.OPEN.value == "open"
    assert DealStageType.WON.value == "won"
    assert DealStageType.LOST.value == "lost"


def test_can_persist_a_deal(db):
    pipe = Pipeline(company_id=1, name="Sales", is_default=True)
    db.add(pipe); db.flush()
    stage = PipelineStage(company_id=1, pipeline_id=pipe.id, name="Qualification",
                          position=1, stage_type=DealStageType.OPEN, default_probability=10)
    db.add(stage); db.flush()
    deal = Deal(company_id=1, title="Acme roof", amount=Decimal("50000.00"),
                pipeline_id=pipe.id, stage_id=stage.id)
    db.add(deal); db.commit(); db.refresh(deal)
    assert deal.id is not None
    assert deal.currency == "INR"
    assert deal.amount == Decimal("50000.00")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/sales/test_deals_schema.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.models.sales.pipeline'` (and `DealStageType` import error).

- [ ] **Step 3: Add the enum**

In `backend/app/models/core/enums.py`, append:

```python
class DealStageType(str, enum.Enum):
    OPEN = "open"
    WON = "won"
    LOST = "lost"
```

- [ ] **Step 4: Create the pipeline models**

```python
# backend/app/models/sales/pipeline.py
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.core.enums import DealStageType


class Pipeline(Base):
    __tablename__ = "pipelines"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    is_default = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    stages = relationship("PipelineStage", back_populates="pipeline",
                          cascade="all, delete-orphan", order_by="PipelineStage.position")


class PipelineStage(Base):
    __tablename__ = "pipeline_stages"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    pipeline_id = Column(Integer, ForeignKey("pipelines.id"), nullable=False)
    name = Column(String(255), nullable=False)
    position = Column(Integer, nullable=False)
    stage_type = Column(
        Enum(DealStageType, values_callable=lambda x: [e.value for e in x], native_enum=False),
        default=DealStageType.OPEN,
    )
    default_probability = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())

    pipeline = relationship("Pipeline", back_populates="stages")
```

- [ ] **Step 5: Create the deal model**

```python
# backend/app/models/sales/deal.py
from sqlalchemy import Column, Integer, String, DateTime, Date, ForeignKey, Numeric
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class Deal(Base):
    __tablename__ = "deals"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    amount = Column(Numeric(12, 2), default=0)
    currency = Column(String(3), default="INR")

    pipeline_id = Column(Integer, ForeignKey("pipelines.id"), nullable=False)
    stage_id = Column(Integer, ForeignKey("pipeline_stages.id"), nullable=False)
    probability = Column(Integer, nullable=True)  # None -> falls back to stage.default_probability
    expected_close = Column(Date, nullable=True)
    closed_at = Column(DateTime, nullable=True)

    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True)

    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=True)
    source = Column(String(100), nullable=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    pipeline = relationship("Pipeline")
    stage = relationship("PipelineStage")
```

- [ ] **Step 6: Export the models so create_all/tests see them**

In `backend/app/models/sales/__init__.py`, append:

```python
from .pipeline import Pipeline, PipelineStage
from .deal import Deal
```

- [ ] **Step 7: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/sales/test_deals_schema.py -v`
Expected: PASS (3 tests). The `db_engine` session fixture calls `create_all`, so the tables appear.

- [ ] **Step 8: Commit**

```bash
git add backend/app/models/core/enums.py backend/app/models/sales/pipeline.py backend/app/models/sales/deal.py backend/app/models/sales/__init__.py backend/tests/sales/test_deals_schema.py
git commit -m "feat(deals): add Pipeline, PipelineStage, Deal models"
```

---

### Task 2: Default-pipeline seed helper

**Files:**
- Create: `backend/app/services/sales/__init__.py` (empty package marker if absent)
- Create: `backend/app/services/sales/pipeline_seed.py`
- Test: `backend/tests/sales/test_pipeline_seed.py`

**Interfaces:**
- Consumes: `Pipeline`, `PipelineStage`, `DealStageType` from Task 1.
- Produces: `ensure_default_pipeline(db, company_id) -> Pipeline` — idempotent; creates one default pipeline named "Sales Pipeline" + 5 stages (Qualification/10/open, Proposal/40/open, Negotiation/70/open, Won/100/won, Lost/0/lost) if the company has no pipeline; commits; returns the default pipeline.

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/sales/test_pipeline_seed.py
from app.models.core.enums import DealStageType
from app.models.sales.pipeline import Pipeline, PipelineStage
from app.services.sales.pipeline_seed import ensure_default_pipeline


def test_seed_creates_one_pipeline_and_five_stages(db):
    pipe = ensure_default_pipeline(db, company_id=1)
    assert pipe.is_default is True
    stages = db.query(PipelineStage).filter(PipelineStage.pipeline_id == pipe.id).order_by(PipelineStage.position).all()
    assert [s.name for s in stages] == ["Qualification", "Proposal", "Negotiation", "Won", "Lost"]
    assert [s.default_probability for s in stages] == [10, 40, 70, 100, 0]
    assert stages[3].stage_type == DealStageType.WON
    assert stages[4].stage_type == DealStageType.LOST
    assert all(s.company_id == 1 for s in stages)


def test_seed_is_idempotent(db):
    ensure_default_pipeline(db, company_id=1)
    ensure_default_pipeline(db, company_id=1)
    assert db.query(Pipeline).filter(Pipeline.company_id == 1).count() == 1
    assert db.query(PipelineStage).filter(PipelineStage.company_id == 1).count() == 5


def test_seed_is_per_company(db):
    a = ensure_default_pipeline(db, company_id=1)
    b = ensure_default_pipeline(db, company_id=2)
    assert a.id != b.id
    assert db.query(Pipeline).count() == 2
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/sales/test_pipeline_seed.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.services.sales'`.

- [ ] **Step 3: Create the package marker (if missing)**

Create empty `backend/app/services/sales/__init__.py` (only if the directory does not already exist).

- [ ] **Step 4: Write the seed helper**

```python
# backend/app/services/sales/pipeline_seed.py
from sqlalchemy.orm import Session

from app.models.core.enums import DealStageType
from app.models.sales.pipeline import Pipeline, PipelineStage

_DEFAULT_STAGES = [
    ("Qualification", DealStageType.OPEN, 10),
    ("Proposal", DealStageType.OPEN, 40),
    ("Negotiation", DealStageType.OPEN, 70),
    ("Won", DealStageType.WON, 100),
    ("Lost", DealStageType.LOST, 0),
]


def ensure_default_pipeline(db: Session, company_id: int) -> Pipeline:
    """Idempotently create a company's default pipeline + stages. Returns the default pipeline."""
    existing = (
        db.query(Pipeline)
        .filter(Pipeline.company_id == company_id, Pipeline.is_default == True)  # noqa: E712
        .first()
    )
    if existing:
        return existing

    pipeline = Pipeline(company_id=company_id, name="Sales Pipeline", is_default=True, is_active=True)
    db.add(pipeline)
    db.flush()
    for position, (name, stage_type, prob) in enumerate(_DEFAULT_STAGES, start=1):
        db.add(PipelineStage(
            company_id=company_id, pipeline_id=pipeline.id, name=name,
            position=position, stage_type=stage_type, default_probability=prob,
        ))
    db.commit()
    db.refresh(pipeline)
    return pipeline
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/sales/test_pipeline_seed.py -v`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/sales/ backend/tests/sales/test_pipeline_seed.py
git commit -m "feat(deals): idempotent per-tenant default pipeline seeding"
```

---

### Task 3: Pydantic schemas + Deal CRUD router (create/list/get/patch/delete)

**Files:**
- Create: `backend/app/schemas/sales/deal.py`
- Create: `backend/app/routers/sales/deals.py`
- Modify: `backend/app/main.py` (register the router)
- Test: `backend/tests/sales/test_deals_api.py`

**Interfaces:**
- Consumes: models + `ensure_default_pipeline` from Tasks 1–2; `apply_company_scope`, `ensure_company_access`, `get_current_user` from `app.utils.dependencies`; `log_activity` from `app.utils.audit`.
- Produces: router at prefix `/api/deals` with `POST /`, `GET /`, `GET /{deal_id}`, `PATCH /{deal_id}`, `DELETE /{deal_id}`. `DealResponse` shape: `{id, title, amount, currency, pipeline_id, stage_id, stage_name, stage_type, probability, effective_probability, expected_close, closed_at, lead_id, client_id, assigned_to_id, source, created_at}`.
- Produces helper `_serialize_deal(deal, stage) -> dict` and `_effective_probability(deal, stage) -> int`, reused by Task 4.

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/sales/test_deals_api.py
from app.models.sales.pipeline import Pipeline, PipelineStage
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


def _company_with_admin(db, code="C1"):
    company = create_company(db, name=f"Co {code}", company_code=code)
    admin = create_active_user(db, email=f"admin@{code}.com", role="admin", company_id=company.id)
    return company, admin


def test_create_deal_autoseeds_pipeline_and_returns_first_stage(client, db):
    company, admin = _company_with_admin(db)
    login_user(client, admin.email)
    resp = client.post("/api/deals", json={"title": "Acme roof", "amount": "50000.00"})
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["title"] == "Acme roof"
    assert body["stage_name"] == "Qualification"
    assert body["effective_probability"] == 10  # from stage default
    # pipeline got auto-seeded
    assert db.query(Pipeline).filter(Pipeline.company_id == company.id).count() == 1


def test_create_deal_rejects_negative_amount(client, db):
    company, admin = _company_with_admin(db)
    login_user(client, admin.email)
    resp = client.post("/api/deals", json={"title": "Bad", "amount": "-5"})
    assert resp.status_code == 400


def test_create_deal_rejects_stage_from_other_pipeline(client, db):
    company, admin = _company_with_admin(db)
    login_user(client, admin.email)
    # seed default pipeline via one create
    client.post("/api/deals", json={"title": "seed", "amount": "1"})
    # a foreign stage in a second pipeline
    other = Pipeline(company_id=company.id, name="Other", is_default=False)
    db.add(other); db.flush()
    foreign = PipelineStage(company_id=company.id, pipeline_id=other.id, name="X", position=1, default_probability=0)
    db.add(foreign); db.commit()
    default_pipe = db.query(Pipeline).filter(Pipeline.is_default == True).first()  # noqa: E712
    resp = client.post("/api/deals", json={
        "title": "mismatch", "amount": "1",
        "pipeline_id": default_pipe.id, "stage_id": foreign.id,
    })
    assert resp.status_code == 400


def test_list_get_patch_delete_roundtrip(client, db):
    company, admin = _company_with_admin(db)
    login_user(client, admin.email)
    created = client.post("/api/deals", json={"title": "D1", "amount": "100"}).json()
    did = created["id"]

    assert client.get("/api/deals").json()["total"] == 1
    assert client.get(f"/api/deals/{did}").json()["title"] == "D1"

    patched = client.patch(f"/api/deals/{did}", json={"amount": "250", "probability": 55})
    assert patched.status_code == 200
    assert patched.json()["effective_probability"] == 55  # explicit override wins

    assert client.delete(f"/api/deals/{did}").status_code in (200, 204)
    assert client.get(f"/api/deals/{did}").status_code == 404
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/sales/test_deals_api.py -v`
Expected: FAIL — 404s on `/api/deals` (router not registered).

- [ ] **Step 3: Write the schemas**

```python
# backend/app/schemas/sales/deal.py
from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, field_validator


class DealCreate(BaseModel):
    title: str
    amount: Decimal = Decimal("0")
    currency: str = "INR"
    pipeline_id: Optional[int] = None
    stage_id: Optional[int] = None
    probability: Optional[int] = None
    expected_close: Optional[date] = None
    lead_id: Optional[int] = None
    client_id: Optional[int] = None
    assigned_to_id: Optional[int] = None
    team_id: Optional[int] = None
    source: Optional[str] = None

    @field_validator("amount")
    @classmethod
    def amount_non_negative(cls, v: Decimal) -> Decimal:
        if v is not None and v < 0:
            raise ValueError("amount must be >= 0")
        return v

    @field_validator("probability")
    @classmethod
    def probability_in_range(cls, v):
        if v is not None and not (0 <= v <= 100):
            raise ValueError("probability must be between 0 and 100")
        return v


class DealUpdate(BaseModel):
    title: Optional[str] = None
    amount: Optional[Decimal] = None
    currency: Optional[str] = None
    probability: Optional[int] = None
    expected_close: Optional[date] = None
    lead_id: Optional[int] = None
    client_id: Optional[int] = None
    assigned_to_id: Optional[int] = None
    team_id: Optional[int] = None
    source: Optional[str] = None

    @field_validator("amount")
    @classmethod
    def amount_non_negative(cls, v):
        if v is not None and v < 0:
            raise ValueError("amount must be >= 0")
        return v

    @field_validator("probability")
    @classmethod
    def probability_in_range(cls, v):
        if v is not None and not (0 <= v <= 100):
            raise ValueError("probability must be between 0 and 100")
        return v


class DealStageUpdate(BaseModel):
    stage_id: int
```

Note: the create validator raises `ValueError`; FastAPI turns that into a 422, but the tests expect **400** for the domain rules. To keep a single clear code, do the negative-amount and range checks **in the router** returning `HTTPException(400)` instead of relying on the Pydantic validators for the HTTP code. Keep the validators as defense-in-depth but assert 400 via router checks (see Step 4). Adjust the test expectation only if you deliberately choose 422 — the plan standardizes on **400** for domain validation.

- [ ] **Step 4: Write the CRUD router**

```python
# backend/app/routers/sales/deals.py
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.utils.dependencies import get_current_user, apply_company_scope, ensure_company_access
from app.utils.audit import log_activity
from app.models.core.user import User
from app.models.sales.deal import Deal
from app.models.sales.pipeline import Pipeline, PipelineStage
from app.services.sales.pipeline_seed import ensure_default_pipeline
from app.schemas.sales.deal import DealCreate, DealUpdate

router = APIRouter()


def _role(user: User) -> str:
    r = getattr(user, "role", None)
    return str(getattr(r, "value", r)) if r is not None else ""


def _get_stage(db: Session, current_user: User, stage_id: int) -> Optional[PipelineStage]:
    return apply_company_scope(db.query(PipelineStage), PipelineStage, current_user).filter(
        PipelineStage.id == stage_id
    ).first()


def _effective_probability(deal: Deal, stage: PipelineStage) -> int:
    if deal.probability is not None:
        return deal.probability
    return stage.default_probability or 0


def _serialize_deal(deal: Deal, stage: PipelineStage) -> dict:
    return {
        "id": deal.id,
        "title": deal.title,
        "amount": str(deal.amount) if deal.amount is not None else "0",
        "currency": deal.currency,
        "pipeline_id": deal.pipeline_id,
        "stage_id": deal.stage_id,
        "stage_name": stage.name if stage else None,
        "stage_type": stage.stage_type.value if stage else None,
        "probability": deal.probability,
        "effective_probability": _effective_probability(deal, stage) if stage else None,
        "expected_close": deal.expected_close.isoformat() if deal.expected_close else None,
        "closed_at": deal.closed_at.isoformat() if deal.closed_at else None,
        "lead_id": deal.lead_id,
        "client_id": deal.client_id,
        "assigned_to_id": deal.assigned_to_id,
        "source": deal.source,
        "created_at": deal.created_at.isoformat() if deal.created_at else None,
    }


@router.post("", status_code=status.HTTP_201_CREATED)
def create_deal(payload: DealCreate, db: Session = Depends(get_db),
                current_user: User = Depends(get_current_user)):
    if payload.amount is not None and payload.amount < 0:
        raise HTTPException(status_code=400, detail="amount must be >= 0")

    pipeline_id = payload.pipeline_id
    stage_id = payload.stage_id
    if pipeline_id is None or stage_id is None:
        default_pipeline = ensure_default_pipeline(db, current_user.company_id)
        pipeline_id = pipeline_id or default_pipeline.id
        if stage_id is None:
            first_stage = apply_company_scope(db.query(PipelineStage), PipelineStage, current_user).filter(
                PipelineStage.pipeline_id == pipeline_id
            ).order_by(PipelineStage.position).first()
            if first_stage is None:
                raise HTTPException(status_code=400, detail="pipeline has no stages")
            stage_id = first_stage.id

    stage = _get_stage(db, current_user, stage_id)
    if stage is None or stage.pipeline_id != pipeline_id:
        raise HTTPException(status_code=400, detail="stage does not belong to pipeline")

    deal = Deal(
        company_id=current_user.company_id,
        title=payload.title,
        amount=payload.amount if payload.amount is not None else Decimal("0"),
        currency=payload.currency or "INR",
        pipeline_id=pipeline_id,
        stage_id=stage_id,
        probability=payload.probability,
        expected_close=payload.expected_close,
        lead_id=payload.lead_id,
        client_id=payload.client_id,
        assigned_to_id=payload.assigned_to_id,
        created_by_id=current_user.id,
        team_id=payload.team_id,
        source=payload.source,
    )
    db.add(deal)
    db.flush()
    log_activity(db, user=current_user, action="created", entity_type="deal",
                 entity_id=deal.id, entity_name=deal.title,
                 after={"amount": str(deal.amount), "stage_id": stage_id})
    db.commit()
    db.refresh(deal)
    return _serialize_deal(deal, stage)


@router.get("")
def list_deals(db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
               pipeline_id: Optional[int] = Query(None), stage_id: Optional[int] = Query(None),
               assigned_to_id: Optional[int] = Query(None),
               skip: int = 0, limit: int = 100):
    query = apply_company_scope(db.query(Deal), Deal, current_user)
    if _role(current_user) == "sales":
        query = query.filter(
            (Deal.assigned_to_id == current_user.id) | (Deal.assigned_to_id.is_(None))
        )
    if pipeline_id is not None:
        query = query.filter(Deal.pipeline_id == pipeline_id)
    if stage_id is not None:
        query = query.filter(Deal.stage_id == stage_id)
    if assigned_to_id is not None:
        query = query.filter(Deal.assigned_to_id == assigned_to_id)

    total = query.count()
    deals = query.order_by(Deal.created_at.desc()).offset(skip).limit(limit).all()
    stage_ids = {d.stage_id for d in deals}
    stage_map = {
        s.id: s for s in apply_company_scope(db.query(PipelineStage), PipelineStage, current_user)
        .filter(PipelineStage.id.in_(stage_ids or [-1])).all()
    }
    return {
        "items": [_serialize_deal(d, stage_map.get(d.stage_id)) for d in deals],
        "total": total, "skip": skip, "limit": limit,
    }


@router.get("/{deal_id:int}")
def get_deal(deal_id: int, db: Session = Depends(get_db),
             current_user: User = Depends(get_current_user)):
    deal = apply_company_scope(db.query(Deal), Deal, current_user).filter(Deal.id == deal_id).first()
    if deal is None:
        raise HTTPException(status_code=404, detail="Deal not found")
    ensure_company_access(deal, current_user)
    stage = _get_stage(db, current_user, deal.stage_id)
    return _serialize_deal(deal, stage)


@router.patch("/{deal_id:int}")
def update_deal(deal_id: int, payload: DealUpdate, db: Session = Depends(get_db),
                current_user: User = Depends(get_current_user)):
    deal = apply_company_scope(db.query(Deal), Deal, current_user).filter(Deal.id == deal_id).first()
    if deal is None:
        raise HTTPException(status_code=404, detail="Deal not found")
    ensure_company_access(deal, current_user)
    data = payload.model_dump(exclude_unset=True)
    if "amount" in data and data["amount"] is not None and data["amount"] < 0:
        raise HTTPException(status_code=400, detail="amount must be >= 0")
    for field, value in data.items():
        setattr(deal, field, value)
    log_activity(db, user=current_user, action="updated", entity_type="deal",
                 entity_id=deal.id, entity_name=deal.title, after=data if not data.get("amount") else {**data, "amount": str(data["amount"])})
    db.commit()
    db.refresh(deal)
    stage = _get_stage(db, current_user, deal.stage_id)
    return _serialize_deal(deal, stage)


@router.delete("/{deal_id:int}")
def delete_deal(deal_id: int, db: Session = Depends(get_db),
                current_user: User = Depends(get_current_user)):
    deal = apply_company_scope(db.query(Deal), Deal, current_user).filter(Deal.id == deal_id).first()
    if deal is None:
        raise HTTPException(status_code=404, detail="Deal not found")
    ensure_company_access(deal, current_user)
    log_activity(db, user=current_user, action="deleted", entity_type="deal",
                 entity_id=deal.id, entity_name=deal.title)
    db.delete(deal)
    db.commit()
    return {"message": "Deal deleted"}
```

- [ ] **Step 5: Register the router**

In `backend/app/main.py`, near the other sales routers (after the `leads` import/include), add the import alongside existing router imports and the include line:

```python
from app.routers.sales.deals import router as deals_router
# ...
app.include_router(deals_router, prefix="/api/deals", tags=["Deals"])
```

(Match the existing import style in `main.py`; place the `include_router` next to `leads` at ~line 97.)

- [ ] **Step 6: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/sales/test_deals_api.py -v`
Expected: PASS (4 tests).

- [ ] **Step 7: Commit**

```bash
git add backend/app/schemas/sales/deal.py backend/app/routers/sales/deals.py backend/app/main.py backend/tests/sales/test_deals_api.py
git commit -m "feat(deals): CRUD API with auto-seeded default pipeline"
```

---

### Task 4: Stage-move endpoint + weighted-forecast board

**Files:**
- Modify: `backend/app/routers/sales/deals.py` (add `PATCH /{deal_id}/stage` and `GET /board`)
- Test: `backend/tests/sales/test_deals_board.py`

**Interfaces:**
- Consumes: `_get_stage`, `_effective_probability`, `_serialize_deal`, `DealStageUpdate` (import), models from Tasks 1–3; `DealStageType`.
- Produces: `PATCH /api/deals/{deal_id}/stage` (body `{stage_id}`) sets stage, applies stage default probability when `deal.probability is None`, sets `closed_at=now` when moving into won/lost and clears it when moving back to open; audit-logged. `GET /api/deals/board?pipeline_id=` returns `{pipeline_id, stages: [{stage_id, name, stage_type, deals: [...], stage_total, weighted_value}], open_forecast, won_value}` where `open_forecast = Σ(amount × effective_probability/100)` over open-stage deals and `won_value = Σ(amount)` over won-stage deals.

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/sales/test_deals_board.py
from decimal import Decimal

from app.models.sales.pipeline import Pipeline, PipelineStage
from app.models.core.enums import DealStageType
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


def _setup(client, db):
    company = create_company(db, name="Co", company_code="C1")
    admin = create_active_user(db, email="admin@c1.com", role="admin", company_id=company.id)
    login_user(client, admin.email)
    return company, admin


def test_stage_move_sets_and_clears_closed_at(client, db):
    _setup(client, db)
    deal = client.post("/api/deals", json={"title": "D", "amount": "100"}).json()
    won = db.query(PipelineStage).filter(PipelineStage.stage_type == DealStageType.WON).first()
    qual = db.query(PipelineStage).filter(PipelineStage.name == "Qualification").first()

    moved = client.patch(f"/api/deals/{deal['id']}/stage", json={"stage_id": won.id})
    assert moved.status_code == 200
    assert moved.json()["closed_at"] is not None
    assert moved.json()["effective_probability"] == 100  # won default

    back = client.patch(f"/api/deals/{deal['id']}/stage", json={"stage_id": qual.id})
    assert back.json()["closed_at"] is None


def test_stage_move_rejects_foreign_stage(client, db):
    company, _ = _setup(client, db)
    deal = client.post("/api/deals", json={"title": "D", "amount": "100"}).json()
    other = Pipeline(company_id=company.id, name="Other", is_default=False)
    db.add(other); db.flush()
    foreign = PipelineStage(company_id=company.id, pipeline_id=other.id, name="X", position=1, default_probability=0)
    db.add(foreign); db.commit()
    resp = client.patch(f"/api/deals/{deal['id']}/stage", json={"stage_id": foreign.id})
    assert resp.status_code == 400


def test_board_weighted_forecast_arithmetic(client, db):
    _setup(client, db)
    stages = {s.name: s for s in db.query(PipelineStage).all()}
    # Two open deals: 100 @ Qualification(10%) -> 10 ; 200 @ Negotiation(70%) -> 140 ; forecast 150
    client.post("/api/deals", json={"title": "A", "amount": "100"})  # Qualification default
    b = client.post("/api/deals", json={"title": "B", "amount": "200"}).json()
    client.patch(f"/api/deals/{b['id']}/stage", json={"stage_id": stages['Negotiation'].id})
    # One won deal: 500 -> won_value 500, not in open forecast
    c = client.post("/api/deals", json={"title": "C", "amount": "500"}).json()
    client.patch(f"/api/deals/{c['id']}/stage", json={"stage_id": stages['Won'].id})

    board = client.get("/api/deals/board").json()
    assert board["open_forecast"] == "150.00"
    assert board["won_value"] == "500.00"
    names = [s["name"] for s in board["stages"]]
    assert names == ["Qualification", "Proposal", "Negotiation", "Won", "Lost"]
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/sales/test_deals_board.py -v`
Expected: FAIL — 404/405 on `/stage` and `/board` (endpoints absent).

- [ ] **Step 3: Add the endpoints to `deals.py`**

Add these imports at the top of `backend/app/routers/sales/deals.py`:

```python
from datetime import datetime
from app.models.core.enums import DealStageType
from app.schemas.sales.deal import DealStageUpdate
```

Append the endpoints:

```python
@router.patch("/{deal_id:int}/stage")
def move_deal_stage(deal_id: int, payload: DealStageUpdate, db: Session = Depends(get_db),
                    current_user: User = Depends(get_current_user)):
    deal = apply_company_scope(db.query(Deal), Deal, current_user).filter(Deal.id == deal_id).first()
    if deal is None:
        raise HTTPException(status_code=404, detail="Deal not found")
    ensure_company_access(deal, current_user)
    stage = _get_stage(db, current_user, payload.stage_id)
    if stage is None or stage.pipeline_id != deal.pipeline_id:
        raise HTTPException(status_code=400, detail="stage does not belong to deal's pipeline")

    before_stage = deal.stage_id
    deal.stage_id = stage.id
    if stage.stage_type in (DealStageType.WON, DealStageType.LOST):
        deal.closed_at = deal.closed_at or datetime.utcnow()
    else:
        deal.closed_at = None
    log_activity(db, user=current_user, action="stage_changed", entity_type="deal",
                 entity_id=deal.id, entity_name=deal.title,
                 before={"stage_id": before_stage}, after={"stage_id": stage.id})
    db.commit()
    db.refresh(deal)
    return _serialize_deal(deal, stage)


@router.get("/board")
def deal_board(db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
               pipeline_id: Optional[int] = Query(None)):
    if pipeline_id is None:
        default_pipeline = ensure_default_pipeline(db, current_user.company_id)
        pipeline_id = default_pipeline.id

    stages = apply_company_scope(db.query(PipelineStage), PipelineStage, current_user).filter(
        PipelineStage.pipeline_id == pipeline_id
    ).order_by(PipelineStage.position).all()

    deals_q = apply_company_scope(db.query(Deal), Deal, current_user).filter(Deal.pipeline_id == pipeline_id)
    if _role(current_user) == "sales":
        deals_q = deals_q.filter(
            (Deal.assigned_to_id == current_user.id) | (Deal.assigned_to_id.is_(None))
        )
    deals = deals_q.all()

    by_stage = {s.id: [] for s in stages}
    for d in deals:
        by_stage.setdefault(d.stage_id, []).append(d)

    open_forecast = Decimal("0")
    won_value = Decimal("0")
    stage_blocks = []
    for s in stages:
        s_deals = by_stage.get(s.id, [])
        stage_total = sum((d.amount or Decimal("0")) for d in s_deals) or Decimal("0")
        weighted = Decimal("0")
        for d in s_deals:
            amt = d.amount or Decimal("0")
            if s.stage_type == DealStageType.OPEN:
                eff = d.probability if d.probability is not None else (s.default_probability or 0)
                weighted += amt * Decimal(eff) / Decimal(100)
            elif s.stage_type == DealStageType.WON:
                won_value += amt
        if s.stage_type == DealStageType.OPEN:
            open_forecast += weighted
        stage_blocks.append({
            "stage_id": s.id, "name": s.name, "stage_type": s.stage_type.value,
            "stage_total": str(stage_total.quantize(Decimal("0.01"))),
            "weighted_value": str(weighted.quantize(Decimal("0.01"))),
            "deals": [_serialize_deal(d, s) for d in s_deals],
        })

    return {
        "pipeline_id": pipeline_id,
        "stages": stage_blocks,
        "open_forecast": str(open_forecast.quantize(Decimal("0.01"))),
        "won_value": str(won_value.quantize(Decimal("0.01"))),
    }
```

Note: `/board` is declared after `/{deal_id:int}` routes, but the `:int` converter on the id routes means `/board` will not be captured by them — FastAPI matches the literal/typed path correctly. Verify by running the tests.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/sales/test_deals_board.py -v`
Expected: PASS (3 tests). If `/board` is shadowed by `/{deal_id:int}` (it should not be, due to the `:int` converter), move the `/board` route definition above the id routes.

- [ ] **Step 5: Commit**

```bash
git add backend/app/routers/sales/deals.py backend/tests/sales/test_deals_board.py
git commit -m "feat(deals): stage-move endpoint + weighted-forecast board"
```

---

### Task 5: Stage configuration endpoints (list + admin/md edit)

**Files:**
- Modify: `backend/app/routers/sales/deals.py` (add pipeline/stage list + admin config endpoints)
- Test: `backend/tests/sales/test_deals_stages_config.py`

**Interfaces:**
- Consumes: everything from Tasks 1–4.
- Produces: `GET /api/deals/pipelines`, `GET /api/deals/stages?pipeline_id=` (all roles); `POST /api/deals/stages` and `PATCH /api/deals/stages/{stage_id}` (admin/md only) to create/rename/reorder a stage. Non-admin/md → 403.

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/sales/test_deals_stages_config.py
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


def _co(db, code="C1"):
    return create_company(db, name=f"Co {code}", company_code=code)


def test_list_stages_after_autoseed(client, db):
    company = _co(db)
    admin = create_active_user(db, email="admin@c1.com", role="admin", company_id=company.id)
    login_user(client, admin.email)
    client.post("/api/deals", json={"title": "seed", "amount": "1"})  # triggers seed
    stages = client.get("/api/deals/stages").json()["items"]
    assert [s["name"] for s in stages] == ["Qualification", "Proposal", "Negotiation", "Won", "Lost"]


def test_admin_can_create_stage_sales_cannot(client, db):
    company = _co(db)
    admin = create_active_user(db, email="admin@c1.com", role="admin", company_id=company.id)
    sales = create_active_user(db, email="sales@c1.com", role="sales", company_id=company.id)

    login_user(client, admin.email)
    client.post("/api/deals", json={"title": "seed", "amount": "1"})
    pipe_id = client.get("/api/deals/pipelines").json()["items"][0]["id"]
    created = client.post("/api/deals/stages", json={
        "pipeline_id": pipe_id, "name": "Discovery", "position": 2,
        "stage_type": "open", "default_probability": 25,
    })
    assert created.status_code == 201, created.text

    login_user(client, sales.email)
    denied = client.post("/api/deals/stages", json={
        "pipeline_id": pipe_id, "name": "Sneaky", "position": 9,
        "stage_type": "open", "default_probability": 0,
    })
    assert denied.status_code == 403


def test_admin_can_rename_stage(client, db):
    company = _co(db)
    admin = create_active_user(db, email="admin@c1.com", role="admin", company_id=company.id)
    login_user(client, admin.email)
    client.post("/api/deals", json={"title": "seed", "amount": "1"})
    stage_id = client.get("/api/deals/stages").json()["items"][0]["id"]
    resp = client.patch(f"/api/deals/stages/{stage_id}", json={"name": "Lead In"})
    assert resp.status_code == 200
    assert resp.json()["name"] == "Lead In"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/sales/test_deals_stages_config.py -v`
Expected: FAIL — 404 on `/pipelines`, `/stages`.

- [ ] **Step 3: Add schemas for stage config**

Append to `backend/app/schemas/sales/deal.py`:

```python
class StageCreate(BaseModel):
    pipeline_id: int
    name: str
    position: int
    stage_type: str = "open"
    default_probability: int = 0


class StageUpdate(BaseModel):
    name: Optional[str] = None
    position: Optional[int] = None
    stage_type: Optional[str] = None
    default_probability: Optional[int] = None
```

- [ ] **Step 4: Add the endpoints to `deals.py`**

Add imports:

```python
from app.models.sales.pipeline import Pipeline, PipelineStage  # already imported
from app.schemas.sales.deal import StageCreate, StageUpdate
```

Add a role guard helper and endpoints:

```python
def _require_admin_or_md(current_user: User):
    if _role(current_user) not in ("admin", "md"):
        raise HTTPException(status_code=403, detail="Only admin or MD can configure stages")


def _serialize_stage(s: PipelineStage) -> dict:
    return {"id": s.id, "pipeline_id": s.pipeline_id, "name": s.name,
            "position": s.position, "stage_type": s.stage_type.value if hasattr(s.stage_type, "value") else s.stage_type,
            "default_probability": s.default_probability, "is_active": s.is_active}


@router.get("/pipelines")
def list_pipelines(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    pipelines = apply_company_scope(db.query(Pipeline), Pipeline, current_user).order_by(Pipeline.id).all()
    return {"items": [{"id": p.id, "name": p.name, "is_default": p.is_default, "is_active": p.is_active}
                      for p in pipelines]}


@router.get("/stages")
def list_stages(db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
                pipeline_id: Optional[int] = Query(None)):
    q = apply_company_scope(db.query(PipelineStage), PipelineStage, current_user)
    if pipeline_id is not None:
        q = q.filter(PipelineStage.pipeline_id == pipeline_id)
    stages = q.order_by(PipelineStage.pipeline_id, PipelineStage.position).all()
    return {"items": [_serialize_stage(s) for s in stages]}


@router.post("/stages", status_code=status.HTTP_201_CREATED)
def create_stage(payload: StageCreate, db: Session = Depends(get_db),
                 current_user: User = Depends(get_current_user)):
    _require_admin_or_md(current_user)
    pipeline = apply_company_scope(db.query(Pipeline), Pipeline, current_user).filter(
        Pipeline.id == payload.pipeline_id
    ).first()
    if pipeline is None:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    if not (0 <= payload.default_probability <= 100):
        raise HTTPException(status_code=400, detail="default_probability must be 0..100")
    stage = PipelineStage(
        company_id=current_user.company_id, pipeline_id=pipeline.id, name=payload.name,
        position=payload.position, stage_type=payload.stage_type,
        default_probability=payload.default_probability,
    )
    db.add(stage)
    db.commit()
    db.refresh(stage)
    return _serialize_stage(stage)


@router.patch("/stages/{stage_id:int}")
def update_stage(stage_id: int, payload: StageUpdate, db: Session = Depends(get_db),
                 current_user: User = Depends(get_current_user)):
    _require_admin_or_md(current_user)
    stage = apply_company_scope(db.query(PipelineStage), PipelineStage, current_user).filter(
        PipelineStage.id == stage_id
    ).first()
    if stage is None:
        raise HTTPException(status_code=404, detail="Stage not found")
    data = payload.model_dump(exclude_unset=True)
    if "default_probability" in data and data["default_probability"] is not None and not (0 <= data["default_probability"] <= 100):
        raise HTTPException(status_code=400, detail="default_probability must be 0..100")
    for field, value in data.items():
        setattr(stage, field, value)
    db.commit()
    db.refresh(stage)
    return _serialize_stage(stage)
```

Note: place `/pipelines` and `/stages` routes so their literal prefixes are not captured by `/{deal_id:int}` (the `:int` converter already prevents capture of non-numeric segments). Run the tests to confirm.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/sales/test_deals_stages_config.py -v`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add backend/app/routers/sales/deals.py backend/app/schemas/sales/deal.py backend/tests/sales/test_deals_stages_config.py
git commit -m "feat(deals): pipeline/stage listing + admin stage configuration"
```

---

### Task 6: Cross-tenant isolation coverage (Phase-0 gate)

**Files:**
- Create: `backend/tests/tenancy/test_deals_cross_tenant.py`

**Interfaces:**
- Consumes: the deals API from Tasks 3–4; `create_company`, `create_active_user`, `login_user`, `auth_limiter` reset pattern from the existing tenancy suite.

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/tenancy/test_deals_cross_tenant.py
"""Deals must obey the Phase-0 gate: company B cannot read/mutate/delete company A's
deal by id (404, not a 2xx). Each denial is paired with a positive control so a 404
proves the company scope, not a vacuous missing row."""
import pytest

from app.utils.rate_limit import auth_limiter
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company

NO_ACCESS = (403, 404)


@pytest.fixture(autouse=True)
def _reset_auth_rate_limit():
    auth_limiter._buckets.clear()
    yield


@pytest.fixture()
def two_companies_with_deal(client, db):
    a = create_company(db, name="A", company_code="COA")
    b = create_company(db, name="B", company_code="COB")
    admin_a = create_active_user(db, email="admin@a.com", role="admin", company_id=a.id)
    create_active_user(db, email="admin@b.com", role="admin", company_id=b.id)
    login_user(client, "admin@a.com")
    deal = client.post("/api/deals", json={"title": "A deal", "amount": "1000"}).json()
    # find a valid target stage in A's pipeline for the stage-move mutation case
    stages = client.get("/api/deals/stages").json()["items"]
    target_stage = stages[1]["id"]
    client.headers.pop("Authorization", None)
    return deal["id"], target_stage, "admin@b.com"


def test_owner_can_read_and_mutate_own_deal(client, two_companies_with_deal):
    deal_id, target_stage, _ = two_companies_with_deal
    login_user(client, "admin@a.com")
    assert client.get(f"/api/deals/{deal_id}").status_code == 200
    assert client.patch(f"/api/deals/{deal_id}", json={"amount": "2000"}).status_code == 200
    assert client.patch(f"/api/deals/{deal_id}/stage", json={"stage_id": target_stage}).status_code == 200


def test_cross_tenant_read_denied(client, two_companies_with_deal):
    deal_id, _, admin_b = two_companies_with_deal
    login_user(client, admin_b)
    assert client.get(f"/api/deals/{deal_id}").status_code in NO_ACCESS


def test_cross_tenant_patch_denied(client, two_companies_with_deal):
    deal_id, _, admin_b = two_companies_with_deal
    login_user(client, admin_b)
    assert client.patch(f"/api/deals/{deal_id}", json={"amount": "9"}).status_code in NO_ACCESS


def test_cross_tenant_stage_move_denied(client, two_companies_with_deal):
    deal_id, target_stage, admin_b = two_companies_with_deal
    login_user(client, admin_b)
    assert client.patch(f"/api/deals/{deal_id}/stage", json={"stage_id": target_stage}).status_code in NO_ACCESS


def test_cross_tenant_delete_denied(client, two_companies_with_deal):
    deal_id, _, admin_b = two_companies_with_deal
    login_user(client, admin_b)
    assert client.delete(f"/api/deals/{deal_id}").status_code in NO_ACCESS
```

- [ ] **Step 2: Run test to verify it fails, then passes**

Run: `cd backend && python -m pytest tests/tenancy/test_deals_cross_tenant.py -v`
Expected: These should **PASS immediately** because `apply_company_scope` already gates the endpoints built in Tasks 3–4. If any cross-tenant case returns 200, that is a real leak — fix the endpoint to scope by company before proceeding. (The positive-control test failing instead would indicate the deal/stage wasn't seeded — fix the fixture.)

- [ ] **Step 3: Commit**

```bash
git add backend/tests/tenancy/test_deals_cross_tenant.py
git commit -m "test(deals): cross-tenant isolation matrix for deals"
```

---

### Task 7: Full-suite green + signup seed hook

**Files:**
- Modify: `backend/app/routers/auth/auth.py` (call `ensure_default_pipeline` at signup, inside the existing signup transaction)
- Test: full suite

**Interfaces:**
- Consumes: `ensure_default_pipeline`; the existing signup flow (`new_company` created ~`auth.py:169`).

- [ ] **Step 1: Add the signup hook**

In `backend/app/routers/auth/auth.py`, inside the signup `try:` block, **after** `db.add(new_company); db.flush()` and after the user/subscription are added, before the final `db.commit()`, add:

```python
from app.services.sales.pipeline_seed import ensure_default_pipeline
# ensure_default_pipeline commits internally; call it after the signup commit instead:
```

Because `ensure_default_pipeline` commits internally, call it **after** the signup `db.commit()` succeeds (not inside the transaction), guarded so a failure here does not break signup:

```python
        db.commit()
        db_user_id = db_user.id
        db.refresh(db_user)
        try:
            ensure_default_pipeline(db, new_company.id)
        except Exception:
            logger.exception("Default pipeline seed failed for company_id=%s", new_company.id)
```

(Place the `import` at the top of the file with the other imports, not inline.)

- [ ] **Step 2: Add a signup-seeds-pipeline test**

Append to `backend/tests/sales/test_pipeline_seed.py`:

```python
def test_signup_seeds_default_pipeline(client, db):
    from app.models.sales.pipeline import Pipeline
    resp = client.post("/api/auth/signup", json={
        "email": "founder@new.com", "password": "pw123456",
        "full_name": "Founder", "company_name": "NewCo",
    })
    assert resp.status_code in (200, 201), resp.text
    # the new company should have its default pipeline
    assert db.query(Pipeline).filter(Pipeline.is_default == True).count() >= 1  # noqa: E712
```

Note: the signup route is `POST /api/auth/signup` with the `UserCreate` body (`email`, `password`, `full_name`, `company_name`, optional `phone`) — verified against `app/routers/auth/auth.py:146`. If `UserCreate` enforces a password min length, use a compliant value; the assertion (a default pipeline exists after signup) is the invariant under test.

- [ ] **Step 3: Run the signup test**

Run: `cd backend && python -m pytest tests/sales/test_pipeline_seed.py -v`
Expected: PASS.

- [ ] **Step 4: Run the FULL suite**

Run: `cd backend && python -m pytest -q`
Expected: All previously-green tests (162 from Phase 1) still pass **plus** the new deals tests. Zero failures. If the signup hook broke an existing auth test, reconcile before committing.

- [ ] **Step 5: Commit**

```bash
git add backend/app/routers/auth/auth.py backend/tests/sales/test_pipeline_seed.py
git commit -m "feat(deals): seed default pipeline on company signup"
```

---

### Task 8: Frontend — deals kanban board + list + detail

**Files:**
- Create: `frontend/app/sales/deals/page.jsx` (board + list toggle)
- Create: `frontend/app/sales/deals/[id]/page.jsx` (deal detail)
- Test: manual smoke (no unit-test harness for these pages in-repo; follow the `sales/leads` pattern)

**Interfaces:**
- Consumes: `GET /api/deals/board`, `GET /api/deals`, `GET /api/deals/{id}`, `POST /api/deals`, `PATCH /api/deals/{id}/stage`, `GET /api/deals/stages`. Reuses whatever API-client/auth-header + layout conventions `frontend/app/sales/leads/page.jsx` uses.

- [ ] **Step 1: Read the reference page**

Read `frontend/app/sales/leads/page.jsx` and `frontend/app/sales/layout.jsx` in full. Identify: the API base helper, how the auth token/`X-Team-Id` header is attached, the loading/error/empty/success state handling, and the component/styling conventions. **Mirror these exactly** — do not introduce a new fetch pattern or button style.

- [ ] **Step 2: Build the board page**

Create `frontend/app/sales/deals/page.jsx`:
- Fetch `GET /api/deals/board` on mount using the same client helper as leads.
- Render a column per stage (`board.stages`), each column showing its `name`, `stage_total`, `weighted_value`, and a card per deal (`title`, `amount`, `effective_probability`).
- Show a header strip with `open_forecast` and `won_value`.
- Handle all four states: **loading** (spinner/skeleton like leads), **error** (message + retry), **empty** (no deals → "Create your first deal" CTA), **success** (the board).
- Provide a "New Deal" action that POSTs `{title, amount}` to `/api/deals` and refetches the board.
- Moving a card between columns calls `PATCH /api/deals/{id}/stage` then refetches. (Drag-and-drop optional; a per-card stage `<select>` is an acceptable v0 if the leads page has no DnD dependency to reuse.)

- [ ] **Step 3: Build the detail page**

Create `frontend/app/sales/deals/[id]/page.jsx`:
- Fetch `GET /api/deals/{id}`; render fields; handle loading/error/empty(404→not-found)/success.
- Allow editing amount/probability/expected_close via `PATCH /api/deals/{id}`.

- [ ] **Step 4: Smoke test manually**

Run the frontend dev server (per the repo's run convention) and the backend; sign in, open `/sales/deals`, create a deal, move it across stages, confirm the forecast updates and the detail page loads. Verify no console errors and that the four data states render.

- [ ] **Step 5: Commit**

```bash
git add frontend/app/sales/deals/
git commit -m "feat(deals): deals kanban board, list, and detail pages"
```

---

## Self-Review

**Spec coverage:**
- Data model (3 tables + enum) → Task 1. ✅
- Lazy per-tenant seeding + signup hook → Tasks 2, 7. ✅
- CRUD API → Task 3. ✅
- Stage move (closed_at/probability) + weighted forecast board → Task 4. ✅
- Configurable stages (list all; admin/md edit) → Task 5. ✅
- Cross-tenant 404 with positive controls → Task 6. ✅
- Deferrals (no won→client, dashboards untouched, single pipeline UI) → honored (no task rewires `md.py`; won only sets `closed_at`). ✅
- Frontend deals surface → Task 8. ✅
- Deploy note (`create_missing_tables.py`, no `_MISSING_COLUMNS` change) → Task 1 exports models so `create_all` sees them; no ALTER needed. ✅

**Placeholder scan:** No "TBD"/"add error handling"/"similar to Task N" — every code step carries real code. Two explicit "confirm the route/payload" notes (Task 7 signup URL, Task 8 frontend conventions) are verification instructions with a concrete invariant, not placeholders.

**Type consistency:** `ensure_default_pipeline(db, company_id)`, `_effective_probability(deal, stage)`, `_serialize_deal(deal, stage)`, `_get_stage`, `DealStageType.{OPEN,WON,LOST}`, and the `DealCreate/DealUpdate/DealStageUpdate/StageCreate/StageUpdate` schema names are used identically across Tasks 2–7. Forecast returns **strings** (`"150.00"`) consistently and tests assert strings.

**Known risk carried forward:** route ordering — `/board`, `/pipelines`, `/stages` are literal paths registered alongside `/{deal_id:int}`. The `:int` path converter prevents the numeric-id routes from capturing non-numeric segments, so order should not matter; Tasks 4–5 each include a fallback instruction to move the literal routes above the id routes if a test shows shadowing. This is verified by running the tests, not assumed.
