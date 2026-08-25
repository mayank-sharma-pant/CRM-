# Blueprint (Required Stages) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Opt-in per-pipeline Blueprint so deals cannot skip open stages or leave a stage without required built-in fields; Lost anytime; Won only from the last open stage.

**Architecture:** Two columns (`pipelines.blueprint_enabled`, `pipeline_stages.required_fields`). Validation in `app/services/sales/blueprint.py`; `move_deal_stage` calls it when enabled. Admin/MD toggle + required-field config; board UI shows chips and surfaces move errors.

**Tech Stack:** FastAPI, SQLAlchemy, Pydantic, Next.js App Router, axios, Tailwind. Tests: pytest + FastAPI `TestClient` (in-memory SQLite).

**Spec:** [docs/superpowers/specs/2026-08-25-phase4-blueprint-design.md](../specs/2026-08-25-phase4-blueprint-design.md)

## Global Constraints

- No new pip dependency. No Alembic (two pre-existing heads).
- New columns via `_MISSING_COLUMNS` in `backend/create_missing_tables.py` plus matching SQLAlchemy attributes. No new tables.
- Never take `company_id` from the request body.
- By-id miss (including cross-tenant) is **404**. Bad config / illegal Blueprint move is **400**.
- Config writes: admin / md only. Sales and manager move deals under Blueprint rules but cannot toggle or edit `required_fields`.
- Allowlist: `title`, `amount`, `expected_close`, `client_id`, `probability`.
- Field failure detail: `{"message": "missing required fields to leave this stage", "missing_fields": [...]}`. Illegal move detail string: `"blueprint does not allow this stage move"`.
- Test password `"pw"`. Reset `auth_limiter._buckets.clear()` in login-heavy tests.
- Run pytest from `backend/`: `pytest tests/... -v`.
- `git add` only the files listed in that task.

### File map

| File | Responsibility |
|---|---|
| `backend/app/models/sales/pipeline.py` | `blueprint_enabled`, `required_fields` columns |
| `backend/create_missing_tables.py` | `_MISSING_COLUMNS` ALTERs |
| `backend/app/services/sales/blueprint.py` | move + field validation |
| `backend/app/schemas/sales/deal.py` | `PipelineUpdate.blueprint_enabled`, `StageUpdate.required_fields` |
| `backend/app/routers/sales/deals.py` | wire toggle, stage PATCH, move, board serialize |
| `frontend/app/sales/deals/page.jsx` | toggle, chips, required-fields editor, move errors |
| `docs/IMPLEMENTATION_PLAN.md` | Phase 4.2 progress log |

---

### Task 1: Schema columns

**Files:**
- Modify: `backend/app/models/sales/pipeline.py`
- Modify: `backend/create_missing_tables.py`
- Test: `backend/tests/sales/test_blueprint_schema.py`

**Interfaces:**
- Consumes: existing `Pipeline`, `PipelineStage`
- Produces: `Pipeline.blueprint_enabled: bool` (default False); `PipelineStage.required_fields: str | None` (JSON text)

- [ ] **Step 1: Write the failing schema test**

```python
from sqlalchemy import inspect

from app.models.sales.pipeline import Pipeline, PipelineStage
from tests.helpers.factories import create_company


def test_blueprint_columns_exist(db_engine):
    p_cols = {c["name"] for c in inspect(db_engine).get_columns("pipelines")}
    s_cols = {c["name"] for c in inspect(db_engine).get_columns("pipeline_stages")}
    assert "blueprint_enabled" in p_cols
    assert "required_fields" in s_cols


def test_can_persist_blueprint_fields(db):
    company = create_company(db, name="BP Co", company_code="BPC")
    pipeline = Pipeline(company_id=company.id, name="Sales", is_default=True, blueprint_enabled=True)
    db.add(pipeline)
    db.flush()
    stage = PipelineStage(
        company_id=company.id, pipeline_id=pipeline.id, name="Qualification",
        position=1, required_fields='["amount","expected_close"]',
    )
    db.add(stage)
    db.commit()
    db.refresh(pipeline)
    db.refresh(stage)
    assert pipeline.blueprint_enabled is True
    assert stage.required_fields == '["amount","expected_close"]'
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && pytest tests/sales/test_blueprint_schema.py -v`

Expected: FAIL — `blueprint_enabled` / `required_fields` not in columns.

- [ ] **Step 3: Write minimal implementation**

On `Pipeline` (after `is_active`):

```python
blueprint_enabled = Column(Boolean, nullable=False, default=False)
```

On `PipelineStage` (after `is_active`):

```python
required_fields = Column(Text, nullable=True)
```

Import `Text` from sqlalchemy if not already imported in that file.

Append to `_MISSING_COLUMNS`:

```python
    ("pipelines", "blueprint_enabled", "BOOLEAN DEFAULT FALSE"),
    ("pipeline_stages", "required_fields", "TEXT"),
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && pytest tests/sales/test_blueprint_schema.py -v`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/models/sales/pipeline.py backend/create_missing_tables.py \
  backend/tests/sales/test_blueprint_schema.py
git commit -m "$(cat <<'EOF'
feat(blueprint): add pipeline and stage columns for enforcement

EOF
)"
```

---

### Task 2: Blueprint service

**Files:**
- Create: `backend/app/services/sales/blueprint.py`
- Test: `backend/tests/sales/test_blueprint_service.py`

**Interfaces:**
- Consumes: Task 1 columns; `DealStageType` (`open`/`won`/`lost`)
- Produces:

```python
ALLOWED_REQUIRED_FIELDS = frozenset({"title", "amount", "expected_close", "client_id", "probability"})

class BlueprintError(Exception):
    def __init__(self, message: str, missing_fields: list[str] | None = None):
        super().__init__(message)
        self.message = message
        self.missing_fields = missing_fields

def parse_required_fields(raw) -> list[str]: ...
def missing_required_fields(deal, keys: list[str]) -> list[str]: ...
def open_stage_sequence(stages: list) -> list: ...
def allowed_target_ids(pipeline, stages, current_stage) -> set[int]: ...
def assert_blueprint_move(*, deal, pipeline, current_stage, target_stage, stages) -> None: ...
```

Rules (spec): if not `pipeline.blueprint_enabled`, return. Same stage → ok. Check leave fields on current. Target must be in `allowed_target_ids`. Active stages only. Open neighbors by index ±1. Lost anytime from open. Won only from last open. From won/lost → only last open.

- [ ] **Step 1: Write the failing service tests**

```python
from decimal import Decimal
from datetime import date
from types import SimpleNamespace

import pytest

from app.models.core.enums import DealStageType
from app.services.sales.blueprint import (
    allowed_target_ids, assert_blueprint_move, missing_required_fields, BlueprintError,
)


def _stage(id, position, stage_type, *, active=True, required=None):
    return SimpleNamespace(
        id=id, position=position, stage_type=stage_type, is_active=active,
        required_fields=required,
    )


def _pipeline(enabled=True):
    return SimpleNamespace(blueprint_enabled=enabled)


def _deal(**kwargs):
    base = dict(title="Roof", amount=Decimal("100"), expected_close=date(2026, 9, 1),
                client_id=1, probability=40)
    base.update(kwargs)
    return SimpleNamespace(**base)


def test_blueprint_off_allows_any_target():
    stages = [
        _stage(1, 1, DealStageType.OPEN),
        _stage(2, 2, DealStageType.OPEN),
        _stage(3, 3, DealStageType.WON),
    ]
    assert_blueprint_move(
        deal=_deal(), pipeline=_pipeline(False), current_stage=stages[0],
        target_stage=stages[2], stages=stages,
    )


def test_adjacent_ok_skip_forbidden_lost_ok_won_only_from_last():
    q = _stage(1, 1, DealStageType.OPEN, required='["amount"]')
    prop = _stage(2, 2, DealStageType.OPEN)
    won = _stage(3, 3, DealStageType.WON)
    lost = _stage(4, 4, DealStageType.LOST)
    stages = [q, prop, won, lost]
    pipe = _pipeline(True)
    assert allowed_target_ids(pipe, stages, q) == {prop.id, lost.id}
    assert allowed_target_ids(pipe, stages, prop) == {q.id, won.id, lost.id}
    assert_blueprint_move(deal=_deal(), pipeline=pipe, current_stage=q, target_stage=prop, stages=stages)
    with pytest.raises(BlueprintError, match="does not allow"):
        assert_blueprint_move(deal=_deal(), pipeline=pipe, current_stage=q, target_stage=won, stages=stages)
    assert_blueprint_move(deal=_deal(), pipeline=pipe, current_stage=q, target_stage=lost, stages=stages)
    assert_blueprint_move(deal=_deal(), pipeline=pipe, current_stage=prop, target_stage=won, stages=stages)


def test_missing_amount_and_reentry():
    q = _stage(1, 1, DealStageType.OPEN, required='["amount","expected_close"]')
    prop = _stage(2, 2, DealStageType.OPEN)
    won = _stage(3, 3, DealStageType.WON)
    stages = [q, prop, won]
    pipe = _pipeline(True)
    with pytest.raises(BlueprintError) as exc:
        assert_blueprint_move(
            deal=_deal(amount=Decimal("0"), expected_close=None),
            pipeline=pipe, current_stage=q, target_stage=prop, stages=stages,
        )
    assert set(exc.value.missing_fields) == {"amount", "expected_close"}
    assert missing_required_fields(_deal(amount=None), ["amount"]) == ["amount"]
    assert allowed_target_ids(pipe, stages, won) == {prop.id}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && pytest tests/sales/test_blueprint_service.py -v`

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `blueprint.py`**

```python
import json
from decimal import Decimal

from app.models.core.enums import DealStageType

ALLOWED_REQUIRED_FIELDS = frozenset(
    {"title", "amount", "expected_close", "client_id", "probability"}
)


class BlueprintError(Exception):
    def __init__(self, message: str, missing_fields: list[str] | None = None):
        super().__init__(message)
        self.message = message
        self.missing_fields = missing_fields


def parse_required_fields(raw) -> list[str]:
    if raw is None or raw == "":
        return []
    if isinstance(raw, list):
        keys = [str(x) for x in raw]
    else:
        try:
            data = json.loads(raw)
        except (TypeError, json.JSONDecodeError):
            return []
        if not isinstance(data, list):
            return []
        keys = [str(x) for x in data]
    return [k for k in keys if k in ALLOWED_REQUIRED_FIELDS]


def missing_required_fields(deal, keys: list[str]) -> list[str]:
    missing = []
    for key in keys:
        if key == "title":
            if not str(getattr(deal, "title", None) or "").strip():
                missing.append(key)
        elif key == "amount":
            amount = getattr(deal, "amount", None)
            if amount is None or Decimal(str(amount)) <= 0:
                missing.append(key)
        elif key == "expected_close":
            if getattr(deal, "expected_close", None) is None:
                missing.append(key)
        elif key == "client_id":
            if getattr(deal, "client_id", None) is None:
                missing.append(key)
        elif key == "probability":
            p = getattr(deal, "probability", None)
            if p is None or not (0 <= int(p) <= 100):
                missing.append(key)
    return missing


def _stage_type(stage) -> str:
    t = stage.stage_type
    return t.value if hasattr(t, "value") else str(t)


def open_stage_sequence(stages: list) -> list:
    open_stages = [
        s for s in stages
        if bool(getattr(s, "is_active", True)) and _stage_type(s) == DealStageType.OPEN.value
    ]
    return sorted(open_stages, key=lambda s: (s.position, s.id))


def allowed_target_ids(pipeline, stages, current_stage) -> set[int]:
    if current_stage is None:
        return set()
    active = [s for s in stages if bool(getattr(s, "is_active", True))]
    opens = open_stage_sequence(active)
    cur_type = _stage_type(current_stage)
    allowed: set[int] = set()
    if cur_type in (DealStageType.WON.value, DealStageType.LOST.value):
        if opens:
            allowed.add(opens[-1].id)
        return allowed
    # current is open
    open_ids = [s.id for s in opens]
    if current_stage.id in open_ids:
        idx = open_ids.index(current_stage.id)
        if idx > 0:
            allowed.add(open_ids[idx - 1])
        if idx + 1 < len(open_ids):
            allowed.add(open_ids[idx + 1])
        if opens and current_stage.id == opens[-1].id:
            for s in active:
                if _stage_type(s) == DealStageType.WON.value:
                    allowed.add(s.id)
    for s in active:
        if _stage_type(s) == DealStageType.LOST.value:
            allowed.add(s.id)
    return allowed


def assert_blueprint_move(*, deal, pipeline, current_stage, target_stage, stages) -> None:
    if not getattr(pipeline, "blueprint_enabled", False):
        return
    if current_stage is None or target_stage is None:
        raise BlueprintError("blueprint does not allow this stage move")
    if current_stage.id == target_stage.id:
        return
    missing = missing_required_fields(deal, parse_required_fields(current_stage.required_fields))
    if missing:
        raise BlueprintError(
            "missing required fields to leave this stage",
            missing_fields=missing,
        )
    if target_stage.id not in allowed_target_ids(pipeline, stages, current_stage):
        raise BlueprintError("blueprint does not allow this stage move")
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && pytest tests/sales/test_blueprint_service.py tests/sales/test_blueprint_schema.py -v`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/sales/blueprint.py backend/tests/sales/test_blueprint_service.py
git commit -m "$(cat <<'EOF'
feat(blueprint): enforce adjacent stages and required fields in service

EOF
)"
```

---

### Task 3: Wire deals API

**Files:**
- Modify: `backend/app/schemas/sales/deal.py`
- Modify: `backend/app/routers/sales/deals.py`
- Test: `backend/tests/sales/test_blueprint_api.py`

**Interfaces:**
- Consumes: `assert_blueprint_move`, `BlueprintError`, `parse_required_fields`, `ALLOWED_REQUIRED_FIELDS`
- Produces: API behaviour from the spec

Schema adds:

```python
# PipelineUpdate
blueprint_enabled: Optional[bool] = None

# StageUpdate
required_fields: Optional[list[str]] = None

# StageCreate (optional): required_fields: Optional[list[str]] = None
```

Router changes:
1. `_serialize_pipeline` include `"blueprint_enabled": bool(getattr(p, "blueprint_enabled", False))`
2. `_serialize_stage` include `"required_fields": parse_required_fields(s.required_fields)`
3. `update_pipeline`: if `blueprint_enabled` in dump, set it
4. `update_stage` / `create_stage`: if `required_fields` in data, validate every key in `ALLOWED_REQUIRED_FIELDS` else 400 `"invalid required field: {key}"`; store `json.dumps(keys)` or `None` if empty list
5. `move_deal_stage`: load pipeline + all stages for `deal.pipeline_id`; call `assert_blueprint_move`; on `BlueprintError` with `missing_fields` → `HTTPException(400, detail={"message": err.message, "missing_fields": err.missing_fields})`; else string detail
6. Board stage blocks: add `"required_fields": parse_required_fields(s.required_fields)`

Do **not** break existing stage tests with Blueprint off (default).

- [ ] **Step 1: Write failing API tests**

```python
import pytest
from decimal import Decimal

from app.utils.rate_limit import auth_limiter
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_client, create_company


@pytest.fixture(autouse=True)
def _reset_auth():
    auth_limiter._buckets.clear()
    yield


def _setup(client, db):
    company = create_company(db, name="BP", company_code="BP1")
    admin = create_active_user(db, email="admin@bp1.com", role="admin", company_id=company.id)
    create_active_user(db, email="sales@bp1.com", role="sales", company_id=company.id)
    login_user(client, admin.email)
    deal = client.post("/api/deals", json={"title": "Job", "amount": "0"}).json()
    stages = client.get("/api/deals/stages", params={"pipeline_id": deal["pipeline_id"]}).json()["items"]
    opens = [s for s in stages if s["stage_type"] == "open"]
    won = next(s for s in stages if s["stage_type"] == "won")
    lost = next(s for s in stages if s["stage_type"] == "lost")
    return company, admin, deal, opens, won, lost


def test_enable_blueprint_blocks_skip_and_missing_fields(client, db):
    _company, _admin, deal, opens, won, lost = _setup(client, db)
    pid = deal["pipeline_id"]
    assert client.patch(f"/api/deals/pipelines/{pid}", json={"blueprint_enabled": True}).status_code == 200
    first, second = opens[0], opens[1]
    client.patch(f"/api/deals/stages/{first['id']}", json={"required_fields": ["amount", "expected_close"]})
    skip = client.patch(f"/api/deals/{deal['id']}/stage", json={"stage_id": won["id"]})
    assert skip.status_code == 400
    assert skip.json()["detail"] == "blueprint does not allow this stage move"
    miss = client.patch(f"/api/deals/{deal['id']}/stage", json={"stage_id": second["id"]})
    assert miss.status_code == 400
    body = miss.json()["detail"]
    assert body["message"].startswith("missing required")
    assert set(body["missing_fields"]) == {"amount", "expected_close"}
    client.patch(f"/api/deals/{deal['id']}", json={
        "amount": "500.00", "expected_close": "2026-10-01", "client_id": create_client(db, company_id=_company.id, name="C").id,
    })
    # refresh deal company id — create_client needs company from fixture
```

Fix the client_id line — use company from `_setup`:

```python
def test_enable_blueprint_blocks_skip_and_missing_fields(client, db):
    company, _admin, deal, opens, won, lost = _setup(client, db)
    pid = deal["pipeline_id"]
    assert client.patch(f"/api/deals/pipelines/{pid}", json={"blueprint_enabled": True}).status_code == 200
    first, second = opens[0], opens[1]
    assert client.patch(
        f"/api/deals/stages/{first['id']}",
        json={"required_fields": ["amount", "expected_close"]},
    ).status_code == 200
    skip = client.patch(f"/api/deals/{deal['id']}/stage", json={"stage_id": won["id"]})
    assert skip.status_code == 400
    assert skip.json()["detail"] == "blueprint does not allow this stage move"
    miss = client.patch(f"/api/deals/{deal['id']}/stage", json={"stage_id": second["id"]})
    assert miss.status_code == 400
    body = miss.json()["detail"]
    assert set(body["missing_fields"]) == {"amount", "expected_close"}
    customer = create_client(db, company_id=company.id, name="Buyer", assigned_to_id=_admin.id)
    assert client.patch(f"/api/deals/{deal['id']}", json={
        "amount": "500.00", "expected_close": "2026-10-01", "client_id": customer.id,
    }).status_code == 200
    ok = client.patch(f"/api/deals/{deal['id']}/stage", json={"stage_id": second["id"]})
    assert ok.status_code == 200, ok.text
    mid_lost = client.patch(f"/api/deals/{deal['id']}/stage", json={"stage_id": lost["id"]})
    # now on second open — Lost from mid/open still allowed; but we already left first.
    # Move back to first open? Blueprint from second: neighbors first+third, lost, maybe won if last.
    # Simpler second test for Lost from first open:
```

Split into clear tests in the file:

1. `test_enable_blueprint_blocks_skip_and_missing_fields` — enable; skip to won from first → 400 string; leave first without amount → 400 object; fill amount+expected_close; ±1 → 200
2. `test_lost_from_mid_open_allowed` — enable; move to second (with fields cleared on first or set required empty); from second → lost → 200
3. `test_sales_cannot_toggle_or_edit_required_fields` — sales 403 on pipeline blueprint_enabled and stage required_fields
4. `test_invalid_required_field_key` — PATCH stage with `["nope"]` → 400
5. `test_board_includes_required_fields` — after setting required on a stage, GET board includes them

Use `_admin` from setup consistently in the fill patch.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && pytest tests/sales/test_blueprint_api.py -v`

Expected: FAIL — blueprint_enabled ignored / moves still free.

- [ ] **Step 3: Implement router + schema wiring**

Map `BlueprintError` in `move_deal_stage` exactly as the spec. Import `json` if storing required_fields. When applying `required_fields` on stage update, do not `setattr(stage, "required_fields", list)` — convert to JSON string or None.

- [ ] **Step 4: Run tests**

Run: `cd backend && pytest tests/sales/test_blueprint_api.py tests/sales/test_blueprint_service.py tests/sales/test_deals_board.py tests/sales/test_deals.py -v`

Expected: PASS (adjust deal test file names if they differ — glob `tests/sales/test_deal*.py`).

- [ ] **Step 5: Commit**

```bash
git add backend/app/schemas/sales/deal.py backend/app/routers/sales/deals.py \
  backend/tests/sales/test_blueprint_api.py
git commit -m "$(cat <<'EOF'
feat(blueprint): enforce stage rules on deal moves and config APIs

EOF
)"
```

---

### Task 4: Cross-tenant isolation

**Files:**
- Test: `backend/tests/tenancy/test_blueprint_cross_tenant.py`

**Interfaces:**
- Consumes: Task 3 endpoints
- Produces: B cannot PATCH A’s `blueprint_enabled` or stage `required_fields` (404); A owner positive control

- [ ] **Step 1: Write the test**

```python
import pytest

from app.utils.rate_limit import auth_limiter
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


@pytest.fixture(autouse=True)
def _reset_auth():
    auth_limiter._buckets.clear()
    yield


def test_cross_tenant_cannot_edit_blueprint_config(client, db):
    a = create_company(db, name="A", company_code="BPA")
    b = create_company(db, name="B", company_code="BPB")
    create_active_user(db, email="admin@a.com", role="admin", company_id=a.id)
    create_active_user(db, email="admin@b.com", role="admin", company_id=b.id)
    login_user(client, "admin@a.com")
    deal = client.post("/api/deals", json={"title": "A deal", "amount": "10"}).json()
    pid = deal["pipeline_id"]
    sid = deal["stage_id"]
    assert client.patch(f"/api/deals/pipelines/{pid}", json={"blueprint_enabled": True}).status_code == 200

    login_user(client, "admin@b.com")
    assert client.patch(f"/api/deals/pipelines/{pid}", json={"blueprint_enabled": False}).status_code == 404
    assert client.patch(f"/api/deals/stages/{sid}", json={"required_fields": ["amount"]}).status_code == 404

    login_user(client, "admin@a.com")
    assert client.patch(f"/api/deals/pipelines/{pid}", json={"blueprint_enabled": True}).status_code == 200
    assert client.patch(f"/api/deals/stages/{sid}", json={"required_fields": ["amount"]}).status_code == 200
```

- [ ] **Step 2: Run test**

Run: `cd backend && pytest tests/tenancy/test_blueprint_cross_tenant.py -v`

Expected: PASS if Task 3 scoping holds; if 403 instead of 404, fix `_get_pipeline` / stage lookup to stay 404.

- [ ] **Step 3: Commit**

```bash
git add backend/tests/tenancy/test_blueprint_cross_tenant.py
git commit -m "$(cat <<'EOF'
test(blueprint): prove pipeline blueprint config is tenant-scoped

EOF
)"
```

---

### Task 5: Frontend board + progress log

**Files:**
- Modify: `frontend/app/sales/deals/page.jsx`
- Modify: `docs/IMPLEMENTATION_PLAN.md`

**Interfaces:**
- Consumes: `blueprint_enabled` on pipelines; `required_fields` on board stages; move 400 shapes from Task 3
- Produces: admin/MD toggle; chips; required-fields multi-select; toast on failed move

- [ ] **Step 1: Board UI**

In `page.jsx` (already has `canConfigure` for admin/md):

1. After pipeline `<select>`, when `canConfigure` and `pipelineId` set: checkbox “Enforce blueprint” bound to `selected.blueprint_enabled`. On change → `PATCH /deals/pipelines/{id}` `{blueprint_enabled}` then refresh pipelines + board.
2. On each stage column header: if `stage.required_fields?.length`, show small chips (e.g. `amount`, `expected_close`).
3. When `canConfigure` and blueprint enabled: button/popover or `<select multiple>` to set required fields for that stage → `PATCH /deals/stages/{stage_id}` with `{required_fields: [...]}` then refetch board. Sales: chips only.
4. In the existing stage-move handler (`patch /deals/{id}/stage`): on error, parse `err.response?.data?.detail` — if object, toast `detail.message` and join `missing_fields`; if string, toast it. Refetch board so UI does not stay on the illegal stage. Keep loading/error/empty/success board states.

Use real `<button type="button">` and label the checkbox.

- [ ] **Step 2: IMPLEMENTATION_PLAN.md**

After Phase 4.1 section, add:

```markdown
### Phase 4.2 — Blueprint (required stages) — DONE (code)

Opt-in per pipeline. Adjacent open moves; Lost from any open; Won from last open;
required built-in fields on leave. Spec: [`superpowers/specs/2026-08-25-phase4-blueprint-design.md`](./superpowers/specs/2026-08-25-phase4-blueprint-design.md); plan: [`superpowers/plans/2026-08-25-phase4-blueprint.md`](./superpowers/plans/2026-08-25-phase4-blueprint.md).

- **Verification:** `test_blueprint_schema.py`, `test_blueprint_service.py`, `test_blueprint_api.py`, `test_blueprint_cross_tenant.py`.
- **Deploy:** `create_missing_tables.py` for `pipelines.blueprint_enabled` and `pipeline_stages.required_fields`.
- **Residuals:** no transition-edge graph, no custom-field requirements, no approvals.
```

- [ ] **Step 3: Verify**

Run: `cd backend && pytest tests/sales/test_blueprint_schema.py tests/sales/test_blueprint_service.py tests/sales/test_blueprint_api.py tests/tenancy/test_blueprint_cross_tenant.py -v`

Run: `cd frontend && npx next build` (or note if blocked).

- [ ] **Step 4: Commit**

```bash
git add frontend/app/sales/deals/page.jsx docs/IMPLEMENTATION_PLAN.md
git commit -m "$(cat <<'EOF'
feat(blueprint): board toggle, required-field chips, and move errors

EOF
)"
```

---

## Self-review (plan vs spec)

| Spec requirement | Task |
|---|---|
| `blueprint_enabled` + `required_fields` columns / `_MISSING_COLUMNS` | 1 |
| Adjacent / Lost / Won / re-entry / field gates / off pass-through | 2 |
| Pipeline toggle, stage required_fields, move 400 shapes, board chips data | 3 |
| Cross-tenant 404 + positive control | 4 |
| Board UI toggle, chips, editor, toast | 5 |
| No transition graph / custom fields / approvals | global non-goals |

No placeholders remain. `BlueprintError` and allowlist names are consistent across Tasks 2–3.
