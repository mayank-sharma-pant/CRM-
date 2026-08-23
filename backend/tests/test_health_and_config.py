import importlib
import os

import pytest

from app.database import get_db
from app.main import app


def test_health_ok_when_db_reachable(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "healthy", "database": "up"}


def test_health_503_when_db_probe_fails(client):
    class BrokenSession:
        def execute(self, *_args, **_kwargs):
            raise RuntimeError("connection refused")

    def broken_db():
        yield BrokenSession()

    app.dependency_overrides[get_db] = broken_db
    try:
        resp = client.get("/health")
    finally:
        # Restore the working override the client fixture installed.
        app.dependency_overrides.pop(get_db, None)

    assert resp.status_code == 503
    body = resp.json()
    assert body["status"] == "unhealthy"
    assert body["database"] == "down"


def test_production_boot_refuses_placeholder_secret(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("SECRET_KEY", "your-secret-key-change-in-production-min-32-chars")
    import app.config as config

    with pytest.raises(RuntimeError, match="SECRET_KEY is still the default placeholder"):
        importlib.reload(config)

    # Reload back to test defaults so later tests see a clean module.
    monkeypatch.delenv("ENVIRONMENT", raising=False)
    monkeypatch.delenv("SECRET_KEY", raising=False)
    importlib.reload(config)


def test_non_production_placeholder_secret_only_warns(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.setenv("SECRET_KEY", "your-secret-key-change-in-production-min-32-chars")
    import app.config as config

    with pytest.warns(UserWarning, match="SECRET_KEY is still the default placeholder"):
        importlib.reload(config)

    monkeypatch.delenv("ENVIRONMENT", raising=False)
    monkeypatch.delenv("SECRET_KEY", raising=False)
    importlib.reload(config)
