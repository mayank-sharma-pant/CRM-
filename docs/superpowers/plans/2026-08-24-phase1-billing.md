# Phase 1 — Charge Money (Razorpay) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A stranger signs up onto an active trial, pays in test mode, and cannot exceed their plan's seat/team/storage limits.

**Architecture:** New `app/models/billing/` (Plan, Subscription, WebhookEvent) registered via `Base.metadata` + `create_missing_tables.py` (Alembic is deliberately untouched — two heads, not runnable here). A provider-agnostic `app/services/billing/` adapter (Razorpay + Null for tests) handles checkout and signature-verified idempotent webhooks. Signup creates a TRIAL company with a Starter subscription. A `limits.py` service enforces seat/team/storage caps at the mutation boundary (invite, team-create, upload) returning HTTP 402.

**Tech Stack:** FastAPI, SQLAlchemy, Pydantic, pytest, `razorpay` SDK (adapter only; tests use NullProvider), SQLite in-memory for tests.

**Spec:** `docs/superpowers/specs/2026-08-24-phase1-billing-design.md`

## Global Constraints

- **No git commits.** Per the product owner's instruction, work stays on `main` and is NOT committed. Each task's final step stages nothing and runs no `git commit`; the owner handles git. Where a task says "checkpoint," stop for review instead of committing.
- **No Alembic migrations.** New tables land via `app/models/*` + `create_missing_tables.py`. Registration requires the model be imported by `app/models/__init__.py`.
- **Currency default is `INR`.** Razorpay is the only provider.
- **Secrets from env only** — no real Razorpay key literal in code or defaults. Absent keys ⇒ NullProvider.
- **Tests use `NullProvider` and SQLite in-memory** via the existing `tests/conftest.py` fixtures (`db`, `client`). No network in the suite.
- **Test helpers:** `tests/helpers/auth.py` → `create_active_user(db, *, email, role, company_id, full_name, password="pw", **extra)`, `login_user(client, email, password="pw")`. `tests/helpers/factories.py` → `create_company(db, *, name, company_code, status="active")`. A **platform admin** is a user with `role="admin"` and `company_id=None`.
- **Suite baseline:** 139 tests passing; every task keeps the full suite green (`pytest -q`).

---

### Task 1: Billing models + seeding

**Files:**
- Create: `backend/app/models/billing/__init__.py`, `backend/app/models/billing/plan.py`, `backend/app/models/billing/subscription.py`, `backend/app/models/billing/webhook_event.py`
- Create: `backend/app/services/billing/__init__.py`, `backend/app/services/billing/seed.py`
- Modify: `backend/app/models/__init__.py` (add `from .billing import *`)
- Modify: `backend/create_missing_tables.py` (import billing package + call `seed_plans`)
- Test: `backend/tests/billing/__init__.py`, `backend/tests/billing/test_plans_schema.py`

**Interfaces:**
- Produces: `Plan(id, name, price_monthly, currency, max_users, max_teams, max_storage_gb, razorpay_plan_id, is_active)`, `Subscription(id, company_id, plan_id, provider, provider_subscription_id, status, current_period_end, trial_ends_at, seats, created_at, updated_at)`, `WebhookEvent(id, event_id, provider, received_at)`. `seed_plans(db) -> None` (idempotent, seeds Starter/Growth/Enterprise).

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/billing/test_plans_schema.py
from app.models.billing import Plan, Subscription
from app.services.billing.seed import seed_plans


def test_seed_plans_is_idempotent(db):
    seed_plans(db)
    seed_plans(db)  # second call must not duplicate
    names = [p.name for p in db.query(Plan).order_by(Plan.price_monthly).all()]
    assert names == ["Starter", "Growth", "Enterprise"]
    starter = db.query(Plan).filter(Plan.name == "Starter").one()
    assert starter.max_users == 10 and starter.currency == "INR"
    enterprise = db.query(Plan).filter(Plan.name == "Enterprise").one()
    assert enterprise.max_storage_gb is None  # unlimited
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/billing/test_plans_schema.py -v`
Expected: FAIL — `ModuleNotFoundError: app.models.billing`.

- [ ] **Step 3: Write the models**

```python
# backend/app/models/billing/plan.py
from sqlalchemy import Column, Integer, String, Numeric, Boolean
from app.database import Base


class Plan(Base):
    __tablename__ = "plans"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)
    price_monthly = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), nullable=False, default="INR")
    max_users = Column(Integer, nullable=False)
    max_teams = Column(Integer, nullable=False)
    max_storage_gb = Column(Integer, nullable=True)  # NULL = unlimited
    razorpay_plan_id = Column(String(255), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
```

```python
# backend/app/models/billing/subscription.py
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.database import Base


class Subscription(Base):
    __tablename__ = "subscriptions"
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), unique=True, nullable=False)
    plan_id = Column(Integer, ForeignKey("plans.id"), nullable=False)
    provider = Column(String(30), nullable=False, default="razorpay")
    provider_subscription_id = Column(String(255), nullable=True)
    status = Column(String(20), nullable=False, default="trialing")  # trialing|active|past_due|cancelled
    current_period_end = Column(DateTime(timezone=True), nullable=True)
    trial_ends_at = Column(DateTime(timezone=True), nullable=True)
    seats = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
```

```python
# backend/app/models/billing/webhook_event.py
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from app.database import Base


class WebhookEvent(Base):
    __tablename__ = "webhook_events"
    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(String(255), unique=True, nullable=False, index=True)
    provider = Column(String(30), nullable=False, default="razorpay")
    received_at = Column(DateTime(timezone=True), server_default=func.now())
```

```python
# backend/app/models/billing/__init__.py
from .plan import Plan
from .subscription import Subscription
from .webhook_event import WebhookEvent
```

- [ ] **Step 4: Write the seeder**

```python
# backend/app/services/billing/seed.py
from decimal import Decimal
from sqlalchemy.orm import Session
from app.models.billing import Plan

_TIERS = [
    {"name": "Starter", "price_monthly": Decimal("29"), "max_users": 10, "max_teams": 3, "max_storage_gb": 20},
    {"name": "Growth", "price_monthly": Decimal("79"), "max_users": 50, "max_teams": 15, "max_storage_gb": 200},
    {"name": "Enterprise", "price_monthly": Decimal("199"), "max_users": 500, "max_teams": 100, "max_storage_gb": None},
]


def seed_plans(db: Session) -> None:
    """Idempotently seed the three default tiers. Safe to call on every boot."""
    for tier in _TIERS:
        exists = db.query(Plan).filter(Plan.name == tier["name"]).first()
        if exists:
            continue
        db.add(Plan(currency="INR", is_active=True, **tier))
    db.commit()
```

Create empty `backend/app/services/billing/__init__.py` and `backend/tests/billing/__init__.py`.

- [ ] **Step 5: Register models + wire seeding into table creation**

In `backend/app/models/__init__.py` add after the existing imports:

```python
from .billing import *  # noqa: F401,F403
```

In `backend/create_missing_tables.py`, replace the body with:

```python
from app.database import engine, Base, SessionLocal
from app.models.core import *  # noqa: F401,F403
from app.models.sales import *  # noqa: F401,F403
from app.models.finance import *  # noqa: F401,F403
from app.models.ops import *  # noqa: F401,F403
from app.models.hr import *  # noqa: F401,F403
from app.models.billing import *  # noqa: F401,F403
from app.services.billing.seed import seed_plans

Base.metadata.create_all(bind=engine)
with SessionLocal() as db:
    seed_plans(db)
print("All missing tables created and plans seeded.")
```

Verify `SessionLocal` is exported by `app/database.py`; if it is named differently there, import the actual session factory name (read `app/database.py` first — do not assume).

- [ ] **Step 6: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/billing/test_plans_schema.py -v`
Expected: PASS.

- [ ] **Step 7: Run the full suite**

Run: `cd backend && python -m pytest -q`
Expected: 140 passed (139 baseline + 1). No regressions.

- [ ] **Step 8: Checkpoint** — stop for review. No commit (Global Constraints).

---

### Task 2: `/plans` reads the table + platform-admin edit

**Files:**
- Modify: `backend/app/routers/admin/platform.py` (replace the `get_plans` literal at ~:307; add `PATCH /plans/{plan_id}`)
- Test: `backend/tests/billing/test_plans_api.py`

**Interfaces:**
- Consumes: `Plan` (Task 1), `get_current_platform_admin` (`app/routers/admin/platform.py:60`), `seed_plans`.
- Produces: `GET /api/platform/plans` returns seeded rows; `PATCH /api/platform/plans/{id}` edits `price_monthly`/`max_users`/`max_teams`/`max_storage_gb`/`is_active`.

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/billing/test_plans_api.py
from tests.helpers.auth import create_active_user, login_user
from app.services.billing.seed import seed_plans
from app.models.billing import Plan


def test_get_plans_reads_table(db, client):
    seed_plans(db)
    create_active_user(db, email="pa@root.com", role="admin", company_id=None, full_name="Platform Admin")
    login_user(client, "pa@root.com")
    resp = client.get("/api/platform/plans")
    assert resp.status_code == 200
    names = [p["name"] for p in resp.json()["plans"]]
    assert set(names) == {"Starter", "Growth", "Enterprise"}


def test_platform_admin_can_edit_plan(db, client):
    seed_plans(db)
    starter = db.query(Plan).filter(Plan.name == "Starter").one()
    create_active_user(db, email="pa@root.com", role="admin", company_id=None, full_name="Platform Admin")
    login_user(client, "pa@root.com")
    resp = client.patch(f"/api/platform/plans/{starter.id}", json={"max_users": 25})
    assert resp.status_code == 200
    db.expire_all()
    assert db.query(Plan).filter(Plan.id == starter.id).one().max_users == 25
```

Confirm the router prefix: read the top of `platform.py` for `APIRouter(prefix=...)` and adjust the URL if it is not `/api/platform`.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/billing/test_plans_api.py -v`
Expected: FAIL — `GET /plans` returns the hardcoded literal (ids 1/2/3, no DB read) and `PATCH` route is 404/405.

- [ ] **Step 3: Replace `get_plans` and add the edit route**

In `platform.py`, replace the `get_plans` function body with a DB read:

```python
@router.get("/plans")
def get_plans(current_user: User = Depends(get_current_platform_admin), db: Session = Depends(get_db)):
    plans = db.query(Plan).order_by(Plan.price_monthly).all()
    return {"plans": [
        {"id": p.id, "name": p.name, "price_monthly": float(p.price_monthly), "currency": p.currency,
         "max_users": p.max_users, "max_teams": p.max_teams, "max_storage_gb": p.max_storage_gb,
         "is_active": p.is_active} for p in plans
    ]}
```

Add the editable-fields schema and PATCH route (place near the other schemas / routes):

```python
from pydantic import BaseModel

class PlanUpdate(BaseModel):
    price_monthly: float | None = None
    max_users: int | None = None
    max_teams: int | None = None
    max_storage_gb: int | None = None
    is_active: bool | None = None

@router.patch("/plans/{plan_id}")
def update_plan(plan_id: int, body: PlanUpdate,
                current_user: User = Depends(get_current_platform_admin),
                db: Session = Depends(get_db)):
    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(plan, field, value)
    db.commit()
    return {"message": "Plan updated"}
```

Add `from app.models.billing import Plan` to the imports at the top of `platform.py`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/billing/test_plans_api.py -v`
Expected: PASS.

- [ ] **Step 5: Run the full suite**

Run: `cd backend && python -m pytest -q`
Expected: all green.

- [ ] **Step 6: Checkpoint** — stop for review.

---

### Task 3: Billing provider adapter + config

**Files:**
- Create: `backend/app/services/billing/base.py`, `backend/app/services/billing/null_provider.py`, `backend/app/services/billing/razorpay_provider.py`, `backend/app/services/billing/provider.py`
- Modify: `backend/app/config.py` (add Razorpay env vars)
- Modify: `backend/requirements.txt` (add `razorpay`)
- Test: `backend/tests/billing/test_provider.py`

**Interfaces:**
- Produces:
  - `WebhookResult(event_id: str, kind: str, provider_subscription_id: str | None, period_end: datetime | None)` — normalized webhook payload.
  - `BillingProvider` ABC: `create_checkout(company, plan) -> dict`, `verify_and_parse(headers: dict, raw_body: bytes) -> WebhookResult`, `cancel(subscription) -> None`, `list_invoices(company) -> list`.
  - `NullProvider` — `verify_and_parse` validates an HMAC-SHA256 signature over `raw_body` using `settings.RAZORPAY_WEBHOOK_SECRET` (test secret), so signature + idempotency logic is exercised offline.
  - `get_billing_provider() -> BillingProvider` — Razorpay when `RAZORPAY_KEY_ID`+`RAZORPAY_KEY_SECRET` set, else Null.

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/billing/test_provider.py
import hmac, hashlib, json
from app.config import settings
from app.services.billing.provider import get_billing_provider
from app.services.billing.null_provider import NullProvider


def _sign(raw: bytes, secret: str) -> str:
    return hmac.new(secret.encode(), raw, hashlib.sha256).hexdigest()


def test_get_provider_defaults_to_null_without_keys(monkeypatch):
    monkeypatch.setattr(settings, "RAZORPAY_KEY_ID", "", raising=False)
    monkeypatch.setattr(settings, "RAZORPAY_KEY_SECRET", "", raising=False)
    assert isinstance(get_billing_provider(), NullProvider)


def test_null_provider_verifies_good_signature(monkeypatch):
    secret = "whsec_test"
    monkeypatch.setattr(settings, "RAZORPAY_WEBHOOK_SECRET", secret, raising=False)
    raw = json.dumps({
        "event": "subscription.charged",
        "payload": {"subscription": {"entity": {"id": "sub_test123"}}},
        "id": "evt_abc",
    }).encode()
    result = NullProvider().verify_and_parse({"X-Razorpay-Signature": _sign(raw, secret)}, raw)
    assert result.event_id == "evt_abc"
    assert result.kind == "activated"
    assert result.provider_subscription_id == "sub_test123"


def test_null_provider_rejects_bad_signature(monkeypatch):
    monkeypatch.setattr(settings, "RAZORPAY_WEBHOOK_SECRET", "whsec_test", raising=False)
    raw = b'{"event":"subscription.charged","id":"evt_x"}'
    import pytest
    with pytest.raises(ValueError):
        NullProvider().verify_and_parse({"X-Razorpay-Signature": "deadbeef"}, raw)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/billing/test_provider.py -v`
Expected: FAIL — modules do not exist.

- [ ] **Step 3: Add config vars**

In `backend/app/config.py`, inside `class Settings`, add:

```python
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""
    RAZORPAY_WEBHOOK_SECRET: str = ""
    TRIAL_DAYS: int = 14
```

- [ ] **Step 4: Write the adapter**

```python
# backend/app/services/billing/base.py
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime


@dataclass
class WebhookResult:
    event_id: str
    kind: str  # "activated" | "cancelled" | "past_due" | "ignored"
    provider_subscription_id: str | None = None
    period_end: datetime | None = None


class BillingProvider(ABC):
    @abstractmethod
    def create_checkout(self, company, plan) -> dict: ...
    @abstractmethod
    def verify_and_parse(self, headers: dict, raw_body: bytes) -> WebhookResult: ...
    @abstractmethod
    def cancel(self, subscription) -> None: ...
    @abstractmethod
    def list_invoices(self, company) -> list: ...


_EVENT_KIND = {
    "subscription.charged": "activated",
    "subscription.activated": "activated",
    "subscription.cancelled": "cancelled",
    "subscription.halted": "past_due",
}


def classify(event_name: str) -> str:
    return _EVENT_KIND.get(event_name, "ignored")
```

```python
# backend/app/services/billing/null_provider.py
import hmac, hashlib, json
from app.config import settings
from app.services.billing.base import BillingProvider, WebhookResult, classify


class NullProvider(BillingProvider):
    """No-network provider for local/dev/test. Signs webhooks with the configured
    test secret so signature + idempotency paths are exercised offline."""

    def create_checkout(self, company, plan) -> dict:
        return {"provider": "null", "checkout_url": None, "subscription_id": f"null_sub_{company.id}"}

    def verify_and_parse(self, headers: dict, raw_body: bytes) -> WebhookResult:
        sig = headers.get("X-Razorpay-Signature") or headers.get("x-razorpay-signature")
        secret = settings.RAZORPAY_WEBHOOK_SECRET
        expected = hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
        if not sig or not hmac.compare_digest(sig, expected):
            raise ValueError("Invalid webhook signature")
        body = json.loads(raw_body)
        sub_id = (body.get("payload", {}).get("subscription", {}).get("entity", {}).get("id"))
        return WebhookResult(event_id=body["id"], kind=classify(body.get("event", "")),
                             provider_subscription_id=sub_id)

    def cancel(self, subscription) -> None:
        return None

    def list_invoices(self, company) -> list:
        return []
```

```python
# backend/app/services/billing/razorpay_provider.py
import hmac, hashlib, json
from app.config import settings
from app.services.billing.base import BillingProvider, WebhookResult, classify


class RazorpayProvider(BillingProvider):
    """Live Razorpay adapter. Network calls only fire when keys are configured."""

    def _client(self):
        import razorpay  # imported lazily so the SDK is optional in dev/test
        return razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

    def create_checkout(self, company, plan) -> dict:
        client = self._client()
        sub = client.subscription.create({
            "plan_id": plan.razorpay_plan_id,
            "total_count": 12,
            "notes": {"company_id": str(company.id)},
        })
        return {"provider": "razorpay", "subscription_id": sub["id"], "short_url": sub.get("short_url")}

    def verify_and_parse(self, headers: dict, raw_body: bytes) -> WebhookResult:
        sig = headers.get("X-Razorpay-Signature") or headers.get("x-razorpay-signature")
        expected = hmac.new(settings.RAZORPAY_WEBHOOK_SECRET.encode(), raw_body, hashlib.sha256).hexdigest()
        if not sig or not hmac.compare_digest(sig, expected):
            raise ValueError("Invalid webhook signature")
        body = json.loads(raw_body)
        sub_id = (body.get("payload", {}).get("subscription", {}).get("entity", {}).get("id"))
        return WebhookResult(event_id=body["id"], kind=classify(body.get("event", "")),
                             provider_subscription_id=sub_id)

    def cancel(self, subscription) -> None:
        if subscription.provider_subscription_id:
            self._client().subscription.cancel(subscription.provider_subscription_id)

    def list_invoices(self, company) -> list:
        return []
```

```python
# backend/app/services/billing/provider.py
from functools import lru_cache
from app.config import settings
from app.services.billing.base import BillingProvider
from app.services.billing.null_provider import NullProvider
from app.services.billing.razorpay_provider import RazorpayProvider


def get_billing_provider() -> BillingProvider:
    if settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET:
        return RazorpayProvider()
    return NullProvider()
```

- [ ] **Step 5: Add the SDK to requirements**

Append `razorpay` (unpinned is fine for now; the SDK is imported lazily so a missing install does not break tests) to `backend/requirements.txt`.

- [ ] **Step 6: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/billing/test_provider.py -v`
Expected: PASS.

- [ ] **Step 7: Run the full suite**

Run: `cd backend && python -m pytest -q`
Expected: all green.

- [ ] **Step 8: Checkpoint** — stop for review.

---

### Task 4: Webhook endpoint + idempotency

**Files:**
- Create: `backend/app/routers/billing/__init__.py`
- Modify: `backend/app/main.py` (include the billing router)
- Test: `backend/tests/billing/test_webhook.py`

**Interfaces:**
- Consumes: `get_billing_provider` (Task 3), `Subscription`, `WebhookEvent` (Task 1), `get_db`.
- Produces: `POST /api/billing/webhook` — verifies signature, records `WebhookEvent.event_id` (unique), applies status to the matching `Subscription`, returns 200. A replayed `event_id` is a no-op 200. Bad signature ⇒ 400.

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/billing/test_webhook.py
import hmac, hashlib, json
from datetime import datetime, timezone, timedelta
from app.config import settings
from app.services.billing.seed import seed_plans
from app.models.billing import Plan, Subscription, WebhookEvent
from tests.helpers.factories import create_company


def _post_event(client, body: dict, secret: str):
    raw = json.dumps(body).encode()
    sig = hmac.new(secret.encode(), raw, hashlib.sha256).hexdigest()
    return client.post("/api/billing/webhook", content=raw,
                       headers={"X-Razorpay-Signature": sig, "Content-Type": "application/json"})


def test_webhook_activates_subscription_once(db, client, monkeypatch):
    monkeypatch.setattr(settings, "RAZORPAY_WEBHOOK_SECRET", "whsec_test", raising=False)
    seed_plans(db)
    company = create_company(db, name="Payer", company_code="PAY", status="trial")
    plan = db.query(Plan).filter(Plan.name == "Starter").one()
    sub = Subscription(company_id=company.id, plan_id=plan.id, provider="razorpay",
                       provider_subscription_id="sub_test123", status="trialing")
    db.add(sub); db.commit()

    body = {"id": "evt_1", "event": "subscription.charged",
            "payload": {"subscription": {"entity": {"id": "sub_test123"}}}}
    r1 = _post_event(client, body, "whsec_test")
    assert r1.status_code == 200
    db.expire_all()
    assert db.query(Subscription).filter(Subscription.id == sub.id).one().status == "active"

    r2 = _post_event(client, body, "whsec_test")  # replay same event id
    assert r2.status_code == 200
    assert db.query(WebhookEvent).filter(WebhookEvent.event_id == "evt_1").count() == 1


def test_webhook_rejects_bad_signature(db, client, monkeypatch):
    monkeypatch.setattr(settings, "RAZORPAY_WEBHOOK_SECRET", "whsec_test", raising=False)
    r = client.post("/api/billing/webhook", content=b'{"id":"evt_x"}',
                    headers={"X-Razorpay-Signature": "bad"})
    assert r.status_code == 400
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/billing/test_webhook.py -v`
Expected: FAIL — route 404.

- [ ] **Step 3: Write the router**

```python
# backend/app/routers/billing/__init__.py
from datetime import datetime, timezone
from fastapi import APIRouter, Request, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.billing import Subscription, WebhookEvent
from app.services.billing.provider import get_billing_provider

router = APIRouter(prefix="/api/billing", tags=["Billing"])

_KIND_TO_STATUS = {"activated": "active", "cancelled": "cancelled", "past_due": "past_due"}


@router.post("/webhook")
async def razorpay_webhook(request: Request, db: Session = Depends(get_db)):
    raw = await request.body()
    provider = get_billing_provider()
    try:
        event = provider.verify_and_parse(dict(request.headers), raw)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    if db.query(WebhookEvent).filter(WebhookEvent.event_id == event.event_id).first():
        return {"status": "duplicate"}  # idempotent no-op

    db.add(WebhookEvent(event_id=event.event_id, provider="razorpay"))
    new_status = _KIND_TO_STATUS.get(event.kind)
    if new_status and event.provider_subscription_id:
        sub = db.query(Subscription).filter(
            Subscription.provider_subscription_id == event.provider_subscription_id
        ).first()
        if sub:
            sub.status = new_status
            if new_status == "active":
                sub.current_period_end = event.period_end
    db.commit()
    return {"status": "ok"}
```

Note: `request.headers` keys are case-insensitive in Starlette; `verify_and_parse` already checks both casings.

- [ ] **Step 4: Register the router**

In `backend/app/main.py`, import and include it alongside the other routers:

```python
from app.routers.billing import router as billing_router
...
app.include_router(billing_router)
```

(The prefix is already on the router, so pass no extra prefix — mirror how `teams`/`company_ai_router` are included; read the surrounding `include_router` calls first.)

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/billing/test_webhook.py -v`
Expected: PASS.

- [ ] **Step 6: Run the full suite**

Run: `cd backend && python -m pytest -q`
Expected: all green.

- [ ] **Step 7: Checkpoint** — stop for review.

---

### Task 5: Self-serve signup → TRIAL

**Files:**
- Modify: `backend/app/models/core/enums.py` (add `CompanyStatus.TRIAL`)
- Modify: `backend/app/models/core/company.py` (add `trial_ends_at`)
- Modify: `backend/app/routers/auth/auth.py` (`signup` → trial + subscription; `_check_company_status` allows trial)
- Test: `backend/tests/billing/test_signup_trial.py`

**Interfaces:**
- Consumes: `Plan`, `Subscription` (Task 1), `seed_plans`, `settings.TRIAL_DAYS` (Task 3).
- Produces: signup creates a `Company(status="trial", trial_ends_at=now+TRIAL_DAYS)` with a `Subscription(status="trialing")` on Starter and an **active** owner who can log in immediately.

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/billing/test_signup_trial.py
from app.services.billing.seed import seed_plans
from app.models import Company
from app.models.core.user import User
from app.models.billing import Subscription, Plan


def test_signup_creates_trial_with_subscription(db, client):
    seed_plans(db)
    resp = client.post("/api/auth/signup", json={
        "email": "founder@newco.com", "password": "s3cret-pw", "full_name": "Founder",
        "company_name": "NewCo", "phone": "9999999999",
    })
    assert resp.status_code in (200, 201), resp.text
    company = db.query(Company).filter(Company.name == "NewCo").one()
    assert company.status == "trial"
    assert company.trial_ends_at is not None
    owner = db.query(User).filter(User.email == "founder@newco.com").one()
    assert owner.status == "active"
    sub = db.query(Subscription).filter(Subscription.company_id == company.id).one()
    starter = db.query(Plan).filter(Plan.name == "Starter").one()
    assert sub.plan_id == starter.id and sub.status == "trialing"

    login = client.post("/api/auth/login",
                        data={"username": "founder@newco.com", "password": "s3cret-pw"},
                        headers={"Content-Type": "application/x-www-form-urlencoded"})
    assert login.status_code == 200, login.text  # trial company can log in
```

Verify the signup request field names against `UserCreate` (read `app/schemas`); adjust keys if the schema differs.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/billing/test_signup_trial.py -v`
Expected: FAIL — company status is `pending`, owner status `pending`, no subscription, login blocked with "pending approval".

- [ ] **Step 3: Add the enum value + column**

In `app/models/core/enums.py`, add to `CompanyStatus`: `TRIAL = "trial"`.

In `app/models/core/company.py`, add:

```python
    trial_ends_at = Column(DateTime(timezone=True), nullable=True)
```

(Ensure `DateTime` is imported — it already is in that file.)

- [ ] **Step 4: Update signup**

In `app/routers/auth/auth.py` `signup`, change the company/user creation block: set `new_company.status = "trial"`, `new_company.trial_ends_at = datetime.now(timezone.utc) + timedelta(days=settings.TRIAL_DAYS)`; set the owner `db_user.status = "active"` (was `"pending"`). After `db.flush()` of the company (before the final commit), create the subscription:

```python
    from app.models.billing import Plan, Subscription
    starter = db.query(Plan).filter(Plan.name == "Starter").first()
    if starter:
        db.add(Subscription(
            company_id=new_company.id, plan_id=starter.id, provider="razorpay",
            status="trialing", trial_ends_at=new_company.trial_ends_at,
        ))
```

Add imports at the top if missing: `from datetime import timedelta` (and confirm `datetime, timezone` are already imported), `from app.config import settings`. Update the closing response `message` to "Trial started." Read the exact current lines (auth.py:158-178, 220-225) before editing so the surgical edit matches.

- [ ] **Step 5: Allow trial login**

In `_check_company_status` (`auth.py:125`), the current checks block `pending`/`suspended`/`rejected`. `trial` is not in that set, so it already passes — **verify** by reading the function; if it uses an allowlist (only `active` passes) instead of a blocklist, add `trial` to the allowed set. Add an expiry guard: if `company.status == "trial"` and `company.trial_ends_at` is in the past, raise 403 "Trial expired — please upgrade."

- [ ] **Step 6: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/billing/test_signup_trial.py -v`
Expected: PASS.

- [ ] **Step 7: Run the full suite**

Run: `cd backend && python -m pytest -q`
Expected: all green. Watch for existing signup tests asserting `status == "pending"` — if any exist they encode the old behavior; update them to expect `trial` and note it at the checkpoint.

- [ ] **Step 8: Checkpoint** — stop for review.

---

### Task 6: Billing portal endpoints

**Files:**
- Modify: `backend/app/routers/billing/__init__.py` (add subscription/checkout/cancel routes)
- Test: `backend/tests/billing/test_billing_portal.py`

**Interfaces:**
- Consumes: `get_current_user`/`require_admin` (`app/utils/dependencies.py`), `get_billing_provider`, `Subscription`, `Plan`, the Task 7 `current_seat_usage` is **not** required here (usage summary computed inline from users).
- Produces: `GET /api/billing/subscription` (plan + status + limits), `POST /api/billing/checkout` (returns provider handle), `POST /api/billing/cancel`.

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/billing/test_billing_portal.py
from app.services.billing.seed import seed_plans
from app.models.billing import Plan, Subscription
from tests.helpers.factories import create_company
from tests.helpers.auth import create_active_user, login_user


def _company_with_sub(db, status="trialing"):
    seed_plans(db)
    company = create_company(db, name="Portal Co", company_code="PCO", status="trial")
    plan = db.query(Plan).filter(Plan.name == "Starter").one()
    db.add(Subscription(company_id=company.id, plan_id=plan.id, status=status)); db.commit()
    return company


def test_get_subscription_returns_plan_and_limits(db, client):
    company = _company_with_sub(db)
    create_active_user(db, email="admin@portal.com", role="admin", company_id=company.id)
    login_user(client, "admin@portal.com")
    resp = client.get("/api/billing/subscription")
    assert resp.status_code == 200
    body = resp.json()
    assert body["plan"]["name"] == "Starter"
    assert body["status"] == "trialing"
    assert body["limits"]["max_users"] == 10


def test_checkout_returns_provider_handle(db, client):
    company = _company_with_sub(db)
    create_active_user(db, email="admin@portal.com", role="admin", company_id=company.id)
    login_user(client, "admin@portal.com")
    resp = client.post("/api/billing/checkout", json={"plan_id": db.query(Plan).filter(Plan.name == "Growth").one().id})
    assert resp.status_code == 200
    assert "subscription_id" in resp.json()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/billing/test_billing_portal.py -v`
Expected: FAIL — routes 404.

- [ ] **Step 3: Add the routes**

Append to `app/routers/billing/__init__.py`:

```python
from pydantic import BaseModel
from app.models.core.user import User
from app.models.core.company import Company
from app.models.billing import Plan
from app.utils.dependencies import require_admin


def _load_sub(db, company_id):
    sub = db.query(Subscription).filter(Subscription.company_id == company_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="No subscription for this company")
    return sub


@router.get("/subscription")
def get_subscription(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    sub = _load_sub(db, current_user.company_id)
    plan = db.query(Plan).filter(Plan.id == sub.plan_id).one()
    used = db.query(User).filter(User.company_id == current_user.company_id, User.status != "disabled").count()
    return {
        "status": sub.status,
        "plan": {"id": plan.id, "name": plan.name, "price_monthly": float(plan.price_monthly)},
        "limits": {"max_users": plan.max_users, "max_teams": plan.max_teams, "max_storage_gb": plan.max_storage_gb},
        "usage": {"users": used},
        "trial_ends_at": sub.trial_ends_at.isoformat() if sub.trial_ends_at else None,
    }


class CheckoutRequest(BaseModel):
    plan_id: int


@router.post("/checkout")
def checkout(body: CheckoutRequest, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.id == current_user.company_id).one()
    plan = db.query(Plan).filter(Plan.id == body.plan_id, Plan.is_active == True).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    handle = get_billing_provider().create_checkout(company, plan)
    sub = _load_sub(db, current_user.company_id)
    sub.provider_subscription_id = handle.get("subscription_id")
    db.commit()
    return handle


@router.post("/cancel")
def cancel(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    sub = _load_sub(db, current_user.company_id)
    get_billing_provider().cancel(sub)
    sub.status = "cancelled"
    db.commit()
    return {"status": "cancelled"}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/billing/test_billing_portal.py -v`
Expected: PASS.

- [ ] **Step 5: Run the full suite**

Run: `cd backend && python -m pytest -q`
Expected: all green.

- [ ] **Step 6: Checkpoint** — stop for review.

---

### Task 7: Limit enforcement (phase-exit gate)

**Files:**
- Create: `backend/app/services/billing/limits.py`
- Modify: `backend/app/models/ops/document.py` (add `file_size`)
- Modify: `backend/app/routers/admin/admin.py` (`create_invite` ~:1042; `create_team` ~:453)
- Modify: `backend/app/routers/ops/documents.py` (`upload_document` ~:108-123)
- Test: `backend/tests/billing/test_limits.py`

**Interfaces:**
- Consumes: `Plan`, `Subscription` (Task 1); `Invite`, `User`, `Team`, `Document` models.
- Produces:
  - `current_seat_usage(db, company_id) -> int` = active users + pending invites.
  - `resolve_plan(db, company_id) -> Plan` (subscription's plan, else Starter fallback).
  - `assert_can_add_user(db, company_id)`, `assert_can_add_team(db, company_id)`, `assert_can_upload(db, company_id, incoming_bytes)` — each raises `HTTPException(status_code=402, detail={...})` on breach.

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/billing/test_limits.py
import pytest
from fastapi import HTTPException
from app.services.billing.seed import seed_plans
from app.services.billing.limits import assert_can_add_user, current_seat_usage
from app.models.billing import Plan, Subscription
from app.models.core.invite import Invite
from app.models.core.enums import InviteStatus
from tests.helpers.factories import create_company
from tests.helpers.auth import create_active_user, login_user


def _company_on_plan(db, max_users):
    seed_plans(db)
    plan = db.query(Plan).filter(Plan.name == "Starter").one()
    plan.max_users = max_users
    company = create_company(db, name="Seat Co", company_code="SEA", status="active")
    db.add(Subscription(company_id=company.id, plan_id=plan.id, status="active")); db.commit()
    return company


def test_seat_usage_counts_users_and_pending_invites(db):
    company = _company_on_plan(db, max_users=5)
    create_active_user(db, email="u1@seat.com", role="admin", company_id=company.id)
    db.add(Invite(company_id=company.id, email="p1@seat.com", full_name="P1", role="sales",
                  token="tok1", hashed_password="x", status=InviteStatus.PENDING))
    db.commit()
    assert current_seat_usage(db, company.id) == 2


def test_add_user_blocked_at_limit(db):
    company = _company_on_plan(db, max_users=1)
    create_active_user(db, email="u1@seat.com", role="admin", company_id=company.id)  # fills the 1 seat
    with pytest.raises(HTTPException) as exc:
        assert_can_add_user(db, company.id)
    assert exc.value.status_code == 402
    assert exc.value.detail["limit"] == 1


def test_create_invite_returns_402_at_seat_limit(db, client):
    company = _company_on_plan(db, max_users=1)
    create_active_user(db, email="owner@seat.com", role="admin", company_id=company.id)  # seat 1 of 1
    login_user(client, "owner@seat.com")
    resp = client.post("/api/admin/invites", json={"email": "new@seat.com", "full_name": "New", "role": "sales"})
    assert resp.status_code == 402, resp.text
    assert resp.json()["detail"]["upgrade_path"]
```

Read `app/models/core/invite.py` and `enums.py` first to confirm `Invite` field names and `InviteStatus.PENDING`; confirm the invite route path/prefix in `admin.py` (`/api/admin/invites` assumed — adjust to the real prefix).

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/billing/test_limits.py -v`
Expected: FAIL — `limits` module missing; invite endpoint returns 200/other.

- [ ] **Step 3: Write the limits service**

```python
# backend/app/services/billing/limits.py
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models.core.user import User
from app.models.core.invite import Invite
from app.models.core.enums import InviteStatus
from app.models.billing import Plan, Subscription

_UPGRADE_PATH = "/settings/billing"


def resolve_plan(db: Session, company_id: int) -> Plan:
    sub = db.query(Subscription).filter(Subscription.company_id == company_id).first()
    if sub:
        plan = db.query(Plan).filter(Plan.id == sub.plan_id).first()
        if plan:
            return plan
    return db.query(Plan).filter(Plan.name == "Starter").one()


def current_seat_usage(db: Session, company_id: int) -> int:
    users = db.query(User).filter(User.company_id == company_id, User.status != "disabled").count()
    invites = db.query(Invite).filter(Invite.company_id == company_id,
                                      Invite.status == InviteStatus.PENDING).count()
    return users + invites


def _deny(limit, current, resource):
    raise HTTPException(status_code=402, detail={
        "message": f"{resource} limit reached for your plan.",
        "limit": limit, "current": current, "upgrade_path": _UPGRADE_PATH,
    })


def assert_can_add_user(db: Session, company_id: int) -> None:
    plan = resolve_plan(db, company_id)
    used = current_seat_usage(db, company_id)
    if used >= plan.max_users:
        _deny(plan.max_users, used, "Seat")


def assert_can_add_team(db: Session, company_id: int) -> None:
    from app.models.core.team import Team
    plan = resolve_plan(db, company_id)
    used = db.query(Team).filter(Team.company_id == company_id).count()
    if used >= plan.max_teams:
        _deny(plan.max_teams, used, "Team")


def assert_can_upload(db: Session, company_id: int, incoming_bytes: int) -> None:
    from app.models.ops.document import Document
    plan = resolve_plan(db, company_id)
    if plan.max_storage_gb is None:
        return
    used = db.query(func.coalesce(func.sum(Document.file_size), 0)).filter(
        Document.company_id == company_id).scalar() or 0
    cap = plan.max_storage_gb * (1024 ** 3)
    if used + incoming_bytes > cap:
        _deny(cap, used, "Storage")
```

Add `from sqlalchemy import func` at the top of the file.

- [ ] **Step 4: Add `Document.file_size`**

In `app/models/ops/document.py`, add:

```python
    file_size = Column(Integer, nullable=False, default=0)
```

(Confirm `Integer` is imported — it is.)

- [ ] **Step 5: Wire enforcement into the endpoints**

In `create_invite` (`admin.py:1042`), immediately after the `company_id is None` guard and before creating the `Invite`, add:

```python
    from app.services.billing.limits import assert_can_add_user
    assert_can_add_user(db, current_user.company_id)
```

In `create_team` (`admin.py:453`), before `new_team = Team(...)`:

```python
    from app.services.billing.limits import assert_can_add_team
    assert_can_add_team(db, current_user.company_id)
```

In `upload_document` (`documents.py`), the handler already reads `file_bytes` (line ~108). After the size-limit check and before saving, add the quota check, and set `file_size` on the model:

```python
    from app.services.billing.limits import assert_can_upload
    assert_can_upload(db, current_user.company_id, len(file_bytes))
```

and add `file_size=len(file_bytes),` to the `Document(...)` constructor (~line 120).

- [ ] **Step 6: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/billing/test_limits.py -v`
Expected: PASS.

- [ ] **Step 7: Run the full suite**

Run: `cd backend && python -m pytest -q`
Expected: all green (baseline 139 + all new billing tests).

- [ ] **Step 8: Final checkpoint** — Phase 1 done. Verify against the phase-exit gate: signup→trial, test-mode webhook activates, 11th seat 402s. Stop for review.

---

## Phase-exit verification (spec goal)

Run the whole billing suite and the full suite:

```bash
cd backend && python -m pytest tests/billing -v && python -m pytest -q
```

The gate is met when: a signup lands a trial with a Starter subscription; a signed `subscription.charged` webhook flips status to `active` and a replay is a no-op; and filling seats to `max_users` makes the next `create_invite` return **402** with `limit`, `current`, and `upgrade_path`.
