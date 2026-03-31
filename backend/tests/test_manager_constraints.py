"""
Test: 1-Manager-Per-Team Constraint
=====================================
Verifies that the validators correctly enforce:
  1. A team can only have ONE manager.
  2. A manager CAN join multiple teams (if each has no existing manager).
  3. A sales exec promoted to manager is blocked if any of their teams already has a manager.
"""

import os
import sys

# Ensure the backend package is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base
import app.models  # noqa: register all models
from app.models.core.user import User
from app.models.core.team import Team
from app.models.core.team_membership import TeamMembership
from app.models.core.company import Company
from app.utils.security import get_password_hash
from app.utils.validators import ensure_one_manager_per_team, validate_manager_constraints_for_user
from fastapi import HTTPException

# Use an in-memory SQLite database for isolation
TEST_DB_URL = "sqlite:///./test_constraints.db"
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestSession = sessionmaker(bind=engine)

PASS = 0
FAIL = 0


def result(name, passed, detail=""):
    global PASS, FAIL
    status = "✅ PASS" if passed else "❌ FAIL"
    if not passed:
        FAIL += 1
    else:
        PASS += 1
    print(f"  {status}: {name}" + (f" — {detail}" if detail else ""))


def setup_db():
    """Create fresh tables and seed baseline data."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = TestSession()
    company = Company(name="Test Corp", company_code="TST", status="active")
    db.add(company)
    db.flush()

    pw = get_password_hash("TestPass1!")

    manager_a = User(
        email="manager_a@test.local", full_name="Manager A",
        hashed_password=pw, role="manager", company_id=company.id,
        status="active", is_active=True, employee_num=1,
    )
    manager_b = User(
        email="manager_b@test.local", full_name="Manager B",
        hashed_password=pw, role="manager", company_id=company.id,
        status="active", is_active=True, employee_num=2,
    )
    sales_a = User(
        email="sales_a@test.local", full_name="Sales A",
        hashed_password=pw, role="sales", company_id=company.id,
        status="active", is_active=True, employee_num=3,
    )
    sales_b = User(
        email="sales_b@test.local", full_name="Sales B",
        hashed_password=pw, role="sales", company_id=company.id,
        status="active", is_active=True, employee_num=4,
    )

    db.add_all([manager_a, manager_b, sales_a, sales_b])
    db.flush()

    team_alpha = Team(name="Alpha", company_id=company.id)
    team_beta = Team(name="Beta", company_id=company.id)
    team_gamma = Team(name="Gamma", company_id=company.id)
    db.add_all([team_alpha, team_beta, team_gamma])
    db.flush()

    # Manager A manages Alpha
    db.add(TeamMembership(company_id=company.id, team_id=team_alpha.id, user_id=manager_a.id))
    # Sales A is in Alpha and Beta
    db.add(TeamMembership(company_id=company.id, team_id=team_alpha.id, user_id=sales_a.id))
    db.add(TeamMembership(company_id=company.id, team_id=team_beta.id, user_id=sales_a.id))
    # Sales B is in Beta
    db.add(TeamMembership(company_id=company.id, team_id=team_beta.id, user_id=sales_b.id))

    db.commit()
    return db, company, manager_a, manager_b, sales_a, sales_b, team_alpha, team_beta, team_gamma


def test_block_second_manager_on_team():
    """Adding a second manager to Alpha (which already has Manager A) should fail."""
    print("\n── Test 1: Block second manager on same team ──")
    db, company, mgr_a, mgr_b, _, _, team_alpha, _, _ = setup_db()
    try:
        ensure_one_manager_per_team(db, team_alpha.id, exclude_user_id=mgr_b.id)
        result("ensure_one_manager_per_team raised 400", False, "No exception raised!")
    except HTTPException as e:
        result("ensure_one_manager_per_team raised 400", e.status_code == 400, f"status={e.status_code}, detail={e.detail}")
    finally:
        db.close()


def test_allow_manager_on_empty_team():
    """A manager should be allowed to join an unmanaged team (Gamma)."""
    print("\n── Test 2: Allow manager on empty (unmanaged) team ──")
    db, company, mgr_a, _, _, _, _, _, team_gamma = setup_db()
    try:
        ensure_one_manager_per_team(db, team_gamma.id, exclude_user_id=mgr_a.id)
        result("Manager can join unmanaged team", True)
    except HTTPException as e:
        result("Manager can join unmanaged team", False, f"Unexpected 400: {e.detail}")
    finally:
        db.close()


def test_manager_joins_multiple_empty_teams():
    """A single manager should join Beta and Gamma (both unmanaged)."""
    print("\n── Test 3: Manager joins multiple unmanaged teams ──")
    db, company, mgr_a, _, _, _, _, team_beta, team_gamma = setup_db()
    try:
        ensure_one_manager_per_team(db, team_beta.id, exclude_user_id=mgr_a.id)
        ensure_one_manager_per_team(db, team_gamma.id, exclude_user_id=mgr_a.id)
        result("Manager can join multiple unmanaged teams", True)
    except HTTPException as e:
        result("Manager can join multiple unmanaged teams", False, f"Unexpected 400: {e.detail}")
    finally:
        db.close()


def test_block_promotion_if_teams_have_managers():
    """Promoting Sales A to manager should fail because Alpha already has Manager A."""
    print("\n── Test 4: Block promotion if any team already managed ──")
    db, company, mgr_a, _, sales_a, _, team_alpha, team_beta, _ = setup_db()

    # Reload sales_a with eager memberships
    sales_a = db.query(User).filter(User.id == sales_a.id).first()

    try:
        validate_manager_constraints_for_user(db, sales_a, "manager")
        result("validate_manager_constraints blocked promotion", False, "No exception raised!")
    except HTTPException as e:
        result("validate_manager_constraints blocked promotion", e.status_code == 400, f"status={e.status_code}, detail={e.detail}")
    finally:
        db.close()


def test_allow_promotion_if_no_conflict():
    """Promoting Sales B (only in Beta, which has no manager) should succeed."""
    print("\n── Test 5: Allow promotion when no conflict ──")
    db, company, _, _, _, sales_b, _, team_beta, _ = setup_db()

    sales_b = db.query(User).filter(User.id == sales_b.id).first()

    try:
        validate_manager_constraints_for_user(db, sales_b, "manager")
        result("Promotion allowed for conflict-free user", True)
    except HTTPException as e:
        result("Promotion allowed for conflict-free user", False, f"Unexpected 400: {e.detail}")
    finally:
        db.close()


def test_same_manager_no_false_positive():
    """Manager A checking their own team (Alpha) should pass (exclude_user_id works)."""
    print("\n── Test 6: No false-positive for existing manager ──")
    db, company, mgr_a, _, _, _, team_alpha, _, _ = setup_db()
    try:
        ensure_one_manager_per_team(db, team_alpha.id, exclude_user_id=mgr_a.id)
        result("Own-team check passes (self-exclusion)", True)
    except HTTPException as e:
        result("Own-team check passes (self-exclusion)", False, f"Unexpected 400: {e.detail}")
    finally:
        db.close()


if __name__ == "__main__":
    print("=" * 60)
    print("  1-MANAGER-PER-TEAM CONSTRAINT TESTS")
    print("=" * 60)

    test_block_second_manager_on_team()
    test_allow_manager_on_empty_team()
    test_manager_joins_multiple_empty_teams()
    test_block_promotion_if_teams_have_managers()
    test_allow_promotion_if_no_conflict()
    test_same_manager_no_false_positive()

    print("\n" + "=" * 60)
    print(f"  RESULTS: {PASS} passed, {FAIL} failed")
    print("=" * 60)

    # Cleanup test database
    if os.path.exists("test_constraints.db"):
        os.remove("test_constraints.db")

    sys.exit(1 if FAIL > 0 else 0)
