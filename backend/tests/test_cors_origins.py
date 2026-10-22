"""CORS and chat origin allow-lists: exact origins, trailing slash tolerated, no loopback in production.

The app-level cases import app.main in a fresh interpreter with its own .env, the way
systemd starts the service, and send real CORS preflights.
"""
import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

from app.config import parse_origins, settings
from app.routers.chat.ws import allowed_origins

BACKEND = Path(__file__).resolve().parents[1]

PROBE = r"""
import json, sys
from fastapi.testclient import TestClient
import app.main as m

c = TestClient(m.app)
out = {}
for origin in json.loads(sys.argv[1]):
    r = c.options("/api/chat/conversations/1/files", headers={
        "Origin": origin,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type,x-chat-upload-token",
    })
    out[origin] = [r.status_code, r.headers.get("access-control-allow-origin")]
print(json.dumps(out))
"""

BASE_ENV = (
    "SECRET_KEY=test-only-not-a-real-key-0123456789abcdef\n"
    "FRONTEND_URL=https://crm.example.com\n"
    "PUBLIC_API_URL=https://api.example.com\n"
    "DATABASE_URL=sqlite:///:memory:\n"
)

APP = "https://crm.example.com"
PROBED = [APP, APP + "/", "http://localhost:3000", "http://127.0.0.1:3000", "https://evil.example", "https://crm.example.com.evil.example"]


def _preflights(tmp_path: Path, environment: str, cors_origins: str | None) -> dict:
    dotenv = BASE_ENV + f"ENVIRONMENT={environment}\n"
    if cors_origins is not None:
        dotenv += f"CORS_ORIGINS={cors_origins}\n"
    (tmp_path / ".env").write_text(dotenv)
    env = {"PATH": os.environ.get("PATH", "/usr/bin:/bin"), "HOME": str(tmp_path), "PYTHONPATH": str(BACKEND)}
    out = subprocess.run(
        [sys.executable, "-W", "ignore", "-c", PROBE, json.dumps(PROBED)],
        cwd=tmp_path, env=env, capture_output=True, text=True, timeout=120,
    )
    assert out.returncode == 0, out.stderr[-2000:]
    return json.loads(out.stdout.strip().splitlines()[-1])


def _allowed(result: dict) -> set[str]:
    return {origin for origin, (code, acao) in result.items() if code == 200 and acao == origin}


# ---- parser ---------------------------------------------------------------------


def test_trailing_slash_and_whitespace_are_normalised():
    assert parse_origins(" https://crm.example.com/ ,https://admin.example.com", production=True) == [
        "https://crm.example.com",
        "https://admin.example.com",
    ]


def test_origins_stay_exact():
    assert parse_origins("https://crm.example.com/app/", production=True) == ["https://crm.example.com/app"]
    assert parse_origins("https://crm.example.com,https://crm.example.com/", production=True) == ["https://crm.example.com"]
    assert parse_origins("", production=True) == []
    assert parse_origins(None, production=False) == []


@pytest.mark.parametrize("loopback", [
    "http://localhost:3000", "http://localhost", "https://localhost:3001/", "http://127.0.0.1:3000", "http://[::1]:3000",
])
def test_loopback_dropped_in_production_kept_in_development(loopback):
    raw = f"{loopback},https://crm.example.com"
    assert parse_origins(raw, production=True) == ["https://crm.example.com"]
    assert parse_origins(raw, production=False) == [loopback.rstrip("/"), "https://crm.example.com"]


def test_lookalike_hosts_are_not_treated_as_loopback():
    assert parse_origins("https://localhost.example.com,https://my127.0.0.1.example.com", production=True) == [
        "https://localhost.example.com",
        "https://my127.0.0.1.example.com",
    ]


def test_chat_origin_check_uses_the_same_rules(monkeypatch):
    monkeypatch.setattr(settings, "CHAT_WS_ALLOWED_ORIGINS", "https://crm.example.com/, http://localhost:3000")
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    assert allowed_origins() == {"https://crm.example.com"}
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")
    assert allowed_origins() == {"https://crm.example.com", "http://localhost:3000"}


# ---- the running app ------------------------------------------------------------


def test_production_trailing_slash_config_still_admits_the_real_site(tmp_path):
    result = _preflights(tmp_path, "production", f"{APP}/,http://localhost:3000,http://127.0.0.1:3000")
    assert _allowed(result) == {APP}
    assert result["http://localhost:3000"][0] == 400
    assert result["https://evil.example"][0] == 400


def test_production_never_falls_back_to_localhost(tmp_path):
    result = _preflights(tmp_path, "production", "")
    assert _allowed(result) == set()


def test_production_default_setting_excludes_loopback(tmp_path):
    result = _preflights(tmp_path, "production", None)
    assert "http://localhost:3000" not in _allowed(result)
    assert "http://127.0.0.1:3000" not in _allowed(result)


def test_development_keeps_localhost(tmp_path):
    result = _preflights(tmp_path, "development", "http://localhost:3000/")
    assert _allowed(result) == {"http://localhost:3000"}
