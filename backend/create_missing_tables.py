"""Apply ORM schema + missing columns + seed. Run as a script on deploy.

Prefer `alembic upgrade head` (016 catch-up calls the same helper). This script
still seeds plans after schema apply.
"""
from app.database import engine, SessionLocal
from app.schema_sync import MISSING_COLUMNS as _MISSING_COLUMNS, add_missing_columns, apply_schema
from app.services.billing.seed import seed_plans, backfill_api_quotas


if __name__ == "__main__":
    rls_n = apply_schema(engine)
    if rls_n:
        print(f"Row-level security policies applied on {rls_n} tables.")
    with SessionLocal() as db:
        seed_plans(db)
        backfill_api_quotas(db)
    print("All missing tables created and plans seeded.")
