"""Create manual-testing accounts in the live dev DB (crm.db) without touching existing data.

Creates one company ("Manual QA Co") with a user per app role (admin, manager,
sales, md, purchase), plus a platform admin (company_id=NULL) for /platform/login.
Safe to re-run: skips any email that already exists.

Run from backend/:
  ./venv/bin/python scripts/seed_manual_test_users.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime, timedelta, timezone

from app.database import SessionLocal
from app.models.core.user import User
from app.models.core.company import Company
from app.utils.security import get_password_hash
from app.utils.helpers import generate_company_code

PASSWORD = "ManualTest#2026"

ROLE_USERS = [
    ("admin", "qa-admin@manualtest.local", "QA Admin"),
    ("manager", "qa-manager@manualtest.local", "QA Manager"),
    ("sales", "qa-sales@manualtest.local", "QA Sales"),
    ("md", "qa-md@manualtest.local", "QA MD"),
    ("purchase", "qa-purchase@manualtest.local", "QA Purchase"),
]

PLATFORM_ADMIN_EMAIL = "qa-platform-admin@manualtest.local"
PLATFORM_ADMIN_NAME = "QA Platform Admin"


def main():
    db = SessionLocal()
    try:
        company = db.query(Company).filter(Company.name == "Manual QA Co").first()
        if not company:
            company = Company(
                name="Manual QA Co",
                company_code=generate_company_code(db),
                status="trial",
                trial_ends_at=datetime.now(timezone.utc) + timedelta(days=365),
            )
            db.add(company)
            db.flush()
            print(f"Created company: {company.name} (id={company.id})")
        else:
            print(f"Using existing company: {company.name} (id={company.id})")

        hashed = get_password_hash(PASSWORD)
        created, skipped = [], []

        for i, (role, email, full_name) in enumerate(ROLE_USERS, start=1):
            existing = db.query(User).filter(User.email == email).first()
            if existing:
                skipped.append(email)
                continue
            user = User(
                email=email,
                full_name=full_name,
                hashed_password=hashed,
                role=role,
                company_id=company.id,
                status="active",
                is_active=True,
                employee_num=i,
            )
            db.add(user)
            created.append((role, email))

        existing_pa = db.query(User).filter(User.email == PLATFORM_ADMIN_EMAIL).first()
        if not existing_pa:
            pa = User(
                email=PLATFORM_ADMIN_EMAIL,
                full_name=PLATFORM_ADMIN_NAME,
                hashed_password=hashed,
                role="admin",
                company_id=None,
                status="active",
                is_active=True,
            )
            db.add(pa)
            created.append(("platform_admin", PLATFORM_ADMIN_EMAIL))
        else:
            skipped.append(PLATFORM_ADMIN_EMAIL)

        db.commit()

        print(f"\nCreated {len(created)} user(s):")
        for role, email in created:
            print(f"  {role:15s} {email}")
        if skipped:
            print(f"\nSkipped (already existed): {', '.join(skipped)}")
        print(f"\nPassword for all seeded accounts: {PASSWORD}")
    except Exception as exc:
        db.rollback()
        print(f"ERROR: {exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
