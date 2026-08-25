from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.core.user import User
from app.services.sales.campaigns import (
    create_campaign,
    delete_campaign,
    get_campaign,
    list_campaigns,
    send_campaign,
    serialize_campaign,
)
from app.utils.dependencies import get_current_user, require_admin_or_md

router = APIRouter()


class CampaignIn(BaseModel):
    name: str
    subject: str
    body: str
    audience: str


def _company_id(user: User) -> int:
    if user.company_id is None:
        raise HTTPException(status_code=403, detail="User must belong to a company")
    return user.company_id


@router.get("")
def read_campaigns(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cid = _company_id(current_user)
    rows = list_campaigns(db, cid)
    return {"total": len(rows), "items": [serialize_campaign(r) for r in rows]}


@router.post("", status_code=status.HTTP_201_CREATED)
def post_campaign(
    payload: CampaignIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    cid = _company_id(current_user)
    row = create_campaign(
        db, cid,
        name=payload.name, subject=payload.subject, body=payload.body,
        audience=payload.audience, created_by_id=current_user.id,
    )
    return serialize_campaign(row)


@router.get("/{campaign_id:int}")
def read_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cid = _company_id(current_user)
    return serialize_campaign(get_campaign(db, cid, campaign_id), include_recipients=True)


@router.post("/{campaign_id:int}/send")
def post_send(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    cid = _company_id(current_user)
    row = get_campaign(db, cid, campaign_id)
    return send_campaign(db, cid, row, sent_by_id=current_user.id)


@router.delete("/{campaign_id:int}", status_code=204)
def remove_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    cid = _company_id(current_user)
    delete_campaign(db, get_campaign(db, cid, campaign_id))
    return Response(status_code=204)
