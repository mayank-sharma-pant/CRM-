import pytest
from fastapi import HTTPException

from app.services.sales.custom_modules import (
    create_field,
    create_module,
    create_record,
    MAX_FIELDS,
    MAX_MODULES,
)
from tests.helpers.factories import create_company


def test_create_module_and_record(db):
    company = create_company(db, name="Co", company_code="CM1")
    mod = create_module(db, company.id, name="Sites", slug="sites")
    assert mod.slug == "sites"
    field = create_field(
        db, company.id, mod,
        name="Kind", field_key="kind", field_type="picklist", options=["Roof", "Bath"],
    )
    rec = create_record(db, company.id, mod, title="Job 1", values={"kind": "Roof"}, created_by_id=None)
    assert rec.title == "Job 1"
    assert field.field_key == "kind"


def test_reserved_slug_rejected(db):
    company = create_company(db, name="Co", company_code="CM2")
    with pytest.raises(HTTPException) as ei:
        create_module(db, company.id, name="Leads", slug="leads")
    assert ei.value.status_code == 400


def test_duplicate_slug_rejected(db):
    company = create_company(db, name="Co", company_code="CM3")
    create_module(db, company.id, name="Sites", slug="sites")
    with pytest.raises(HTTPException) as ei:
        create_module(db, company.id, name="Sites 2", slug="sites")
    assert ei.value.status_code == 400


def test_module_cap(db):
    company = create_company(db, name="Co", company_code="CM4")
    for i in range(MAX_MODULES):
        create_module(db, company.id, name=f"M{i}", slug=f"mod_{i}")
    with pytest.raises(HTTPException) as ei:
        create_module(db, company.id, name="Extra", slug="extra")
    assert ei.value.status_code == 400


def test_field_cap_and_unknown_value(db):
    company = create_company(db, name="Co", company_code="CM5")
    mod = create_module(db, company.id, name="Sites", slug="sites")
    for i in range(MAX_FIELDS):
        create_field(db, company.id, mod, name=f"F{i}", field_key=f"f_{i}", field_type="text")
    with pytest.raises(HTTPException) as ei:
        create_field(db, company.id, mod, name="X", field_key="x", field_type="text")
    assert ei.value.status_code == 400
    with pytest.raises(HTTPException) as ei:
        create_record(db, company.id, mod, title="R", values={"nope": "1"})
    assert ei.value.status_code == 400
