from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional, List

from app.database import get_db
from app.utils.dependencies import get_current_user, apply_company_scope
from app.models.core.user import User

router = APIRouter()


@router.get("")
def list_users(
    role: Optional[str] = Query(None, description="Filter by role"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List users for task assignee dropdown and similar use (paginated).
    Scoped by company first, then optionally by team.
    """
    query = apply_company_scope(db.query(User), User, current_user)
    query = query.filter(User.is_active == True)
    if current_user.team_id:
        query = query.filter(User.team_id == current_user.team_id)
    if role and role.lower() != "all":
        query = query.filter(User.role == role.lower())
    total = query.count()
    users = query.order_by(User.full_name).offset(skip).limit(limit).all()
    return {
        "items": [
            {"id": u.id, "email": u.email, "full_name": u.full_name, "role": u.role, "team_id": u.team_id}
            for u in users
        ],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.get("/me")
def get_me(
    current_user: User = Depends(get_current_user)
):
    """Get current user profile. Use /auth/me for full auth context."""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "status": current_user.status,
        "phone": current_user.phone,
        "team_id": current_user.team_id,
        "company_id": current_user.company_id,
    }
