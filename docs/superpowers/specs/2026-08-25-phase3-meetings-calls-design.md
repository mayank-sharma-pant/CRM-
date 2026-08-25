# Phase 3.2 — Meetings + call log (design)

> Part of [PRODUCT_ROADMAP.md](../../PRODUCT_ROADMAP.md) §4.1 ("Tasks, meetings, calls") and
> [IMPLEMENTATION_PLAN.md](../../IMPLEMENTATION_PLAN.md) Phase 3.
> Phase 3 is a menu of independent sub-projects; **this spec covers only meetings and call logs.**
> Pulled forward by explicit decision after 3.1 (TOTP). Grounded in the code as of 25 Aug 2026.

## Goal

A sales user can **schedule a meeting** and **log a call** on a lead or a deal. Both appear on
that record’s activity timeline. Company B cannot read or mutate company A’s rows (404).

**Done when:** create a meeting and a call against a lead via API → both list back filtered by
`lead_id` → they render on the lead (and deal) detail UI → cross-tenant GET/PATCH/DELETE is 404
with a positive control that the owner still succeeds.

## Non-goals (YAGNI)

Click-to-call, Exotel/Twilio, Google/Microsoft calendar sync, attendee many-to-many, reminders,
converting a follow-up into a call log, a standalone calendar page, WhatsApp.

## Decisions

1. **Two tables** (`meetings`, `call_logs`) matching `Task` / `FollowUp` / `EmailLog`. Not a
   polymorphic `activities` table — unifying tasks/follow-ups is out of scope.
2. **At least one parent** of `lead_id` / `client_id` / `deal_id`. Each provided FK must resolve
   in the caller’s company (400 if not). Do not accept `company_id` from the body.
3. **Company scope only** for v0. No extra sales/manager row filter on meetings/calls — tenancy
   is the gate. Role gating on the *parent* (lead/deal) already exists; this feature does not
   invent a second sharing model.
4. **No Alembic, no new pip deps.** New tables via `Base.metadata.create_all`. Same as Phases 0–3.1.
5. **Datetimes stored naive UTC**, returned with `isoformat_utc` (Z suffix).

## Data model

New enums in `app/models/core/enums.py`:

```python
class MeetingStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class CallDirection(str, enum.Enum):
    INBOUND = "inbound"
    OUTBOUND = "outbound"
```

### `meetings` — `app/models/sales/meeting.py`

| column | type | notes |
|--------|------|-------|
| id | Integer PK | |
| company_id | Integer FK→companies, indexed, not null | tenancy |
| subject | String(255), not null | |
| starts_at | DateTime, not null | naive UTC |
| ends_at | DateTime, nullable | must be > starts_at when set |
| location | String(255), nullable | room or URL |
| notes | Text, nullable | |
| status | Enum(MeetingStatus), default scheduled | non-native, `values_callable` |
| lead_id / client_id / deal_id | Integer FK, nullable, indexed | at least one required in API |
| created_by_id | Integer FK→users, nullable | |
| created_at / updated_at | DateTime | server_default / onupdate |

### `call_logs` — `app/models/sales/call_log.py`

| column | type | notes |
|--------|------|-------|
| id | Integer PK | |
| company_id | Integer FK→companies, indexed, not null | |
| direction | Enum(CallDirection), not null | |
| duration_seconds | Integer, nullable | ≥ 0 when set |
| outcome | String(255), nullable | |
| notes | Text, nullable | |
| logged_at | DateTime, not null | default now (naive UTC) |
| lead_id / client_id / deal_id | Integer FK, nullable, indexed | at least one required in API |
| created_by_id | Integer FK→users, nullable | |
| created_at | DateTime | server_default |

## API

Prefix `/api/meetings` and `/api/calls`. JWT via `get_current_user`. `apply_company_scope` on
every query. By-id miss → **404**. Cross-tenant same.

Shared parent check (service helper): reject empty parents (400); each non-null FK must exist
in-company (400 `"… not found in your company"` — same wording as deals).

### Meetings

- `POST /api/meetings` → 201. Body: `subject`, `starts_at` (ISO), optional `ends_at`,
  `location`, `notes`, `status`, `lead_id`, `client_id`, `deal_id`.
- `GET /api/meetings` → `{items, total}`. Query: `lead_id`, `client_id`, `deal_id`, `status`,
  `skip`, `limit` (1–500, default 100).
- `GET /api/meetings/{id}` → 200 or 404.
- `PATCH /api/meetings/{id}` → optional fields including `status`. Re-validate parents if sent.
- `DELETE /api/meetings/{id}` → 204.

Invalid `starts_at`/`ends_at` ISO → 400. `ends_at` ≤ `starts_at` → 400. Invalid status → 400.

### Calls

- `POST /api/calls` → 201. Body: `direction` required; optional `duration_seconds`, `outcome`,
  `notes`, `logged_at`, parents. Missing `logged_at` → now.
- `GET /api/calls` → `{items, total}`. Query: `lead_id`, `client_id`, `deal_id`, `direction`,
  skip/limit.
- `GET /api/calls/{id}`, `PATCH /api/calls/{id}`, `DELETE /api/calls/{id}` (204).
- `duration_seconds` < 0 → 400. Invalid direction → 400.

Audit: `log_activity` on create/update/delete with `entity_type` `meeting` or `call`.

## Frontend

- Lead detail (`LeadDetailPage.jsx`): fetch `/meetings?lead_id=` and `/calls?lead_id=`; merge
  into the existing client-side timeline; “Log call” and “Schedule meeting” forms (not
  `window.prompt`).
- Deal detail (`frontend/app/sales/deals/[id]/page.jsx`): same with `deal_id`.
- No new routes. Match existing Tailwind card/button styles.

## Tests

- Schema: tables exist with `company_id`; a row persists.
- API roundtrip create/list/get/patch/delete; parent required; foreign-company parent 400;
  invalid dates/direction/duration.
- Tenancy: owner 200 on GET/PATCH; company B 404 (or 403) on GET/PATCH/DELETE. Positive control.
- Test password `"pw"`. Reset `auth_limiter._buckets` in API/tenancy files.

## Residuals

Follow-ups with `channel=call` remain a scheduled reminder, not a logged call. Calendar sync
and telephony stay later Phase 3/5 items.
