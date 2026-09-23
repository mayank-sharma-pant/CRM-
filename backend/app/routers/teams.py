from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.utils.dependencies import get_current_user, is_platform_admin
from app.models.core.user import User
from app.services.team_bootstrap import ensure_user_teams


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

    teams = ensure_user_teams(db, current_user)

    return {
        "teams": [{"id": t.id, "name": t.name} for t in teams],
        "active_team_id": current_user.team_id,
    }

