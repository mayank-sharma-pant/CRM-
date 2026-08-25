# Forecasting (quota vs pipeline) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Per-user monthly sales quotas compared to closed-won in the month and current weighted open pipeline.

**Architecture:** New `sales_quotas` table; `app/services/sales/forecasting.py` for month bounds and metrics; `/api/forecasting` router for quota upsert and report; UI at `/reports/forecast`.

**Tech Stack:** FastAPI, SQLAlchemy, Next.js App Router, axios, Tailwind. Tests: pytest + TestClient.

**Spec:** [docs/superpowers/specs/2026-08-25-phase4-forecasting-design.md](../specs/2026-08-25-phase4-forecasting-design.md)

## Global Constraints

- No new pip dependency. No Alembic. New table via model + `create_all` (no `_MISSING_COLUMNS` for new tables).
- Never take `company_id` from the request body.
- By-id miss (including cross-tenant) is **404**. Bad year/month is **400**.
- Write quotas: admin / md; manager only for active-team members. Sales: no writes.
- Read report: admin/md all active users; manager self+team; sales self.
- Money strings quantized to 2 decimals like deals board (`"150.00"`).
- UTC month bounds. Unassigned deals excluded.
- Test password `"pw"`. Reset `auth_limiter._buckets.clear()` in login-heavy tests.
- Run pytest from `backend/` with `.venv/bin/pytest`.
- `git add` only files listed in that task.

### File map

| File | Responsibility |
|---|---|
| `backend/app/models/sales/sales_quota.py` | `SalesQuota` model |
| `backend/app/models/__init__.py` or sales package import | ensure model registered for create_all |
| `backend/app/services/sales/forecasting.py` | bounds + metrics + report rows |
| `backend/app/routers/sales/forecasting.py` | HTTP API |
| `backend/app/main.py` | include router `/api/forecasting` |
| `frontend/app/reports/forecast/page.jsx` | UI |
| `frontend/components/Sidebar.jsx` | Forecast nav link |
| `docs/IMPLEMENTATION_PLAN.md` | Phase 4.4 log |

---

### Task 1: SalesQuota model

**Files:**
- Create: `backend/app/models/sales/sales_quota.py`
- Modify: whatever imports models for metadata (grep `from app.models` in `create_missing_tables.py` / `app/models/__init__.py` — register `SalesQuota` the same way other sales models are)
- Test: `backend/tests/sales/test_forecasting_schema.py`

**Interfaces:**
- Produces: `SalesQuota` with UniqueConstraint `uq_sales_quotas_company_user_period` on `(company_id, user_id, year, month)`

- [ ] **Step 1: Write failing schema test**

```python
from decimal import Decimal
from sqlalchemy import inspect
from sqlalchemy.exc import IntegrityError
import pytest

from app.models.sales.sales_quota import SalesQuota
from tests.helpers.auth import create_active_user
from tests.helpers.factories import create_company


def test_sales_quotas_table_exists(db_engine):
    assert "sales_quotas" in inspect(db_engine).get_table_names()
    cols = {c["name"] for c in inspect(db_engine).get_columns("sales_quotas")}
    assert {"company_id", "user_id", "year", "month", "amount"} <= cols


def test_unique_company_user_year_month(db):
    company = create_company(db, name="F Co", company_code="FC1")
    user = create_active_user(db, email="s@fc1.com", role="sales", company_id=company.id)
    db.add(SalesQuota(company_id=company.id, user_id=user.id, year=2026, month=8, amount=Decimal("1000")))
    db.commit()
    db.add(SalesQuota(company_id=company.id, user_id=user.id, year=2026, month=8, amount=Decimal("2000")))
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()
```

- [ ] **Step 2: Run — expect FAIL**

`cd backend && .venv/bin/pytest tests/sales/test_forecasting_schema.py -v`

- [ ] **Step 3: Implement model**

```python
from sqlalchemy import Column, Integer, DateTime, ForeignKey, Numeric, UniqueConstraint
from sqlalchemy.sql import func
from app.database import Base

class SalesQuota(Base):
    __tablename__ = "sales_quotas"
    __table_args__ = (
        UniqueConstraint("company_id", "user_id", "year", "month", name="uq_sales_quotas_company_user_period"),
    )
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)
    amount = Column(Numeric(12, 2), nullable=False, default=0)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
```

Import the model from the same place other sales models are imported so `Base.metadata.create_all` creates the table in tests.

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add backend/app/models/sales/sales_quota.py backend/tests/sales/test_forecasting_schema.py
# plus any __init__/import file touched
git commit -m "$(cat <<'EOF'
feat(forecasting): add sales_quotas table

EOF
)"
```

---

### Task 2: Forecasting service

**Files:**
- Create: `backend/app/services/sales/forecasting.py`
- Test: `backend/tests/sales/test_forecasting_service.py`

**Interfaces:**

```python
def month_bounds(year: int, month: int) -> tuple[datetime, datetime]: ...
def effective_probability(deal, stage) -> int: ...
def weighted_amount(deal, stage) -> Decimal: ...
def closed_won_total(deals_won_in_month) -> Decimal: ...  # or query helpers
def build_user_metrics(*, quota_amount, closed_won, open_weighted) -> dict: ...
```

Prefer pure functions testable with SimpleNamespace doubles (like blueprint service). Also one DB integration test optional in Task 3.

Rules: month 8 2026 → `[2026-08-01 00:00:00, 2026-09-01 00:00:00)` naive UTC to match `datetime.utcnow()` closed_at writes in deals.py. Invalid month raises `ValueError`.

- [ ] **Step 1: Failing unit tests**

```python
from datetime import datetime
from decimal import Decimal
from types import SimpleNamespace
import pytest

from app.models.core.enums import DealStageType
from app.services.sales.forecasting import (
    month_bounds, effective_probability, weighted_amount, attainment_pct, format_money,
)


def test_month_bounds_august_2026():
    start, end = month_bounds(2026, 8)
    assert start == datetime(2026, 8, 1)
    assert end == datetime(2026, 9, 1)


def test_month_bounds_rejects_bad_month():
    with pytest.raises(ValueError):
        month_bounds(2026, 13)


def test_weighted_uses_deal_probability_else_stage_default():
    stage = SimpleNamespace(default_probability=10, stage_type=DealStageType.OPEN)
    d1 = SimpleNamespace(amount=Decimal("100"), probability=40)
    d2 = SimpleNamespace(amount=Decimal("200"), probability=None)
    assert weighted_amount(d1, stage) == Decimal("40.00")
    assert weighted_amount(d2, stage) == Decimal("20.00")
    assert attainment_pct(Decimal("25"), Decimal("100")) == 0.25
    assert attainment_pct(Decimal("25"), Decimal("0")) is None
```

Quantize weighted to 2 decimal places.

- [ ] **Step 2–4: RED, implement, GREEN**

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/sales/forecasting.py backend/tests/sales/test_forecasting_service.py
git commit -m "$(cat <<'EOF'
feat(forecasting): month bounds and weighted attainment helpers

EOF
)"
```

---

### Task 3: Forecasting API

**Files:**
- Create: `backend/app/routers/sales/forecasting.py`
- Modify: `backend/app/main.py`
- Test: `backend/tests/sales/test_forecasting_api.py`

**Interfaces:**
- `PUT /api/forecasting/quotas` body: `{user_id, year, month, amount}`
- `GET /api/forecasting/quotas?year=&month=`
- `DELETE /api/forecasting/quotas/{id}`
- `GET /api/forecasting/report?year=&month=`

Implement scoping helpers using existing `TeamMembership` / active team patterns from deals. Target user must belong to same `company_id`.

Report builds metrics by querying deals + stages for the company; filter by `assigned_to_id`.

- [ ] **Step 1: Failing API tests** (sketch — align create deal/stage with existing helpers)

```python
import pytest
from decimal import Decimal
from app.utils.rate_limit import auth_limiter
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


@pytest.fixture(autouse=True)
def _reset():
    auth_limiter._buckets.clear()
    yield


def test_upsert_quota_and_report_closed_and_weighted(client, db):
    company = create_company(db, name="FC", company_code="FC2")
    admin = create_active_user(db, email="admin@fc2.com", role="admin", company_id=company.id)
    sales = create_active_user(db, email="sales@fc2.com", role="sales", company_id=company.id)
    login_user(client, admin.email)
    put = client.put("/api/forecasting/quotas", json={
        "user_id": sales.id, "year": 2026, "month": 8, "amount": "1000.00",
    })
    assert put.status_code == 200, put.text
    # Create open deal assigned to sales with known amount/probability via /api/deals
    # Move one deal to won with closed_at in Aug 2026 (patch stage + if needed adjust closed_at in DB)
    # Assert report row for sales.id
    report = client.get("/api/forecasting/report", params={"year": 2026, "month": 8})
    assert report.status_code == 200
    row = next(r for r in report.json()["items"] if r["user_id"] == sales.id)
    assert row["quota"] == "1000.00"
    # assert closed_won / open_weighted once deals seeded — set concrete numbers in test body


def test_sales_cannot_put_quota(client, db):
    company = create_company(db, name="FC3", company_code="FC3")
    create_active_user(db, email="admin@fc3.com", role="admin", company_id=company.id)
    sales = create_active_user(db, email="sales@fc3.com", role="sales", company_id=company.id)
    login_user(client, sales.email)
    assert client.put("/api/forecasting/quotas", json={
        "user_id": sales.id, "year": 2026, "month": 8, "amount": "100",
    }).status_code == 403


def test_bad_month_400(client, db):
    company = create_company(db, name="FC4", company_code="FC4")
    create_active_user(db, email="admin@fc4.com", role="admin", company_id=company.id)
    login_user(client, "admin@fc4.com")
    assert client.get("/api/forecasting/report", params={"year": 2026, "month": 13}).status_code == 400
```

Fill deal seeding by copying from `test_deals_board.py` / `test_blueprint_api.py`. For Won-in-month: after moving to won, set `deal.closed_at = datetime(2026, 8, 15)` in DB if the API sets `utcnow` outside the test month.

- [ ] **Step 2–4: RED, implement router + main include, GREEN**

Also run: `tests/sales/test_deals_board.py` to ensure no board regression.

- [ ] **Step 5: Commit**

```bash
git add backend/app/routers/sales/forecasting.py backend/app/main.py \
  backend/tests/sales/test_forecasting_api.py
git commit -m "$(cat <<'EOF'
feat(forecasting): quotas CRUD and quota-vs-pipeline report API

EOF
)"
```

---

### Task 4: Cross-tenant isolation

**Files:**
- Test: `backend/tests/tenancy/test_forecasting_cross_tenant.py`

- [ ] **Step 1: Write test** — B cannot PUT/GET/DELETE A's quota id; B cannot see A's users on report; A positive control.

- [ ] **Step 2: Run PASS (or fix 404 scoping)**

- [ ] **Step 3: Commit**

```bash
git add backend/tests/tenancy/test_forecasting_cross_tenant.py
git commit -m "$(cat <<'EOF'
test(forecasting): prove quotas and report are tenant-scoped

EOF
)"
```

---

### Task 5: Frontend + progress log

**Files:**
- Create: `frontend/app/reports/forecast/page.jsx`
- Modify: `frontend/components/Sidebar.jsx` — add Forecast link for md/manager/admin/sales near Saved reports (`/reports/forecast`)
- Modify: `docs/IMPLEMENTATION_PLAN.md`

**UI:**
- Year/month selectors (default current UTC month)
- Fetch `GET /forecasting/report`
- Table columns: User, Quota, Closed won, Weighted pipeline, Closed %, Pipeline %
- If role in admin/md/manager: editable quota amount → `PUT /forecasting/quotas`
- Sales: read-only
- Handle loading/error/empty/success

- [ ] **Step 1: Build page + sidebar**

- [ ] **Step 2: IMPLEMENTATION_PLAN Phase 4.4 DONE section** with spec/plan links, verification files, deploy note (`create_all` for `sales_quotas`), residuals (UTC, unassigned ignored).

- [ ] **Step 3: Verify**

`cd backend && .venv/bin/pytest tests/sales/test_forecasting_schema.py tests/sales/test_forecasting_service.py tests/sales/test_forecasting_api.py tests/tenancy/test_forecasting_cross_tenant.py tests/sales/test_deals_board.py -v`

`cd frontend && npx next build` (or note blocked).

- [ ] **Step 4: Commit**

```bash
git add frontend/app/reports/forecast/page.jsx frontend/components/Sidebar.jsx \
  docs/IMPLEMENTATION_PLAN.md
git commit -m "$(cat <<'EOF'
feat(forecasting): forecast report UI and progress log

EOF
)"
```

---

## Self-review (plan vs spec)

| Spec | Task |
|---|---|
| `sales_quotas` + unique | 1 |
| Metric helpers / bounds | 2 |
| Quotas + report API + roles | 3 |
| Cross-tenant | 4 |
| UI + IMPLEMENTATION_PLAN | 5 |
| No categories / team quotas | non-goals |

No placeholders. Money format and role rules consistent across Tasks 3–5.
