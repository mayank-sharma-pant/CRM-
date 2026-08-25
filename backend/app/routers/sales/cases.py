from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.core.user import User
from app.services.sales.cases import (
    create_case,
    delete_case,
    ensure_form,
    get_case,
    list_cases,
    patch_case,
    patch_form,
    serialize_case,
    serialize_form,
)
from app.utils.dependencies import get_current_user, require_admin_or_md

router = APIRouter()


class CaseIn(BaseModel):
    subject: str
    body: str
    client_id: Optional[int] = None
    requester_name: Optional[str] = None
    requester_email: Optional[str] = None


class CasePatch(BaseModel):
    status: str


class FormPatch(BaseModel):
    is_active: Optional[bool] = None


def _company_id(user: User) -> int:
    if user.company_id is None:
        raise HTTPException(status_code=403, detail="User must belong to a company")
    return user.company_id


@router.get("/form")
def read_form(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return serialize_form(ensure_form(db, _company_id(current_user)))


@router.patch("/form")
def update_form(
    payload: FormPatch,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    form = ensure_form(db, _company_id(current_user))
    return serialize_form(patch_form(db, form, is_active=payload.is_active))


@router.get("")
def read_cases(
    client_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cid = _company_id(current_user)
    rows = list_cases(db, cid, client_id=client_id, status=status_filter)
    return {"total": len(rows), "items": [serialize_case(r) for r in rows]}


@router.post("", status_code=status.HTTP_201_CREATED)
def post_case(
    payload: CaseIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cid = _company_id(current_user)
    row = create_case(
        db, cid,
        subject=payload.subject, body=payload.body,
        client_id=payload.client_id,
        requester_name=payload.requester_name,
        requester_email=payload.requester_email,
        source="crm",
    )
    return serialize_case(row)


@router.get("/{case_id:int}")
def read_case(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return serialize_case(get_case(db, _company_id(current_user), case_id))


@router.patch("/{case_id:int}")
def update_case(
    case_id: int,
    payload: CasePatch,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = get_case(db, _company_id(current_user), case_id)
    return serialize_case(patch_case(db, row, status=payload.status))


@router.delete("/{case_id:int}", status_code=204)
def remove_case(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    delete_case(db, get_case(db, _company_id(current_user), case_id))
    return Response(status_code=204)
