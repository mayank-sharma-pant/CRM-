import html
from typing import Optional

from sqlalchemy.orm import Session

from app.models.sales.email_log import EmailLog
from app.utils.email_service import send_email


def serialize_email(row: EmailLog) -> dict:
    return {
        "id": row.id,
        "lead_id": row.lead_id,
        "client_id": row.client_id,
        "to_email": row.to_email,
        "subject": row.subject,
        "body": row.body,
        "status": row.status,
        "sent_by_id": row.sent_by_id,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


def deliver_and_log(
    db: Session,
    *,
    company_id: int,
    sent_by_id: Optional[int],
    to_email: str,
    subject: str,
    body: str,
    lead_id: Optional[int] = None,
    client_id: Optional[int] = None,
) -> EmailLog:
    html_body = "<br>".join(html.escape(body).splitlines())
    ok = send_email(to_email, subject, f"<div>{html_body}</div>")
    row = EmailLog(
        company_id=company_id,
        lead_id=lead_id,
        client_id=client_id,
        to_email=to_email,
        subject=subject,
        body=body,
        status="sent" if ok else "failed",
        sent_by_id=sent_by_id,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row
