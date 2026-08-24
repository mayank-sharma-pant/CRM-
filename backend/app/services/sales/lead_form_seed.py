import secrets

from sqlalchemy.orm import Session

from app.models.core.team import Team
from app.models.sales.lead_form import LeadForm


def ensure_default_lead_form(db: Session, company_id: int) -> LeadForm:
    """Idempotently create one public lead form per company."""
    existing = db.query(LeadForm).filter(LeadForm.company_id == company_id).first()
    if existing:
        return existing

    team = (
        db.query(Team)
        .filter(Team.company_id == company_id)
        .order_by(Team.id.asc())
        .first()
    )
    form = LeadForm(
        company_id=company_id,
        slug=secrets.token_urlsafe(16),
        name="Website",
        headline="Get a quote",
        is_active=True,
        default_team_id=team.id if team else None,
        default_source="Website",
    )
    db.add(form)
    db.commit()
    db.refresh(form)
    return form
