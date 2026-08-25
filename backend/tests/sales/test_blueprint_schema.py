from sqlalchemy import inspect

from app.models.sales.pipeline import Pipeline, PipelineStage
from tests.helpers.factories import create_company


def test_blueprint_columns_exist(db_engine):
    p_cols = {c["name"] for c in inspect(db_engine).get_columns("pipelines")}
    s_cols = {c["name"] for c in inspect(db_engine).get_columns("pipeline_stages")}
    assert "blueprint_enabled" in p_cols
    assert "required_fields" in s_cols


def test_can_persist_blueprint_fields(db):
    company = create_company(db, name="BP Co", company_code="BPC")
    pipeline = Pipeline(company_id=company.id, name="Sales", is_default=True, blueprint_enabled=True)
    db.add(pipeline)
    db.flush()
    stage = PipelineStage(
        company_id=company.id, pipeline_id=pipeline.id, name="Qualification",
        position=1, required_fields='["amount","expected_close"]',
    )
    db.add(stage)
    db.commit()
    db.refresh(pipeline)
    db.refresh(stage)
    assert pipeline.blueprint_enabled is True
    assert stage.required_fields == '["amount","expected_close"]'
