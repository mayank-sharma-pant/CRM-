"""Production mode must come from settings (which read .env), not os.environ.

Each case imports app.main in a fresh interpreter whose working directory holds
its own .env, with ENVIRONMENT absent from the process environment — the same
way systemd starts the service on EC2.
"""
import json
import os
import subprocess
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]

PROBE = r"""
import json, logging
from fastapi.testclient import TestClient
import app.main as m

@m.app.get("/__probe_boom")
def _boom():
    raise RuntimeError("probe-internal-detail")

c = TestClient(m.app, raise_server_exceptions=False)
mw = next(x for x in m.app.user_middleware if x.cls.__name__ == "ProxyHeadersMiddleware")
print(json.dumps({
    "is_production": m.is_production,
    "docs": c.get("/docs").status_code,
    "redoc": c.get("/redoc").status_code,
    "openapi": c.get("/openapi.json").status_code,
    "root_has_docs": "docs" in c.get("/").json(),
    "error_body": c.get("/__probe_boom").json(),
    "trusted_hosts": list(getattr(mw, "kwargs", getattr(mw, "options", {})).get("trusted_hosts", [])),
    "log_level": logging.getLogger("app").getEffectiveLevel(),
}))
"""

SAFE_PROD = (
    "SECRET_KEY=test-only-not-a-real-key-0123456789abcdef\n"
    "FRONTEND_URL=https://crm.example.com\n"
    "CORS_ORIGINS=https://crm.example.com\n"
    "PUBLIC_API_URL=https://api.example.com\n"
    "DATABASE_URL=sqlite:///:memory:\n"
)


def _run(tmp_path: Path, dotenv: str | None, extra_env: dict | None = None) -> dict:
    if dotenv is not None:
        (tmp_path / ".env").write_text(dotenv)
    env = {"PATH": os.environ.get("PATH", "/usr/bin:/bin"), "HOME": str(tmp_path), "PYTHONPATH": str(BACKEND)}
    env.update(extra_env or {})
    out = subprocess.run(
        [sys.executable, "-W", "ignore", "-c", PROBE],
        cwd=tmp_path, env=env, capture_output=True, text=True, timeout=120,
    )
    assert out.returncode == 0, out.stderr[-2000:]
    return json.loads(out.stdout.strip().splitlines()[-1])


def test_production_from_dotenv_only_hides_docs_and_error_details(tmp_path):
    r = _run(tmp_path, "ENVIRONMENT=production\n" + SAFE_PROD)
    assert r["is_production"] is True
    assert (r["docs"], r["redoc"], r["openapi"]) == (404, 404, 404)
    assert r["root_has_docs"] is False
    assert r["error_body"] == {"detail": "Internal server error"}


def test_development_default_keeps_docs_and_error_details(tmp_path):
    r = _run(tmp_path, None, {"DATABASE_URL": "sqlite:///:memory:"})
    assert r["is_production"] is False
    assert (r["docs"], r["redoc"], r["openapi"]) == (200, 200, 200)
    assert r["root_has_docs"] is True
    assert "probe-internal-detail" in r["error_body"]["detail"]


def test_process_environment_still_overrides_dotenv(tmp_path):
    r = _run(tmp_path, "ENVIRONMENT=development\n" + SAFE_PROD, {"ENVIRONMENT": "production"})
    assert r["is_production"] is True
    assert r["openapi"] == 404


def test_trusted_hosts_and_log_level_read_from_dotenv(tmp_path):
    r = _run(tmp_path, "ENVIRONMENT=production\nTRUSTED_HOSTS=127.0.0.1,10.0.0.5\nLOG_LEVEL=warning\n" + SAFE_PROD)
    assert r["trusted_hosts"] == ["127.0.0.1", "10.0.0.5"]
    assert r["log_level"] == 30


def test_defaults_unchanged_when_unset(tmp_path):
    r = _run(tmp_path, "ENVIRONMENT=production\n" + SAFE_PROD)
    assert r["trusted_hosts"] == ["127.0.0.1"]
    assert r["log_level"] == 20
