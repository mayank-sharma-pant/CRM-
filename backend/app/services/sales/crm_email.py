import html
from typing import Optional

from sqlalchemy.orm import Session

from app.models.sales.email_log import EmailLog
from app.models.sales.mailbox import MailboxConnection
from app.services.sales.mailbox import get_user_mailbox, send_via_mailbox
from app.utils.email_service import send_email


def serialize_email(row: EmailLog) -> dict:
    return {
        "id": row.id,
        "lead_id": row.lead_id,
        "client_id": row.client_id,
        "deal_id": row.deal_id,
        "to_email": row.to_email,
        "from_email": row.from_email,
        "subject": row.subject,
        "body": row.body,
        "status": row.status,
        "direction": row.direction,
        "provider": row.provider,
        "provider_message_id": row.provider_message_id,
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
    deal_id: Optional[int] = None,
) -> EmailLog:
    mailbox: Optional[MailboxConnection] = None
    if sent_by_id is not None:
        mailbox = get_user_mailbox(db, sent_by_id)
        if mailbox is not None and mailbox.company_id != company_id:
            mailbox = None

    provider = "smtp"
    from_email = None
    provider_message_id = None
    ok = False

    if mailbox is not None and mailbox.status == "active":
        provider = mailbox.provider
        from_email = mailbox.email
        try:
            provider_message_id = send_via_mailbox(
                mailbox, to_email=to_email, subject=subject, body=body, db=db
            ) or None
            ok = True
        except Exception:
            ok = False
    else:
        html_body = "<br>".join(html.escape(body).splitlines())
        ok = send_email(to_email, subject, f"<div>{html_body}</div>")

    row = EmailLog(
        company_id=company_id,
        lead_id=lead_id,
        client_id=client_id,
        deal_id=deal_id,
        to_email=to_email,
        from_email=from_email,
        subject=subject,
        body=body,
        status="sent" if ok else "failed",
        direction="outbound",
        provider=provider,
        provider_message_id=provider_message_id,
        sent_by_id=sent_by_id,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row
