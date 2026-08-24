from typing import List

from sqlalchemy.orm import Session

from app.models.sales.tag import LeadTag, Tag


def _norm(name: str) -> str:
    return " ".join((name or "").strip().lower().split())


def list_tag_names(db: Session, company_id: int, lead_id: int) -> List[str]:
    rows = (
        db.query(Tag.name)
        .join(LeadTag, LeadTag.tag_id == Tag.id)
        .filter(LeadTag.lead_id == lead_id, LeadTag.company_id == company_id)
        .order_by(Tag.name)
        .all()
    )
    return [r[0] for r in rows]


def list_company_tags(db: Session, company_id: int) -> List[Tag]:
    return db.query(Tag).filter(Tag.company_id == company_id).order_by(Tag.name).all()


def set_lead_tags(db: Session, company_id: int, lead_id: int, names: List[str]) -> List[str]:
    wanted = []
    seen = set()
    for raw in names or []:
        name = _norm(raw)
        if not name or len(name) > 40 or name in seen:
            continue
        seen.add(name)
        wanted.append(name)
        if len(wanted) >= 20:
            break

    db.query(LeadTag).filter(LeadTag.lead_id == lead_id, LeadTag.company_id == company_id).delete()
    for name in wanted:
        tag = db.query(Tag).filter(Tag.company_id == company_id, Tag.name == name).first()
        if tag is None:
            tag = Tag(company_id=company_id, name=name)
            db.add(tag)
            db.flush()
        db.add(LeadTag(company_id=company_id, lead_id=lead_id, tag_id=tag.id))
    db.flush()
    return wanted
