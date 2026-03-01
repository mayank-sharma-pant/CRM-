"""Centralized email delivery via SMTP.

Usage:
    from app.utils.email_service import send_email, send_otp_email, send_invite_email

All functions fail gracefully — they log errors but never crash the request.
"""

import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional

from app.config import settings

logger = logging.getLogger("uvicorn.error")


def _is_configured() -> bool:
    """Check if SMTP settings are present."""
    return bool(settings.SMTP_HOST and settings.SMTP_PORT and settings.SMTP_USER and settings.SMTP_PASSWORD)


def send_email(to_email: str, subject: str, html_content: str) -> bool:
    """Send an email via SMTP. Returns True on success, False on failure.

    Never raises — logs errors and returns False so the calling endpoint
    continues normally.
    """
    if not _is_configured():
        logger.warning("[EMAIL] SMTP not configured — skipping email to %s", to_email)
        return False

    from_email = settings.SMTP_FROM_EMAIL or settings.SMTP_USER

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = from_email
    msg["To"] = to_email
    msg.attach(MIMEText(html_content, "html"))

    try:
        if settings.SMTP_TLS:
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)
            server.ehlo()
            server.starttls()
            server.ehlo()
        else:
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)

        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.sendmail(from_email, to_email, msg.as_string())
        server.quit()
        logger.info("[EMAIL] Sent '%s' to %s", subject, to_email)
        return True
    except Exception as exc:
        logger.error("[EMAIL] Failed to send to %s: %s", to_email, str(exc))
        return False


# ──────────────────────────────────────
# Pre-built email templates
# ──────────────────────────────────────

def send_otp_email(to_email: str, otp_code: str, expiry_minutes: int) -> bool:
    """Send a login OTP code via email."""
    subject = "Your Login Verification Code"
    html = f"""\
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <div style="background: #f8fafc; border-radius: 12px; padding: 32px; text-align: center; border: 1px solid #e2e8f0;">
            <h2 style="color: #1e293b; margin: 0 0 8px;">Verification Code</h2>
            <p style="color: #64748b; font-size: 14px; margin: 0 0 24px;">Use the code below to sign in to your CRM account.</p>
            <div style="background: #ffffff; border: 2px dashed #3b82f6; border-radius: 8px; padding: 16px; margin: 0 0 24px;">
                <span style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #1e293b;">{otp_code}</span>
            </div>
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                This code expires in <strong>{expiry_minutes} minutes</strong>.<br>
                If you didn't request this, you can safely ignore this email.
            </p>
        </div>
    </div>
    """
    return send_email(to_email, subject, html)


def send_invite_email(
    to_email: str,
    full_name: str,
    company_name: str,
    role: str,
    token: str,
    frontend_url: Optional[str] = None,
) -> bool:
    """Send a team invite email with the accept link."""
    base_url = (frontend_url or settings.FRONTEND_URL).rstrip("/")
    invite_link = f"{base_url}/accept-invite/{token}"

    subject = f"You're invited to join {company_name}"
    html = f"""\
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px;">
        <div style="background: #f8fafc; border-radius: 12px; padding: 32px; border: 1px solid #e2e8f0;">
            <h2 style="color: #1e293b; margin: 0 0 8px;">You're Invited!</h2>
            <p style="color: #475569; font-size: 15px; margin: 0 0 24px;">
                Hi {full_name},<br><br>
                You've been invited to join <strong>{company_name}</strong> as a <strong>{role.title()}</strong>.
            </p>
            <div style="text-align: center; margin: 24px 0;">
                <a href="{invite_link}"
                   style="display: inline-block; background: #3b82f6; color: #ffffff; text-decoration: none;
                          font-weight: 600; font-size: 14px; padding: 12px 32px; border-radius: 8px;">
                    Accept Invitation
                </a>
            </div>
            <p style="color: #94a3b8; font-size: 12px; margin: 24px 0 0; text-align: center;">
                This invitation expires in 7 days.<br>
                If you didn't expect this, you can safely ignore this email.
            </p>
        </div>
    </div>
    """
    return send_email(to_email, subject, html)
