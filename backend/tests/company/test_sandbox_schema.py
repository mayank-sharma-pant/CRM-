"""Sandbox schema columns."""

from sqlalchemy import inspect

from app.models.core.company import Company
from tests.helpers.factories import create_company


def test_sandbox_columns_exist(db_engine):
    cols = {c["name"] for c in inspect(db_engine).get_columns("companies")}
    assert "is_sandbox" in cols
    assert "sandbox_parent_id" in cols


def test_can_persist_sandbox_company(db):
    parent = create_company(db, name="Live Co", company_code="LV1")
    sandbox = Company(
        name="Live Co (Sandbox)",
        company_code="SB1",
        status="active",
        is_sandbox=True,
        sandbox_parent_id=parent.id,
    )
    db.add(sandbox)
    db.commit()
    db.refresh(sandbox)
    assert sandbox.is_sandbox is True
    assert sandbox.sandbox_parent_id == parent.id
