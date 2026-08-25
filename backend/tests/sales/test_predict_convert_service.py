from datetime import datetime
from app.models.sales.deal import Deal
from app.models.sales.pipeline import Pipeline, PipelineStage
from app.models.core.enums import DealStageType
from app.services.predictions.convert import (
    train_convert, predict_deal, load_model, CONVERT_KIND, closed_deal_rows,
)
from tests.helpers.factories import create_company


def _pipeline_with_stages(db, company_id):
    p = Pipeline(company_id=company_id, name="P")
    db.add(p); db.flush()
    won = PipelineStage(company_id=company_id, pipeline_id=p.id, name="Won",
                        position=3, stage_type=DealStageType.WON)
    lost = PipelineStage(company_id=company_id, pipeline_id=p.id, name="Lost",
                         position=4, stage_type=DealStageType.LOST)
    open_ = PipelineStage(company_id=company_id, pipeline_id=p.id, name="New",
                          position=1, stage_type=DealStageType.OPEN)
    db.add_all([won, lost, open_]); db.flush()
    return p, won, lost, open_


def _seed_closed(db, company_id, p, won, lost):
    for src, wins in [("A", 8), ("B", 2)]:
        for i in range(10):
            stage = won if i < wins else lost
            db.add(Deal(company_id=company_id, title=f"{src}{i}", amount=1000 * (i + 1),
                        pipeline_id=p.id, stage_id=stage.id, source=src,
                        closed_at=datetime.utcnow()))
    db.commit()


def test_closed_deal_rows_labels(db):
    company = create_company(db, name="PC1", company_code="PC1")
    p, won, lost, open_ = _pipeline_with_stages(db, company.id)
    _seed_closed(db, company.id, p, won, lost)
    db.add(Deal(company_id=company.id, title="open", amount=500,
                pipeline_id=p.id, stage_id=open_.id, source="A"))
    db.commit()
    rows = closed_deal_rows(db, company.id)
    assert len(rows) == 20
    assert sum(1 for r in rows if r["won"]) == 10


def test_train_and_predict(db):
    company = create_company(db, name="PC2", company_code="PC2")
    p, won, lost, open_ = _pipeline_with_stages(db, company.id)
    _seed_closed(db, company.id, p, won, lost)
    model = train_convert(db, company.id)
    assert model.sample_count == 20
    assert load_model(db, company.id, CONVERT_KIND) is not None

    deal_a = Deal(company_id=company.id, title="live-A", amount=5000,
                  pipeline_id=p.id, stage_id=open_.id, source="A")
    deal_b = Deal(company_id=company.id, title="live-B", amount=5000,
                  pipeline_id=p.id, stage_id=open_.id, source="B")
    db.add_all([deal_a, deal_b]); db.commit()
    pa = predict_deal(db, deal_a)
    pb = predict_deal(db, deal_b)
    assert pa["probability"] > pb["probability"]


def test_predict_lazy_fallback_when_untrained(db):
    company = create_company(db, name="PC3", company_code="PC3")
    p, won, lost, open_ = _pipeline_with_stages(db, company.id)
    deal = Deal(company_id=company.id, title="x", amount=100,
                pipeline_id=p.id, stage_id=open_.id, source="A")
    db.add(deal); db.commit()
    out = predict_deal(db, deal)
    assert out["model"] == "fallback"
    assert 0.0 <= out["probability"] <= 1.0
