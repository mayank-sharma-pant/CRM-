from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from typing import Optional, Any
from app.database import get_db
from app.models.user import User
from app.models.company import Company
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

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """Extract and validate the current user from JWT token, enforce company status."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    email: str = payload.get("sub")
    if email is None:
        raise credentials_exception

    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception

    if not user.is_active or user.status == "disabled":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is disabled")

    if user.company_id is not None:
        company = db.query(Company).filter(Company.id == user.company_id).first()
        if company and company.status not in ("active",):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Company account is {company.status}"
            )

    return user


async def require_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    """Ensure user has admin role (active check already done by get_current_user)."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


async def require_admin_or_md(
    current_user: User = Depends(get_current_user)
) -> User:
    """Ensure user has admin or MD role."""
    if current_user.role not in ["admin", "md"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or MD access required"
        )
    return current_user


def require_company_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Ensure user belongs to a company (not Platform Admin). Used when company_id is required."""
    if current_user.role == "admin" and current_user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Platform Admin cannot perform this company-scoped action"
        )
    if current_user.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User must be assigned to a company"
        )
    return current_user


def get_optional_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Get current user if token provided, otherwise return None"""
    if token is None:
        return None
    
    payload = decode_access_token(token)
    if payload is None:
        return None
    
    email: str = payload.get("sub")
    if email is None:
        return None
    
    return db.query(User).filter(User.email == email).first()
