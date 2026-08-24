from decimal import Decimal
from sqlalchemy import inspect

from app.models.core.enums import DealStageType
from app.models.sales.pipeline import Pipeline, PipelineStage
from app.models.sales.deal import Deal


def test_deal_tables_exist_and_have_company_id(db_engine):
    tables = set(inspect(db_engine).get_table_names())
    assert {"pipelines", "pipeline_stages", "deals"} <= tables
    for t in ("pipelines", "pipeline_stages", "deals"):
        cols = {c["name"] for c in inspect(db_engine).get_columns(t)}
        assert "company_id" in cols


def test_deal_stage_type_values():
    assert DealStageType.OPEN.value == "open"
    assert DealStageType.WON.value == "won"
    assert DealStageType.LOST.value == "lost"


def test_can_persist_a_deal(db):
    pipe = Pipeline(company_id=1, name="Sales", is_default=True)
    db.add(pipe); db.flush()
    stage = PipelineStage(company_id=1, pipeline_id=pipe.id, name="Qualification",
                          position=1, stage_type=DealStageType.OPEN, default_probability=10)
    db.add(stage); db.flush()
    deal = Deal(company_id=1, title="Acme roof", amount=Decimal("50000.00"),
                pipeline_id=pipe.id, stage_id=stage.id)
    db.add(deal); db.commit(); db.refresh(deal)
    assert deal.id is not None
    assert deal.currency == "INR"
    assert deal.amount == Decimal("50000.00")
