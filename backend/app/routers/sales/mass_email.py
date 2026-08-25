from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.core.user import User
from app.services.sales.mass_email import (
    list_blasts,
    remaining_today,
    send_mass_email,
    serialize_blast,
)
from app.utils.dependencies import require_admin_or_md

router = APIRouter()


class MassEmailIn(BaseModel):
    subject: str
    body: str
    audience: Optional[str] = None
    lead_ids: Optional[List[int]] = None
    client_ids: Optional[List[int]] = None


def _company_id(user: User) -> int:
    if user.company_id is None:
        raise HTTPException(status_code=403, detail="User must belong to a company")
    return user.company_id


@router.get("")
def read_blasts(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    cid = _company_id(current_user)
    rows = list_blasts(db, cid)
    return {
        "total": len(rows),
        "remaining_today": remaining_today(db, cid),
        "items": [serialize_blast(r) for r in rows],
    }


@router.post("")
def post_blast(
    payload: MassEmailIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    cid = _company_id(current_user)
    return send_mass_email(
        db, cid,
        subject=payload.subject,
        body=payload.body,
        audience=payload.audience,
        lead_ids=payload.lead_ids,
        client_ids=payload.client_ids,
        sent_by_id=current_user.id,
    )
