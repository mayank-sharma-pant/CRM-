"""The destructive chat suites must refuse every non-throwaway target."""
import os
import subprocess
import sys
from pathlib import Path

import pytest

from tests.chat.safety import disposable_pg_url, disposable_redis_url, migration_target_ok
from tests.chat.test_chat_migration_postgres import _GUARD

BACKEND = Path(__file__).resolve().parents[2]
NEON_LIKE = "postgresql://owner:secret@ep-example-123456-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"

REJECTED_PG = [
    "",
    None,
    "postgresql://suraj@localhost:5432/crm_dev",
    "postgresql://suraj@127.0.0.1:5432/crm_dev",
    NEON_LIKE,
    "postgresql://owner:secret@ep-example-123456.ap-southeast-1.aws.neon.tech/crm_chat_test?sslmode=require",
    "postgresql://app:secret@api.perioxia.com:5432/crm_chat_test",
    "postgresql://u:p@localhost.evil.example:5432/crm_chat_test",
    "postgresql://u:p%40localhost@db.example.com:5432/crm_chat_test",
    "sqlite:///./crm_chat_test",
    "postgresql://suraj@localhost:5432/",
    "not a url",
]


@pytest.mark.parametrize("url", REJECTED_PG)
def test_pg_guard_rejects(url):
    assert disposable_pg_url(url) is False


@pytest.mark.parametrize("url", [
    "postgresql://suraj@localhost:5432/crm_chat_test",
    "postgresql+psycopg://suraj@127.0.0.1:5432/crm_chat_test",
])
def test_pg_guard_accepts_local_test_database(url):
    assert disposable_pg_url(url) is True


@pytest.mark.parametrize("url,db,ok", [
    ("postgresql+psycopg://suraj@localhost:5432/chat_mig_ab12", "chat_mig_ab12", True),
    ("postgresql+psycopg://suraj@localhost:5432/crm_dev", "chat_mig_ab12", False),
    ("postgresql+psycopg://suraj@localhost:5432/crm_dev", "crm_dev", False),
    ("postgresql+psycopg://suraj@localhost:5432/crm_chat_test", "crm_chat_test", False),
    (NEON_LIKE, "chat_mig_ab12", False),
    ("postgresql+psycopg://u:p@ep-x.aws.neon.tech/chat_mig_ab12", "chat_mig_ab12", False),
    ("postgresql+psycopg://u:p@localhost.evil.example/chat_mig_ab12", "chat_mig_ab12", False),
])
def test_migration_target_guard(url, db, ok):
    assert migration_target_ok(url, db) is ok


@pytest.mark.parametrize("url,ok", [
    ("redis://127.0.0.1:6390/15", True),
    ("redis://localhost:6379/1", True),
    ("redis://127.0.0.1:6379/0", False),
    ("redis://127.0.0.1:6379", False),
    ("redis://cache.example.com:6379/15", False),
    ("rediss://127.0.0.1:6379/15", False),
    ("", False),
    (None, False),
])
def test_redis_guard(url, ok):
    assert disposable_redis_url(url) is ok


@pytest.mark.parametrize("database_url,target,expected_exit", [
    ("postgresql://suraj@localhost:5432/chat_mig_ab12", "chat_mig_ab12", 0),
    ("postgresql://suraj@localhost:5432/crm_dev", "chat_mig_ab12", 3),
    ("postgresql://suraj@localhost:5432/crm_dev", "crm_dev", 3),
    (NEON_LIKE, "chat_mig_ab12", 3),
])
def test_migration_subprocess_guard_resolves_settings_like_alembic(database_url, target, expected_exit):
    """Runs the exact guard the migration tests run before every alembic call (no DB connection)."""
    env = {**os.environ, "DATABASE_URL": database_url}
    result = subprocess.run([sys.executable, "-c", _GUARD, target], cwd=BACKEND, env=env, timeout=60)
    assert result.returncode == expected_exit
