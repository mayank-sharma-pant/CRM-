"""Sandbox service unit tests."""

import pytest

from app.models.core.enums import CompanyStatus, UserStatus
from app.services.billing.seed import seed_plans
from app.services.company.sandbox import create_sandbox, destroy_sandbox, find_active_sandbox
from tests.helpers.factories import create_company


@pytest.fixture(autouse=True)
def _plans(db):
    seed_plans(db)


def test_create_sandbox_returns_admin_and_password(db):
    parent = create_company(db, name="Acme", company_code="AC1")
    sandbox, admin, password = create_sandbox(db, parent=parent)
    assert sandbox.is_sandbox is True
    assert sandbox.sandbox_parent_id == parent.id
    assert sandbox.name == "Acme (Sandbox)"
    assert admin.company_id == sandbox.id
    assert admin.email.startswith(f"sandbox.{parent.id}.")
    assert admin.email.endswith("@sandbox.local")
    assert len(password) >= 8
    assert find_active_sandbox(db, parent.id).id == sandbox.id


def test_second_create_raises(db):
    parent = create_company(db, name="Acme", company_code="AC2")
    create_sandbox(db, parent=parent)
    with pytest.raises(ValueError, match="sandbox already exists"):
        create_sandbox(db, parent=parent)


def test_create_from_sandbox_raises(db):
    parent = create_company(db, name="Acme", company_code="AC3")
    sandbox, _, _ = create_sandbox(db, parent=parent)
    with pytest.raises(ValueError, match="cannot create sandbox from a sandbox"):
        create_sandbox(db, parent=sandbox)


def test_destroy_disables_users_and_clears_parent_link(db):
    parent = create_company(db, name="Acme", company_code="AC4")
    sandbox, admin, _ = create_sandbox(db, parent=parent)
    destroy_sandbox(db, sandbox=sandbox)
    db.refresh(sandbox)
    db.refresh(admin)
    assert sandbox.status == CompanyStatus.SUSPENDED
    assert sandbox.sandbox_parent_id is None
    assert admin.status == UserStatus.DISABLED
    assert admin.is_active is False
    assert find_active_sandbox(db, parent.id) is None
    # Parent can create again
    again, _, _ = create_sandbox(db, parent=parent)
    assert again.id != sandbox.id
