import json
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.core.enums import DealStageType
from app.models.sales.deal import Deal
from app.models.sales.pipeline import PipelineStage
from app.models.sales.prediction import PredictionModel
from app.services.predictions.scorecard import fit_scorecard, predict_scorecard

CONVERT_KIND = "deal_convert"


def closed_deal_rows(db: Session, company_id: int) -> list[dict]:
    rows = (
        db.query(Deal, PipelineStage.stage_type)
        .join(PipelineStage, PipelineStage.id == Deal.stage_id)
        .filter(
            Deal.company_id == company_id,
            PipelineStage.stage_type.in_([DealStageType.WON, DealStageType.LOST]),
        )
        .all()
    )
    out = []
    for deal, stage_type in rows:
        out.append({
            "won": stage_type == DealStageType.WON,
            "source": deal.source,
            "amount": float(deal.amount or 0),
            "has_client": deal.client_id is not None,
            "has_owner": deal.assigned_to_id is not None,
        })
    return out


def load_model(db: Session, company_id: int, kind: str) -> PredictionModel | None:
    return (
        db.query(PredictionModel)
        .filter(PredictionModel.company_id == company_id, PredictionModel.kind == kind)
        .order_by(PredictionModel.id.desc())
        .first()
    )


def train_convert(db: Session, company_id: int) -> PredictionModel:
    rows = closed_deal_rows(db, company_id)
    params = fit_scorecard(rows)
    model = load_model(db, company_id, CONVERT_KIND)
    if model is None:
        model = PredictionModel(company_id=company_id, kind=CONVERT_KIND)
        db.add(model)
    model.sample_count = params.get("sample_count", 0)
    model.base_rate = params.get("base_rate", 0.5)
    model.params = json.dumps(params)
    model.trained_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(model)
    return model


def _deal_features(deal: Deal) -> dict:
    return {
        "source": deal.source,
        "amount": float(deal.amount or 0),
        "has_client": deal.client_id is not None,
        "has_owner": deal.assigned_to_id is not None,
    }


def predict_deal(db: Session, deal: Deal) -> dict:
    try:
        model = load_model(db, deal.company_id, CONVERT_KIND)
        if model is None:
            model = train_convert(db, deal.company_id)
        params = json.loads(model.params or "{}")
        return predict_scorecard(params, _deal_features(deal))
    except Exception:
        return {"probability": 0.5, "model": "fallback", "base_rate": 0.5, "factors": []}
