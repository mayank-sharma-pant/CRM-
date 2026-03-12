"""Bug / Issue Report Router.

Allows any authenticated user to submit a bug report with optional
file attachments (images, videos). The report is emailed to the
designated developer address.
"""

from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
import logging

from app.database import get_db
from app.utils.dependencies import get_current_user
from app.models.user import User
from app.utils.email_service import send_email_with_attachments

logger = logging.getLogger("uvicorn.error")

router = APIRouter()

BUG_REPORT_RECIPIENT = "mayanksharmarrk01@gmail.com"

# Max 10 MB per file, max 5 files
MAX_FILE_SIZE = 10 * 1024 * 1024
MAX_FILES = 5


@router.post("")
async def submit_bug_report(
    message: str = Form(..., min_length=10, max_length=5000),
    category: str = Form("Bug"),
    files: Optional[List[UploadFile]] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Submit a bug/issue report with optional file attachments."""

    # Validate files
    attachments = []
    if files:
        if len(files) > MAX_FILES:
            raise HTTPException(status_code=400, detail=f"Maximum {MAX_FILES} files allowed.")

        for f in files:
            if not f.filename:
                continue
            content = await f.read()
            if len(content) > MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=400,
                    detail=f"File '{f.filename}' exceeds 10 MB limit."
                )
            content_type = f.content_type or "application/octet-stream"
            attachments.append((f.filename, content, content_type))

    # Build HTML email
    company_name = ""
    if current_user.company:
        company_name = current_user.company.company_name or ""

    html_body = f"""\
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 24px;">
            <h2 style="color: #dc2626; margin: 0 0 16px;">
                🐛 Bug Report — {category}
            </h2>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr>
                    <td style="padding: 6px 12px; color: #64748b; font-size: 13px; font-weight: 600; width: 120px;">Reporter</td>
                    <td style="padding: 6px 12px; color: #1e293b; font-size: 14px;">{current_user.full_name}</td>
                </tr>
                <tr>
                    <td style="padding: 6px 12px; color: #64748b; font-size: 13px; font-weight: 600;">Email</td>
                    <td style="padding: 6px 12px; color: #1e293b; font-size: 14px;">{current_user.email}</td>
                </tr>
                <tr>
                    <td style="padding: 6px 12px; color: #64748b; font-size: 13px; font-weight: 600;">Role</td>
                    <td style="padding: 6px 12px; color: #1e293b; font-size: 14px;">{current_user.role.title()}</td>
                </tr>
                <tr>
                    <td style="padding: 6px 12px; color: #64748b; font-size: 13px; font-weight: 600;">Company</td>
                    <td style="padding: 6px 12px; color: #1e293b; font-size: 14px;">{company_name or 'Platform Admin'}</td>
                </tr>
                <tr>
                    <td style="padding: 6px 12px; color: #64748b; font-size: 13px; font-weight: 600;">Category</td>
                    <td style="padding: 6px 12px; color: #1e293b; font-size: 14px;">{category}</td>
                </tr>
                <tr>
                    <td style="padding: 6px 12px; color: #64748b; font-size: 13px; font-weight: 600;">Attachments</td>
                    <td style="padding: 6px 12px; color: #1e293b; font-size: 14px;">{len(attachments)} file(s)</td>
                </tr>
            </table>

            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px;">
                <p style="color: #475569; font-size: 13px; font-weight: 600; margin: 0 0 8px;">Description:</p>
                <p style="color: #1e293b; font-size: 14px; margin: 0; white-space: pre-wrap; line-height: 1.6;">{message}</p>
            </div>
        </div>
    </div>
    """

    subject = f"[CRM Bug Report] {category} — from {current_user.full_name}"

    success = send_email_with_attachments(
        to_email=BUG_REPORT_RECIPIENT,
        subject=subject,
        html_content=html_body,
        attachments=attachments if attachments else None,
    )

    if success:
        logger.info("[BUG REPORT] Sent by %s (%s)", current_user.email, category)
        return {"message": "Bug report submitted successfully. Our team will investigate."}
    else:
        logger.warning("[BUG REPORT] Failed to send for %s — SMTP may not be configured", current_user.email)
        raise HTTPException(
            status_code=503,
            detail="Email service is not configured. Please contact your administrator."
        )
