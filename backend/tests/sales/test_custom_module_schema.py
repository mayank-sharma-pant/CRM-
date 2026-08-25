from app.models.sales.custom_module import CustomModule, CustomModuleField, CustomModuleRecord


def test_module_columns():
    cols = {c.name for c in CustomModule.__table__.columns}
    assert cols == {"id", "company_id", "name", "slug", "is_active"}


def test_field_columns():
    cols = {c.name for c in CustomModuleField.__table__.columns}
    assert cols == {
        "id", "company_id", "module_id", "name", "field_key",
        "field_type", "options_json", "is_active",
    }


def test_record_columns():
    cols = {c.name for c in CustomModuleRecord.__table__.columns}
    assert cols == {
        "id", "company_id", "module_id", "title", "values_json",
        "created_by_id", "created_at", "updated_at",
    }


def test_module_and_record_persist(db):
    mod = CustomModule(company_id=1, name="Sites", slug="sites")
    db.add(mod)
    db.commit()
    db.refresh(mod)
    rec = CustomModuleRecord(
        company_id=1, module_id=mod.id, title="Roof A", values_json="{}",
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    assert rec.id is not None
    assert rec.module_id == mod.id
