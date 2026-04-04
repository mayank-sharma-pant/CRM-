"""
Promote a user to platform administrator so they can sign in at /platform/login.

Requirements after promotion:
  - role = admin
  - company_id = NULL  (platform admins are not tied to a company)

Run from the backend folder (loads .env via app.config):

  python scripts/bootstrap_platform_admin.py you@example.com

Warning: This clears company_id for that user. They will no longer be scoped to
a company as a company admin; use a dedicated email for platform ops if needed.
"""
from __future__ import annotations

import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import func as sa_func  # noqa: E402

from app.database import SessionLocal  # noqa: E402
from app.models.core.enums import UserRole  # noqa: E402
from app.models.core.user import User  # noqa: E402


def main() -> int:
    p = argparse.ArgumentParser(description="Promote user to platform admin")
    p.add_argument("email", help="User email (existing row in users table)")
    args = p.parse_args()
    email = args.email.strip().lower()
    if not email:
        print("ERROR: empty email")
        return 1

    db = SessionLocal()
    try:
        user = (
            db.query(User)
            .filter(sa_func.lower(User.email) == email)
            .first()
        )
        if not user:
            print(f"ERROR: No user with email matching {args.email!r}")
            print("Create the user first (e.g. signup), or fix the email.")
            return 1

        user.role = UserRole.ADMIN
        user.company_id = None
        user.team_id = None
        db.commit()
        print(f"OK: {user.email} is now a platform administrator (company_id cleared).")
        print("Sign in at https://your-domain/platform/login with this account.")
        return 0
    except Exception as exc:
        db.rollback()
        print(f"ERROR: {exc}")
        return 1
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
