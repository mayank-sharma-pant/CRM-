from app.models.core.enums import DealStageType
from app.models.sales.pipeline import Pipeline, PipelineStage
from app.services.sales.pipeline_seed import ensure_default_pipeline


def test_seed_creates_one_pipeline_and_five_stages(db):
    pipe = ensure_default_pipeline(db, company_id=1)
    assert pipe.is_default is True
    stages = db.query(PipelineStage).filter(PipelineStage.pipeline_id == pipe.id).order_by(PipelineStage.position).all()
    assert [s.name for s in stages] == ["Qualification", "Proposal", "Negotiation", "Won", "Lost"]
    assert [s.default_probability for s in stages] == [10, 40, 70, 100, 0]
    assert stages[3].stage_type == DealStageType.WON
    assert stages[4].stage_type == DealStageType.LOST
    assert all(s.company_id == 1 for s in stages)


def test_seed_is_idempotent(db):
    ensure_default_pipeline(db, company_id=1)
    ensure_default_pipeline(db, company_id=1)
    assert db.query(Pipeline).filter(Pipeline.company_id == 1).count() == 1
    assert db.query(PipelineStage).filter(PipelineStage.company_id == 1).count() == 5


def test_seed_is_per_company(db):
    a = ensure_default_pipeline(db, company_id=1)
    b = ensure_default_pipeline(db, company_id=2)
    assert a.id != b.id
    assert db.query(Pipeline).count() == 2
