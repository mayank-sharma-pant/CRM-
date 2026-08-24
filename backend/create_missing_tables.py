from sqlalchemy import inspect, text

from app.database import engine, Base, SessionLocal
from app.models.core import *  # noqa: F401,F403
from app.models.sales import *  # noqa: F401,F403
from app.models.finance import *  # noqa: F401,F403
from app.models.ops import *  # noqa: F401,F403
from app.models.hr import *  # noqa: F401,F403
from app.models.billing import *  # noqa: F401,F403
from app.services.billing.seed import seed_plans

# Columns added to pre-existing tables after their initial release.
# Base.metadata.create_all only creates missing TABLES, never ALTERs
# existing ones, so new columns on old tables must be added by hand.
_MISSING_COLUMNS = [
    ("companies", "trial_ends_at", "TIMESTAMP WITH TIME ZONE"),
    ("documents", "file_size", "INTEGER DEFAULT 0"),
]


def add_missing_columns(engine):
    """Idempotently add columns from _MISSING_COLUMNS if absent. Works on SQLite and Postgres."""
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())
    with engine.begin() as conn:
        for table, column, ddl_type in _MISSING_COLUMNS:
            if table not in existing_tables:
                continue
            existing_columns = {c["name"] for c in inspector.get_columns(table)}
            if column in existing_columns:
                continue
            conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {ddl_type}"))
            print(f"Added missing column: {table}.{column}")


Base.metadata.create_all(bind=engine)
add_missing_columns(engine)
with SessionLocal() as db:
    seed_plans(db)
print("All missing tables created and plans seeded.")
