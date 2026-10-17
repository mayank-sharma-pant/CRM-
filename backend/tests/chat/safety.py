"""Target guards for tests that write to, migrate, or wipe a real database/Redis.

Destructive suites may only run against throwaway local targets: never crm_dev,
the shared Neon database, or production.
"""
from urllib.parse import urlparse

from sqlalchemy.engine import make_url

LOCAL_HOSTS = frozenset({"localhost", "127.0.0.1"})
MIGRATION_DB_PREFIX = "chat_mig_"


def disposable_pg_url(raw: str | None) -> bool:
    """A local PostgreSQL database whose name ends in `_test`."""
    if not raw:
        return False
    try:
        url = make_url(raw)
    except Exception:
        return False
    return (
        url.get_backend_name() == "postgresql"
        and url.host in LOCAL_HOSTS
        and bool(url.database)
        and url.database.endswith("_test")
    )


def migration_target_ok(raw: str | None, expected_db: str) -> bool:
    """A local throwaway database created by the migration tests themselves."""
    if not raw or not expected_db.startswith(MIGRATION_DB_PREFIX):
        return False
    try:
        url = make_url(raw)
    except Exception:
        return False
    return url.get_backend_name() == "postgresql" and url.host in LOCAL_HOSTS and url.database == expected_db


def disposable_redis_url(raw: str | None) -> bool:
    """A local Redis with an explicit, non-default database number (the tests FLUSHDB it)."""
    if not raw:
        return False
    parsed = urlparse(raw)
    db = parsed.path.lstrip("/")
    return parsed.scheme == "redis" and parsed.hostname in LOCAL_HOSTS and db.isdigit() and int(db) > 0
