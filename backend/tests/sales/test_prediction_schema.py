from app.models.sales.prediction import PredictionModel


def test_prediction_model_columns():
    cols = {c.name for c in PredictionModel.__table__.columns}
    assert cols == {
        "id", "company_id", "kind", "trained_at",
        "sample_count", "base_rate", "params", "version",
    }


def test_prediction_model_persists(db):
    m = PredictionModel(company_id=1, kind="deal_convert", sample_count=12,
                        base_rate=0.5, params="{}", version=1)
    db.add(m)
    db.commit()
    db.refresh(m)
    assert m.id is not None
