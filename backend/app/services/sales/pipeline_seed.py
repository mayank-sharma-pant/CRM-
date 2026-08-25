from sqlalchemy.orm import Session

from app.models.core.enums import DealStageType
from app.models.sales.pipeline import Pipeline, PipelineStage

_DEFAULT_STAGES = [
    ("Qualification", DealStageType.OPEN, 10),
    ("Proposal", DealStageType.OPEN, 40),
    ("Negotiation", DealStageType.OPEN, 70),
    ("Won", DealStageType.WON, 100),
    ("Lost", DealStageType.LOST, 0),
]


def attach_default_stages(db: Session, company_id: int, pipeline_id: int) -> None:
    for position, (name, stage_type, prob) in enumerate(_DEFAULT_STAGES, start=1):
        db.add(PipelineStage(
            company_id=company_id, pipeline_id=pipeline_id, name=name,
            position=position, stage_type=stage_type, default_probability=prob,
        ))


def ensure_default_pipeline(db: Session, company_id: int) -> Pipeline:
    """Idempotently create a company's default pipeline + stages. Returns the default pipeline."""
    existing = (
        db.query(Pipeline)
        .filter(Pipeline.company_id == company_id, Pipeline.is_default == True)  # noqa: E712
        .first()
    )
    if existing:
        return existing

    pipeline = Pipeline(company_id=company_id, name="Sales Pipeline", is_default=True, is_active=True)
    db.add(pipeline)
    db.flush()
    attach_default_stages(db, company_id, pipeline.id)
    db.commit()
    db.refresh(pipeline)
    return pipeline
