from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.sales.deal import Deal
from app.models.sales.lead import Lead
from app.models.sales.scoring import ScoringRule
from app.services.scoring.engine import score_entity

_MODELS = {"lead": Lead, "deal": Deal}


def active_rules(db: Session, company_id: int, entity_type: str) -> list:
    return (
        db.query(ScoringRule)
        .filter(
            ScoringRule.company_id == company_id,
            ScoringRule.entity_type == entity_type,
            ScoringRule.is_active == True,  # noqa: E712
        )
        .all()
    )


def recompute_one(db: Session, entity, entity_type: str, rules=None) -> int:
    try:
        if rules is None:
            rules = active_rules(db, entity.company_id, entity_type)
        total = score_entity(entity, rules)["total"]
        entity.score = total
        entity.score_updated_at = datetime.now(timezone.utc)
        return total
    except Exception:
        return entity.score or 0


def recompute_all(db: Session, company_id: int, entity_type: str) -> int:
    model = _MODELS[entity_type]
    rules = active_rules(db, company_id, entity_type)
    rows = db.query(model).filter(model.company_id == company_id).all()
    for row in rows:
        recompute_one(db, row, entity_type, rules=rules)
    db.commit()
    return len(rows)
