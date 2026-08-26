"""Scheduled saved-report email delivery."""
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.models.core.company_settings import CompanySettings
from app.models.core.user import User
from app.models.sales.saved_report import SavedReport
from app.routers.finance.export import build_csv_string
from app.services.sales.report_runner import report_csv_headers_and_rows, run_report
from app.utils.email_service import send_email_with_attachments

ALLOWED_FREQUENCIES = {"daily", "weekly"}


def serialize_report_schedule(row: CompanySettings | None) -> dict:
    if row is None:
        return {
            "enabled": False,
            "frequency": None,
            "saved_report_id": None,
            "last_sent_at": None,
        }
    return {
        "enabled": bool(row.report_schedule_enabled),
        "frequency": row.report_schedule_frequency,
        "saved_report_id": row.report_schedule_saved_report_id,
        "last_sent_at": row.report_schedule_last_sent_at.isoformat() if row.report_schedule_last_sent_at else None,
    }


def apply_report_schedule_update(row: CompanySettings, payload: dict) -> None:
    if "enabled" in payload:
        row.report_schedule_enabled = 1 if payload["enabled"] else 0
    if "frequency" in payload:
        freq = payload["frequency"]
        if freq is not None and freq not in ALLOWED_FREQUENCIES:
            raise ValueError("frequency must be daily or weekly")
        row.report_schedule_frequency = freq
    if "saved_report_id" in payload:
        report_id = payload["saved_report_id"]
        if report_id is not None:
            try:
                report_id = int(report_id)
            except (TypeError, ValueError):
                raise ValueError("saved_report_id must be an integer") from None
        row.report_schedule_saved_report_id = report_id


def _is_due(settings: CompanySettings, now: datetime) -> bool:
    if not settings.report_schedule_enabled:
        return False
    if not settings.report_schedule_saved_report_id:
        return False
    freq = settings.report_schedule_frequency or "weekly"
    last = settings.report_schedule_last_sent_at
    if last is None:
        return True
    if freq == "daily":
        return last.date() < now.date()
    return (now - last) >= timedelta(days=7)


def _enum_val(value):
    return value.value if hasattr(value, "value") else value


def run_scheduled_reports(db: Session, now: datetime | None = None) -> dict:
    now = now or datetime.utcnow()
    sent = 0
    skipped = 0
    errors = 0

    settings_rows = db.query(CompanySettings).filter(CompanySettings.report_schedule_enabled == 1).all()
    for settings in settings_rows:
        if not _is_due(settings, now):
            skipped += 1
            continue
        report = db.query(SavedReport).filter(
            SavedReport.id == settings.report_schedule_saved_report_id,
            SavedReport.company_id == settings.company_id,
        ).first()
        if report is None:
            skipped += 1
            continue
        admin_users = db.query(User).filter(
            User.company_id == settings.company_id,
            User.role.in_(["admin", "md"]),
            User.is_active.is_(True),
        ).all()
        actor = admin_users[0] if admin_users else None
        if actor is None:
            skipped += 1
            continue

        report_type = _enum_val(report.report_type)
        result = run_report(db, actor, report_type, report.filters or {})
        headers, rows = report_csv_headers_and_rows(report_type, result)
        csv_body = build_csv_string(rows, headers).encode("utf-8")
        safe_name = "".join(ch if ch.isalnum() or ch in "-_" else "_" for ch in report.name)[:40] or "report"
        filename = f"{safe_name}.csv"
        subject = f"Scheduled report: {report.name}"
        html = f"<p>Attached CSV export for saved report <strong>{report.name}</strong>.</p>"

        delivered = False
        for user in admin_users:
            if not (user.email or "").strip():
                continue
            ok = send_email_with_attachments(
                user.email,
                subject,
                html,
                attachments=[(filename, csv_body, "text/csv")],
            )
            delivered = delivered or ok
        if delivered:
            settings.report_schedule_last_sent_at = now
            sent += 1
        else:
            errors += 1

    db.commit()
    return {"sent": sent, "skipped": skipped, "errors": errors}
