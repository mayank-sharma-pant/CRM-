from sqlalchemy import create_engine, inspect, text
from sqlalchemy.pool import StaticPool

from app.database import Base
import app.models.core  # noqa: F401
import app.models.sales  # noqa: F401
import app.models.finance  # noqa: F401
import app.models.ops  # noqa: F401
import app.models.hr  # noqa: F401
import app.models.billing  # noqa: F401

from create_missing_tables import add_missing_columns, _MISSING_COLUMNS


def test_add_missing_columns_is_idempotent_and_adds_target_columns():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)

    # First run: columns already exist via create_all -> no-op, must not error.
    add_missing_columns(engine)

    inspector = inspect(engine)
    for table, column, _ddl_type in _MISSING_COLUMNS:
        column_names = {c["name"] for c in inspector.get_columns(table)}
        assert column in column_names

    # Second run: still a no-op, still no error.
    add_missing_columns(engine)


def test_add_missing_columns_alters_a_legacy_schema_missing_the_columns():
    """Simulates a pre-existing prod table that predates the new columns:
    build bare tables via raw DDL (no ORM create_all involved), so the
    target columns are genuinely absent, then confirm add_missing_columns
    actually issues ALTER TABLE ADD COLUMN and the columns appear."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    with engine.begin() as conn:
        conn.execute(text("CREATE TABLE companies (id INTEGER PRIMARY KEY)"))
        conn.execute(text("CREATE TABLE documents (id INTEGER PRIMARY KEY)"))

    inspector = inspect(engine)
    for table, column, _ddl_type in _MISSING_COLUMNS:
        column_names = {c["name"] for c in inspector.get_columns(table)}
        assert column not in column_names, f"expected {table}.{column} absent before migration"

    add_missing_columns(engine)

    inspector = inspect(engine)
    for table, column, _ddl_type in _MISSING_COLUMNS:
        column_names = {c["name"] for c in inspector.get_columns(table)}
        assert column in column_names, f"expected {table}.{column} added by migration"

    # Idempotent: re-running against the now-migrated legacy schema is a no-op.
    add_missing_columns(engine)
