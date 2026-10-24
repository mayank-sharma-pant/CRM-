"""Chat tables belong to their own migrations (040, 041, 042) only; the broad apply_schema path must not create them."""
import importlib.util
from pathlib import Path

from sqlalchemy import create_engine, inspect
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.models.core.chat import CHAT_TABLES, CHAT_TABLES_040, CHAT_TABLES_041, CHAT_TABLES_042
from app.schema_sync import apply_schema, migration_owned_tables

VERSIONS = Path(__file__).resolve().parents[2] / "alembic" / "versions"


def _load(filename: str):
    spec = importlib.util.spec_from_file_location(f"migration_{filename[:-3]}", VERSIONS / filename)
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


def test_chat_migrations_match_the_models():
    for filename, tables in (
        ("040_team_chat.py", CHAT_TABLES_040),
        ("041_chat_attachments.py", CHAT_TABLES_041),
        ("042_chat_calls.py", CHAT_TABLES_042),
    ):
        migration = _load(filename)
        assert tuple(migration.CHAT_TABLES) == tuple(tables), filename
        for table in tables:
            model_columns = {c.name for c in Base.metadata.tables[table].columns}
            assert migration.EXPECTED_COLUMNS[table] == model_columns, table
