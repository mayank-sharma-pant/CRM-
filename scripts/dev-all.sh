#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

BACKEND_PY="$ROOT/backend/venv/bin/python"
if [[ ! -x "$BACKEND_PY" ]]; then
  echo "Missing backend/venv. Create it first:"
  echo "  cd backend && python3 -m venv venv && ./venv/bin/pip install -r requirements.txt"
  exit 1
fi

cleanup() {
  trap - INT TERM EXIT
  jobs -p | xargs -r kill 2>/dev/null || true
  wait 2>/dev/null || true
}
trap cleanup INT TERM EXIT

echo "Backend  http://127.0.0.1:8000"
echo "Frontend http://127.0.0.1:3000"
echo "Ctrl+C stops both."

(
  cd "$ROOT/backend"
  exec ./venv/bin/python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
) &

npm run dev --workspace=frontend &

wait
