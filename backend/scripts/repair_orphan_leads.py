"""One-off: set team_id on leads missing it (e.g. after CSV import without active team)."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.database import SessionLocal
from app.models.core.team import Team
from app.models.core.team_membership import TeamMembership
from app.models.core.user import User
from app.models.sales.lead import Lead


def main() -> None:
    db = SessionLocal()
    orphans = db.query(Lead).filter(Lead.deleted_at.is_(None), Lead.team_id.is_(None)).all()
    fixed = 0
    for lead in orphans:
        team_id = None
        if lead.assigned_to_id:
            owner = db.query(User).filter(User.id == lead.assigned_to_id).first()
            if owner and owner.team_id:
                team_id = owner.team_id
        if team_id is None and lead.created_by_id:
            creator = db.query(User).filter(User.id == lead.created_by_id).first()
            if creator and creator.team_id:
                team_id = creator.team_id
        if team_id is None:
            membership = (
                db.query(TeamMembership)
                .filter(TeamMembership.company_id == lead.company_id)
                .order_by(TeamMembership.id.asc())
                .first()
            )
            if membership:
                team_id = membership.team_id
        if team_id is None:
            team = (
                db.query(Team)
                .filter(Team.company_id == lead.company_id)
                .order_by(Team.id.asc())
                .first()
            )
            if team is None:
                team = Team(company_id=lead.company_id, name="Default")
                db.add(team)
                db.flush()
            team_id = team.id
        if team_id is not None:
            lead.team_id = team_id
            lead.assigned_to_id = None
            fixed += 1
    if fixed:
        db.commit()
    print(f"Updated {fixed} lead(s) with missing team_id (cleared owner when re-homing to pool).")
    db.close()


if __name__ == "__main__":
    main()
