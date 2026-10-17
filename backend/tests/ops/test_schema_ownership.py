"""Chat tables belong to migration 040 only; the broad apply_schema path must not create them."""
import importlib.util
from pathlib import Path

from sqlalchemy import create_engine, inspect
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.models.core.chat import CHAT_TABLES
from app.schema_sync import apply_schema, migration_owned_tables

MIGRATION_040 = Path(__file__).resolve().parents[2] / "alembic" / "versions" / "040_team_chat.py"


def _load_040():
    spec = importlib.util.spec_from_file_location("migration_040_team_chat", MIGRATION_040)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_apply_schema_does_not_create_chat_tables():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    assert apply_schema(engine) == 0
    tables = set(inspect(engine).get_table_names())
    assert not tables & set(CHAT_TABLES)
    assert {"users", "companies", "leads", "notifications"} <= tables


def test_every_chat_table_is_migration_owned():
    chat_like = {t for t in Base.metadata.tables if t.startswith("chat_")}
    assert migration_owned_tables() == frozenset(CHAT_TABLES) == chat_like


def test_migration_040_matches_the_models():
    m040 = _load_040()
    assert tuple(m040.CHAT_TABLES) == tuple(CHAT_TABLES)
    for table in CHAT_TABLES:
        model_columns = {c.name for c in Base.metadata.tables[table].columns}
        assert m040.EXPECTED_COLUMNS[table] == model_columns, table
