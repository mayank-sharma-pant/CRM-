from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.core.user import User
from app.models.core.team_membership import TeamMembership
from app.models.core.team import Team

def ensure_one_manager_per_team(db: Session, team_id: int, exclude_user_id: int = None):
    """
    Ensures that a team does not already have an active manager,
    excluding a given user ID. Prevents assigning multiple managers.
    Raises HTTPException (400) on conflict.
    """
    query = (
        db.query(User)
        .join(TeamMembership, TeamMembership.user_id == User.id)
        .filter(
            TeamMembership.team_id == team_id,
            User.role == "manager",
            User.status != "disabled"
        )
    )
    if exclude_user_id:
        query = query.filter(User.id != exclude_user_id)
        
    existing_manager = query.first()
    if existing_manager:
        team = db.query(Team).filter(Team.id == team_id).first()
        team_name = team.name if team else f"Team {team_id}"
        raise HTTPException(
            status_code=400,
            detail=f"Conflict: '{team_name}' already has an active manager. A team can only have one manager."
        )

def validate_manager_constraints_for_user(db: Session, user: User, target_role: str, target_team_id: int = None):
    """
    Verifies that promoting a user to 'manager', or adding a new team to an existing manager,
    won't violate the 1-manager-per-team constraint across their various memberships.
    """
    target_role_str = str(target_role) if hasattr(target_role, "value") else target_role
    if target_role_str != "manager":
        return
        
    team_ids_to_check = {m.team_id for m in getattr(user, "team_memberships", [])}
    if target_team_id:
        team_ids_to_check.add(target_team_id)
        
    for tid in team_ids_to_check:
        ensure_one_manager_per_team(db, tid, exclude_user_id=user.id)
