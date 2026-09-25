from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models.core.company_settings import CompanySettings
from app.models.core.enums import DealStageType, LeadStatus, MeetingStatus
from app.models.core.invite import Invite, InviteStatus
from app.models.core.user import User
from app.models.sales.deal import Deal
from app.models.sales.lead import Lead
from app.models.sales.lead_form import LeadForm
from app.models.sales.meeting import Meeting
from app.models.sales.mailbox import MailboxConnection
from app.models.sales.pipeline import PipelineStage
from app.models.sales.quote import Quote
from app.services.sales.pipeline_seed import ensure_default_pipeline

SAMPLE_SOURCE = "Sample"

_SAMPLE_LEADS = (
    ("Sample — Priya Nair", "9876500001", "priya.sample@example.com", "Nair Interiors"),
    ("Sample — Green Homes", "9876500002", "hello@greenhomes.example", "Green Homes"),
    ("Sample — Walk-in kitchen", None, None, None),
)

STEPS = (
    ("sample_data", "Add sample leads (or import your own)"),
    ("import_csv", "Import leads from CSV"),
    ("invite_teammate", "Invite a teammate"),
    ("connect_whatsapp", "Connect WhatsApp"),
    ("connect_email", "Connect Gmail or Outlook"),
    ("create_form", "Create a website lead form"),
    ("send_quote", "Create a quote on a deal"),
)

_SMB_STEP_KEYS = ("sample_data", "import_csv", "invite_teammate", "connect_whatsapp")


def _settings(db: Session, company_id: int) -> CompanySettings:
    row = db.query(CompanySettings).filter(CompanySettings.company_id == company_id).first()
    if row is None:
        row = CompanySettings(company_id=company_id, company_name="Company")
        db.add(row)
        db.flush()
    return row


def _step(key: str, done: bool) -> dict:
    label = next(lbl for k, lbl in STEPS if k == key)
    return {"key": key, "label": label, "done": done}


def onboarding_status(db: Session, user: User) -> dict:
    company_id = user.company_id
    settings = _settings(db, company_id)
    dismissed = bool(getattr(settings, "onboarding_dismissed", 0))
    leads = db.query(Lead).filter(Lead.company_id == company_id, Lead.deleted_at.is_(None)).all()
    has_leads = len(leads) > 0
    has_import = any((row.source or "") == "CSV Import" for row in leads)
    mailbox = (
        db.query(MailboxConnection)
        .filter(
            MailboxConnection.company_id == company_id,
            MailboxConnection.user_id == user.id,
            MailboxConnection.status == "active",
        )
        .first()
    )
    has_form = db.query(LeadForm).filter(LeadForm.company_id == company_id).first() is not None
    has_quote = db.query(Quote).filter(Quote.company_id == company_id).first() is not None
    active_users = (
        db.query(User)
        .filter(User.company_id == company_id, User.is_active.is_(True))
        .count()
    )
    pending_invite = (
        db.query(Invite)
        .filter(Invite.company_id == company_id, Invite.status == InviteStatus.PENDING)
        .first()
        is not None
    )
    invite_teammate_done = active_users >= 2 or pending_invite
    wa_key = getattr(settings, "whatsapp_api_key", None)
    wa_source = getattr(settings, "whatsapp_source", None)
    connect_whatsapp_done = bool(wa_key and wa_source)
    steps = [
        _step("sample_data", has_leads),
        _step("import_csv", has_import),
        _step("invite_teammate", invite_teammate_done),
        _step("connect_whatsapp", connect_whatsapp_done),
        _step("connect_email", mailbox is not None),
        _step("create_form", has_form),
        _step("send_quote", has_quote),
    ]
    smb_done = all(next(s["done"] for s in steps if s["key"] == key) for key in _SMB_STEP_KEYS)
    all_done = smb_done
    return {
        "dismissed": dismissed,
        "complete": dismissed or all_done,
        "steps": steps,
        "lead_count": len(leads),
    }


def seed_sample_data(db: Session, user: User) -> dict:
    company_id = user.company_id
    existing = (
        db.query(Lead)
        .filter(Lead.company_id == company_id, Lead.source == SAMPLE_SOURCE, Lead.deleted_at.is_(None))
        .count()
    )
    if existing:
        return {"leads_created": 0, "deals_created": 0, "ok": True}
    pipeline = ensure_default_pipeline(db, company_id)
    stage = (
        db.query(PipelineStage)
        .filter(
            PipelineStage.pipeline_id == pipeline.id,
            PipelineStage.stage_type == DealStageType.OPEN,
        )
        .order_by(PipelineStage.position.asc())
        .first()
    )
    created_leads = []
    for index, (name, phone, email, company) in enumerate(_SAMPLE_LEADS):
        lead = Lead(
            company_id=company_id,
            name=name,
            phone=phone,
            email=email,
            company=company,
            source=SAMPLE_SOURCE,
            status=LeadStatus.NEW,
            assigned_to_id=None if index == len(_SAMPLE_LEADS) - 1 else user.id,
            created_by_id=user.id,
        )
        db.add(lead)
        created_leads.append(lead)
    db.flush()
    db.add(
        Meeting(
            company_id=company_id,
            subject="Site visit — kitchen measure",
            starts_at=datetime.now(timezone.utc) + timedelta(days=3),
            status=MeetingStatus.SCHEDULED,
            lead_id=created_leads[0].id,
            created_by_id=user.id,
        )
    )
    deals_created = 0
    if stage is not None and created_leads:
        db.add(
            Deal(
                company_id=company_id,
                title="Kitchen remodel — Sample",
                amount=85000,
                currency="INR",
                pipeline_id=pipeline.id,
                stage_id=stage.id,
                lead_id=created_leads[0].id,
                assigned_to_id=user.id,
                created_by_id=user.id,
                source=SAMPLE_SOURCE,
            )
        )
        deals_created = 1
    db.commit()
    return {"leads_created": len(created_leads), "deals_created": deals_created, "ok": True}


def dismiss_onboarding(db: Session, user: User) -> dict:
    settings = _settings(db, user.company_id)
    settings.onboarding_dismissed = 1
    db.commit()
    return {"dismissed": True}
