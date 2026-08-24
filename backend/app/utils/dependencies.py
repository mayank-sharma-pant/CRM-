from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from sqlalchemy import func as sa_func
from typing import Optional, Any
from datetime import datetime, timezone
from app.database import get_db
from app.models.core.user import User
from app.models.core.company import Company
from app.models.core.team_membership import TeamMembership
from app.models.core.team import Team
from app.utils.security import decode_access_token


def is_platform_admin(user: User) -> bool:
    """Platform Admin has role=admin and company_id=NULL. Bypasses company scoping."""
    return user.role == "admin" and user.company_id is None


def apply_company_scope(query, model_class: type, current_user: User, company_id_attr: str = "company_id"):
    """
    Apply company scoping to a query. Platform Admin (role=admin, company_id=NULL) bypasses.
    Returns the filtered query.
    """
    if is_platform_admin(current_user):
        return query
    col = getattr(model_class, company_id_attr)
    return query.filter(col == current_user.company_id)


def ensure_company_access(entity: Any, current_user: User, company_id_attr: str = "company_id") -> None:
    """
    Raise 404 if entity exists but belongs to another company. Platform Admin bypasses.
    """
    if entity is None:
        return
    if is_platform_admin(current_user):
        return
    if getattr(entity, company_id_attr) != current_user.company_id:
        raise HTTPException(status_code=404, detail="Not found")

class OAuth2PasswordBearerWithCookie(OAuth2PasswordBearer):
    async def __call__(self, request: Request) -> Optional[str]:
        # Priority: 1. Authorization Header, 2. Cookie
        authorization = await super().__call__(request)
        if not authorization:
            authorization = request.cookies.get("access_token")
        return authorization

oauth2_scheme = OAuth2PasswordBearerWithCookie(tokenUrl="/api/auth/login", auto_error=False)


async def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """Extract and validate the current user from JWT token (header or cookie), enforce company status."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if token is None:
        raise credentials_exception

    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    email: str = payload.get("sub")
    if email is None:
        raise credentials_exception

    user = db.query(User).filter(sa_func.lower(User.email) == email.lower()).first()
    if user is None:
        raise credentials_exception

    if not user.is_active or user.status.value == "disabled":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is disabled")

    if user.company_id is not None:
        company = db.query(Company).filter(Company.id == user.company_id).first()
        # Use str().lower() on the value to be extremely safe against any string-backed enum variation
        company_status = str(company.status.value if hasattr(company.status, 'value') else company.status).lower()
        if company and company_status not in ("active", "trial"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Company account is {company.status}"
            )
        if company and company_status == "trial" and company.trial_ends_at is not None:
            trial_ends_at = company.trial_ends_at
            if trial_ends_at.tzinfo is None:
                trial_ends_at = trial_ends_at.replace(tzinfo=timezone.utc)
            if trial_ends_at < datetime.now(timezone.utc):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Trial expired. Please upgrade to continue."
                )

    return user


async def require_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    """Ensure user has admin role (active check already done by get_current_user)."""
    if current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


async def require_admin_or_md(
    current_user: User = Depends(get_current_user)
) -> User:
    """Ensure user has admin or MD role."""
    if current_user.role.value not in ["admin", "md"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or MD access required"
        )
    return current_user


def get_active_team_id(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Optional[int]:
    """
    Active team scope for multi-team users.

    Priority:
    - X-Team-Id header (must be a team the user is a member of)
    - current_user.team_id (legacy primary team)
    - most recent membership (if any)

    Returns None for platform admin or users with no team context.
    """
    if is_platform_admin(current_user) or current_user.company_id is None:
        return None

    header_val = request.headers.get("x-team-id") or request.headers.get("X-Team-Id")
    if header_val:
        try:
            team_id = int(header_val)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid X-Team-Id header")

        membership = apply_company_scope(db.query(TeamMembership), TeamMembership, current_user).filter(
            TeamMembership.team_id == team_id,
            TeamMembership.user_id == current_user.id,
        ).first()
        if membership:
            return team_id
        # Stale X-Team-Id (e.g. old localStorage after switching user/company/team): fall back

    if current_user.team_id is not None:
        return current_user.team_id

    membership = apply_company_scope(db.query(TeamMembership), TeamMembership, current_user).filter(
        TeamMembership.user_id == current_user.id
    ).order_by(TeamMembership.id.desc()).first()
    return membership.team_id if membership else None


def require_active_team_id(
    team_id: Optional[int] = Depends(get_active_team_id),
) -> int:
    if team_id is None:
        raise HTTPException(status_code=400, detail="Active team required (set X-Team-Id or assign a primary team)")
    return team_id
