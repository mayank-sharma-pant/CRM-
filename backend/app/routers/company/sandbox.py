"""Sandbox tenant HTTP API."""

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.core.company import Company
from app.models.core.user import User
from app.services.company.sandbox import (
    create_sandbox,
    destroy_sandbox,
    find_active_sandbox,
    sandbox_status_payload,
)
from app.utils.dependencies import get_current_user, require_admin_or_md

router = APIRouter()


def _caller_company(db: Session, current_user: User) -> Company:
    if current_user.company_id is None:
        raise HTTPException(status_code=403, detail="User must belong to a company")
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    if company is None:
        raise HTTPException(status_code=404, detail="Not found")
    return company


@router.get("")
def get_sandbox_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    company = _caller_company(db, current_user)
    return sandbox_status_payload(db, company=company)


@router.post("", status_code=status.HTTP_201_CREATED)
def post_sandbox(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    company = _caller_company(db, current_user)
    try:
        sandbox, admin, raw_password = create_sandbox(db, parent=company)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {
        "id": sandbox.id,
        "name": sandbox.name,
        "company_code": sandbox.company_code,
        "admin_email": admin.email,
        "password": raw_password,
        "login_hint": "Log out and sign in with the sandbox admin email to use the sandbox.",
    }


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def delete_sandbox(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    company = _caller_company(db, current_user)

    if company.is_sandbox:
        target = company
    else:
        target = find_active_sandbox(db, company.id)
        if target is None:
            return Response(status_code=status.HTTP_204_NO_CONTENT)

    try:
        destroy_sandbox(db, sandbox=target)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return Response(status_code=status.HTTP_204_NO_CONTENT)
