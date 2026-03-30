#!/usr/bin/env python3
"""
Smoke-test MD API routes. Usage:
  export API_BASE=http://127.0.0.1:8000
  export MD_TEST_EMAIL=you@example.com
  export MD_TEST_PASSWORD=secret
  python scripts/md_dashboard_smoke.py
"""
from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone

import requests

BASE = os.environ.get("API_BASE", "http://127.0.0.1:8000").rstrip("/")
EMAIL = os.environ.get("MD_TEST_EMAIL")
PASSWORD = os.environ.get("MD_TEST_PASSWORD")


def main() -> int:
    if not EMAIL or not PASSWORD:
        print("Set MD_TEST_EMAIL and MD_TEST_PASSWORD", file=sys.stderr)
        return 2

    r = requests.post(
        f"{BASE}/api/auth/login",
        data={"username": EMAIL, "password": PASSWORD},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=30,
    )
    if r.status_code != 200:
        print(f"LOGIN {r.status_code}: {r.text[:500]}", file=sys.stderr)
        return 1
    token = r.json().get("access_token")
    if not token:
        print("No access_token in login response", file=sys.stderr)
        return 1

    h = {"Authorization": f"Bearer {token}"}
    now = datetime.now(timezone.utc)
    y, m = now.year, now.month

    # Unauthenticated
    u = requests.get(f"{BASE}/api/md/dashboard", timeout=15)
    if u.status_code != 401:
        print(f"EDGE: /api/md/dashboard without auth expected 401, got {u.status_code}", file=sys.stderr)
        return 1

    paths = [
        ("/api/md/dashboard", {}),
        ("/api/md/revenue", {}),
        ("/api/md/sales", {}),
        ("/api/md/leads", {"limit": 5}),
        ("/api/md/clients", {"limit": 5}),
        ("/api/md/employee-lookup", {}),
        ("/api/md/monitoring", {}),
        ("/api/md/invoices", {"limit": 5}),
        ("/api/md/points", {}),
        ("/api/md/performance/monthly", {"year": y, "month": m}),
        ("/api/md/teams", {}),
        ("/api/md/reports/custom", {"group_by": "date"}),
    ]

    failures = []
    for path, params in paths:
        resp = requests.get(f"{BASE}{path}", headers=h, params=params, timeout=60)
        if resp.status_code != 200:
            failures.append((path, resp.status_code, resp.text[:200]))
            continue
        try:
            resp.json()
        except json.JSONDecodeError:
            failures.append((path, "json", resp.text[:200]))

    if failures:
        for item in failures:
            print("FAIL", item)
        return 1

    # Dashboard shape
    dash = requests.get(f"{BASE}/api/md/dashboard", headers=h, timeout=30).json()
    assert "kpis" in dash and isinstance(dash["kpis"], list)
    assert "pipelineSummary" in dash
    assert "financeSnapshot" in dash
    print("OK: all MD routes returned 200 JSON; dashboard keys present")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
