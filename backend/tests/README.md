# Backend Test Layout

This suite is organized by domain to keep intent clear and maintenance predictable.

## Structure

- `auth/`: authentication and rate-limit behavior
- `ai/`: AI endpoint permissions
- `sales/`: lead/follow-up/task/invoice behavior
- `management/`: MD/manager governance flows (for example auto points/performance)
- `ops/`: inventory and operations flows
- `notifications/`: notification API and trigger behavior
- `tenancy/`: company-isolation and platform-admin bypass behavior
- `helpers/`: shared test helpers and factories
- `conftest.py`: shared DB/client fixtures

## Conventions

- Reuse helpers from `tests.helpers.auth` instead of duplicating login/create-user logic.
- Keep file names explicit: `test_<domain>_<behavior>.py`.
- Prefer deterministic test data and company-specific prefixes to avoid ambiguity.
