# Phase 4.2 — Blueprint (required stages) (design)

> Companion to [IMPLEMENTATION_PLAN.md](../../IMPLEMENTATION_PLAN.md) Phase 4 and
> [PRODUCT_ROADMAP.md](../../PRODUCT_ROADMAP.md) §4.2 / §8 Phase 4.
> Extends [Phase 2 deals](./2026-08-24-phase2-deals-design.md) and
> [Phase 3.3 multiple pipelines](./2026-08-25-phase3-multiple-pipelines-design.md).
> Grounded in the code as of 25 Aug 2026 (verified, not assumed).
> Scope: **only** opt-in per-pipeline stage enforcement — adjacent open moves,
> Lost/Won escape rules, and required built-in deal fields before leaving a stage.

## Problem

`PATCH /api/deals/{id}/stage` (`app/routers/sales/deals.py`) only checks that the
target stage belongs to the deal’s pipeline. A deal can jump Qualification → Won
with no amount, no close date, and no client. Zoho Blueprint exists so process
cannot be skipped. We need the same job without a Deluge-style transition builder.

## Decisions (locked in brainstorming)

1. **Adjacent moves + required fields (A+C).** Not a free transition-edge graph in v0.
2. **Opt-in per pipeline** — `pipelines.blueprint_enabled`, default `false`. Existing
   boards keep free jumps until an admin/MD turns Blueprint on.
3. **Built-in deal fields only** for requirements: `title`, `amount`, `expected_close`,
   `client_id`, `probability`. No custom fields in v0.
4. **Approach:** columns on existing tables + `app/services/sales/blueprint.py` called
   from `move_deal_stage`. No new tables. No Alembic; `_MISSING_COLUMNS` for the two
   new columns. No new pip deps.

## Non-goals

Transition-edge tables, approvals, ownership transfer on stage enter, custom-field
requirements, lead-status blueprints, auto-create task/email on stage enter, forcing
Blueprint on at signup, moving deals across pipelines.

## Data model

### `pipelines.blueprint_enabled`

| column | type | notes |
|---|---|---|
| blueprint_enabled | Boolean, not null, default false | opt-in |

### `pipeline_stages.required_fields`

| column | type | notes |
|---|---|---|
| required_fields | Text, nullable | JSON array of allowlisted keys, e.g. `["amount","expected_close"]`. Null or `[]` = no field gates on leave |

**Allowlist:** `title`, `amount`, `expected_close`, `client_id`, `probability`. Any other
key on stage create/update → 400 `"invalid required field: …"`.

Both columns via `_MISSING_COLUMNS` in `create_missing_tables.py` and matching SQLAlchemy
model attributes. Fresh DBs get them from the models on `create_all` once columns exist
on the mapped classes (existing tables still need the ALTER path).

## Move rules (only when `pipeline.blueprint_enabled` is true)

Service: `assert_blueprint_move(db, *, deal, pipeline, current_stage, target_stage, stages) -> None`.
Raises `ValueError` with a message; router maps to HTTP 400. Optional structured
`missing_fields` returned in the HTTP body when the failure is a field gate.

Active stages only (`is_active` true) participate in neighbor / “last open” math.

### 1. Required fields on leave

Before leaving `current_stage`, every key in `current_stage.required_fields` must pass:

| key | present when |
|---|---|
| `title` | non-blank string after strip |
| `amount` | not null and `> 0` |
| `expected_close` | not null |
| `client_id` | not null |
| `probability` | not null and integer in 0–100 |

Missing → 400 with `detail` like `"missing required fields to leave this stage"` and
`missing_fields: ["amount", …]`.

Required fields are checked against the **current** stage (the one being left), not the target.

### 2. Allowed targets

Let `open_stages` = active stages with `stage_type == open`, ordered by `position`.

From an **open** current stage, target may be:

- any active **Lost** stage in the same pipeline, or
- any active **Won** stage **only if** current is the last open stage
  (`current.id == open_stages[-1].id`), or
- an active **open** stage whose index in `open_stages` is exactly ±1 from current’s index.

From a **Won** or **Lost** current stage (re-open):

- only the **last open** stage (undo close). No direct jump to mid-pipeline or to the other closed type without going through last open first.

Same-stage no-op (target == current) → allow (idempotent).

### 3. When Blueprint is off

`assert_blueprint_move` returns immediately. Existing “stage belongs to deal’s pipeline”
check in the router remains the only gate.

### 4. Create deal

Unchanged — still lands on the first stage (or requested stage). Blueprint does not
block create. Field gates apply on the first *leave*.

### 5. `closed_at`

Unchanged: entering Won/Lost sets `closed_at` if unset; entering open clears it.

## API

All under existing `/api/deals` router. Admin/MD for config writes (same as pipeline/stage
config today). Sales/manager: stage moves subject to Blueprint; cannot toggle or edit
`required_fields`.

| method + path | change |
|---|---|
| `GET /pipelines`, `POST/PATCH/DELETE /pipelines/{id}` | serialize `blueprint_enabled`. `PipelineUpdate` / create accept `blueprint_enabled?` (PATCH only for toggle; create defaults false) |
| `GET /stages`, stage create/update serialize | include `required_fields` as `list[str]` (empty list if null) |
| `PATCH /stages/{id}` (`StageUpdate`) | `required_fields: Optional[list[str]] = None`. Use `exclude_unset`: omitted → leave unchanged; `[]` or explicit empty list → clear (store null); non-empty → validate allowlist and store JSON. |
| `PATCH /{deal_id}/stage` | After ownership checks, call `assert_blueprint_move`. Field failure → `HTTPException(400, detail={"message": "missing required fields to leave this stage", "missing_fields": [...]})`. Illegal move (skip / Won early / bad re-entry) → `HTTPException(400, detail="blueprint does not allow this stage move")`. |
| Board response | each stage block includes `required_fields` so the UI can show chips without a second fetch |

Cross-tenant: pipeline/stage by-id miss stays **404**. Bad config body stays **400**.

## Service API (`app/services/sales/blueprint.py`)

```python
ALLOWED_REQUIRED_FIELDS = frozenset({"title", "amount", "expected_close", "client_id", "probability"})

def parse_required_fields(raw) -> list[str]: ...
def missing_required_fields(deal, keys: list[str]) -> list[str]: ...
def open_stage_sequence(stages: list) -> list: ...  # active open, sorted by position
def allowed_target_ids(pipeline, stages, current_stage) -> set[int]: ...
def assert_blueprint_move(*, deal, pipeline, current_stage, target_stage, stages) -> None: ...
```

`assert_blueprint_move` raises `BlueprintError(message, missing_fields=None)` — a small
`Exception` subclass with those two attributes — so the router can map field failures to
the object `detail` shape and illegal moves to a string `detail`.

## Frontend

Canonical surface: `frontend/app/sales/deals/page.jsx` (board already has pipeline select
and per-deal stage `<select>`).

- Admin/MD: checkbox/toggle “Enforce blueprint” next to the pipeline select →
  `PATCH /deals/pipelines/{id}` with `{blueprint_enabled}`.
- When enabled, each column header shows required-field chips from the board payload.
- Admin/MD: small “Required fields” control per stage (multi-select of the five keys) →
  `PATCH /deals/stages/{id}` with `{required_fields}`. Sales sees chips read-only.
- On stage move 400: toast the message; if `missing_fields` present, list them. Do not
  leave the UI believing the move succeeded — refetch board on failure.

Deal detail page stage display can stay read-only for v0 if moves happen on the board;
if detail already moves stages, apply the same error handling.

## Testing (TDD)

- `backend/tests/sales/test_blueprint_service.py` — unit tests on `allowed_target_ids` /
  `missing_required_fields` / `assert_blueprint_move` (blueprint off; adjacent ok; skip
  forbidden; Lost from mid-open ok; Won only from last open; Won early forbidden;
  missing amount; re-entry Won → last open only).
- `backend/tests/sales/test_blueprint_api.py` — enable blueprint; skip → 400; missing
  fields → 400 with `missing_fields`; valid ±1 → 200; Lost mid-pipeline → 200; sales 403
  on `blueprint_enabled` / `required_fields` write; invalid required key → 400.
- `backend/tests/tenancy/test_blueprint_cross_tenant.py` — B cannot PATCH A’s
  `blueprint_enabled` or stage `required_fields` (404) + A owner positive control.

Existing deal stage tests must still pass with Blueprint off (default).

## Deploy

Run `create_missing_tables.py` on deploy (`_MISSING_COLUMNS` for the two new columns).

## Done when

Enable Blueprint on a pipeline → cannot jump Qualification → Won → set required fields →
step through open stages → Won from last open; Lost from a mid-open stage still works;
re-open only lands on last open; company B cannot change A’s Blueprint config; suite green.
