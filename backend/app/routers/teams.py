from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.utils.dependencies import get_current_user, apply_company_scope, is_platform_admin
from app.models.core.user import User
from app.models.core.team import Team
from app.models.core.team_membership import TeamMembership


router = APIRouter()


@router.get("/mine")
def list_my_teams(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List teams the current user belongs to (company-scoped).
    Used for dropdowns / active-team switcher.
    """
    if is_platform_admin(current_user) or current_user.company_id is None:
        return {"teams": []}

    teams = (
        apply_company_scope(db.query(Team), Team, current_user)
        .join(TeamMembership, TeamMembership.team_id == Team.id)
        .filter(TeamMembership.user_id == current_user.id)
        .order_by(Team.name.asc())
        .all()
    )

    return {
        "teams": [{"id": t.id, "name": t.name} for t in teams],
        "active_team_id": current_user.team_id,
    }

