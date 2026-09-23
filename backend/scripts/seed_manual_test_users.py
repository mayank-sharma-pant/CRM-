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
from app.models.core.team import Team
from app.models.core.team_membership import TeamMembership
from app.utils.security import get_password_hash
from app.utils.helpers import generate_company_code

PASSWORD = "ManualTest#2026"
TEAM_NAME = "QA Alpha"

ROLE_USERS = [
    ("admin", "qa-admin@manualtest.local", "QA Admin"),
    ("manager", "qa-manager@manualtest.local", "QA Manager"),
    ("sales", "qa-sales@manualtest.local", "QA Sales"),
    ("md", "qa-md@manualtest.local", "QA MD"),
    ("purchase", "qa-purchase@manualtest.local", "QA Purchase"),
]

# Roles that need a primary team for pipeline writes (leads/clients/tasks).
TEAM_MEMBER_ROLES = ("manager", "sales", "md", "purchase", "admin")

PLATFORM_ADMIN_EMAIL = "qa-platform-admin@manualtest.local"
PLATFORM_ADMIN_NAME = "QA Platform Admin"


def _ensure_qa_team(db, company: Company, users_by_role: dict) -> Team:
    """Ensure Manual QA Co has a team with manager/sales/etc. memberships."""
    team = (
        db.query(Team)
        .filter(Team.company_id == company.id, Team.name == TEAM_NAME)
        .first()
    )
    if not team:
        team = Team(company_id=company.id, name=TEAM_NAME)
        db.add(team)
        db.flush()
        print(f"Created team: {team.name} (id={team.id})")
    else:
        print(f"Using existing team: {team.name} (id={team.id})")

    manager = users_by_role.get("manager")
    for role in TEAM_MEMBER_ROLES:
        user = users_by_role.get(role)
        if not user:
            continue
        membership = (
            db.query(TeamMembership)
            .filter(TeamMembership.team_id == team.id, TeamMembership.user_id == user.id)
            .first()
        )
        if not membership:
            db.add(
                TeamMembership(
                    company_id=company.id,
                    team_id=team.id,
                    user_id=user.id,
                )
            )
        # Primary team so writes work without X-Team-Id
        if user.team_id != team.id:
            user.team_id = team.id
        if role == "sales" and manager and user.manager_id != manager.id:
            user.manager_id = manager.id

    return team


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
        users_by_role = {}

        for i, (role, email, full_name) in enumerate(ROLE_USERS, start=1):
            existing = db.query(User).filter(User.email == email).first()
            if existing:
                skipped.append(email)
                users_by_role[role] = existing
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
            db.flush()
            users_by_role[role] = user
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

        db.flush()
        _ensure_qa_team(db, company, users_by_role)
        db.commit()

        print(f"\nCreated {len(created)} user(s):")
        for role, email in created:
            print(f"  {role:15s} {email}")
        if skipped:
            print(f"\nSkipped (already existed): {', '.join(skipped)}")
        print(f"\nPassword for all seeded accounts: {PASSWORD}")
        print(f"Team for pipeline roles: {TEAM_NAME}")
    except Exception as exc:
        db.rollback()
        print(f"ERROR: {exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
