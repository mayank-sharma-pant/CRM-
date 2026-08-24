from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.core.user import User
from app.models.sales.client import Client
from app.models.sales.email_log import EmailLog
from app.models.sales.lead import Lead
from app.services.sales.crm_email import deliver_and_log, serialize_email
from app.utils.dependencies import apply_company_scope, ensure_company_access, get_current_user

router = APIRouter()


class EmailCreate(BaseModel):
    subject: str
    body: str
    to_email: Optional[EmailStr] = None
    lead_id: Optional[int] = None
    client_id: Optional[int] = None


def _get_log(db: Session, current_user: User, email_id: int) -> EmailLog:
    row = apply_company_scope(db.query(EmailLog), EmailLog, current_user).filter(EmailLog.id == email_id).first()
    if row is None:
        raise HTTPException(status_code=404, detail="Email not found")
    ensure_company_access(row, current_user)
    return row


@router.post("", status_code=status.HTTP_201_CREATED)
def create_email(
    payload: EmailCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.company_id is None:
        raise HTTPException(status_code=403, detail="User must belong to a company")
    subject = (payload.subject or "").strip()
    body = (payload.body or "").strip()
    if not subject or len(subject) > 200:
        raise HTTPException(status_code=400, detail="subject is required (max 200 characters)")
    if not body or len(body) > 20000:
        raise HTTPException(status_code=400, detail="body is required")

    lead = None
    client = None
    to_email = str(payload.to_email) if payload.to_email else None
    if payload.lead_id is not None:
        lead = apply_company_scope(db.query(Lead), Lead, current_user).filter(Lead.id == payload.lead_id).first()
        if lead is None:
            raise HTTPException(status_code=400, detail="lead_id not found in your company")
        to_email = to_email or (lead.email or "").strip() or None
    if payload.client_id is not None:
        client = apply_company_scope(db.query(Client), Client, current_user).filter(Client.id == payload.client_id).first()
        if client is None:
            raise HTTPException(status_code=400, detail="client_id not found in your company")
        to_email = to_email or (client.email or "").strip() or None
    if not to_email:
        raise HTTPException(status_code=400, detail="to_email is required (or a lead/client with an email)")

    row = deliver_and_log(
        db,
        company_id=current_user.company_id,
        sent_by_id=current_user.id,
        to_email=to_email,
        subject=subject,
        body=body,
        lead_id=lead.id if lead else None,
        client_id=client.id if client else None,
    )
    return serialize_email(row)


@router.get("")
def list_emails(
    lead_id: Optional[int] = Query(None),
    client_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = apply_company_scope(db.query(EmailLog), EmailLog, current_user)
    if lead_id is not None:
        query = query.filter(EmailLog.lead_id == lead_id)
    if client_id is not None:
        query = query.filter(EmailLog.client_id == client_id)
    rows = query.order_by(EmailLog.id.desc()).limit(100).all()
    return {"items": [serialize_email(r) for r in rows], "total": len(rows)}


@router.get("/{email_id:int}")
def get_email(
    email_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return serialize_email(_get_log(db, current_user, email_id))
