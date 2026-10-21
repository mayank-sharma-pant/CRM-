"""Check chat files on disk against chat_attachments (see app/services/chat/reconcile.py).

Dry run by default; pass --apply to quarantine orphans and delete stale temp files.
Run daily (systemd timer) and after restoring the disk from a snapshot:

  cd /home/ubuntu/CRM-/backend && venv/bin/python scripts/chat_files_reconcile.py [--apply]
"""
import argparse
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import settings  # noqa: E402
from app.database import SessionLocal  # noqa: E402
from app.services.chat.reconcile import reconcile  # noqa: E402
from app.tenancy import bind_tenant, reset_tenant  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--apply", action="store_true", help="quarantine orphans and delete stale temp files")
    args = parser.parse_args()
    if not settings.CHAT_FILES_DIR or not os.path.isabs(settings.CHAT_FILES_DIR):
        print("CHAT_FILES_DIR is not set to an absolute path", file=sys.stderr)
        return 1
    bind_tenant(bypass=True)
    db = SessionLocal()
    try:
        report = reconcile(db, apply=args.apply)
    finally:
        db.rollback()
        db.close()
        reset_tenant()
    print(json.dumps(report, indent=2))
    return 2 if report["missing_files"] else 0


if __name__ == "__main__":
    sys.exit(main())
