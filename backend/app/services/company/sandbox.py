"""Sandbox tenant create / status / destroy."""

from __future__ import annotations

import logging
import secrets

from sqlalchemy.orm import Session

from app.models.billing import Plan, Subscription
from app.models.core.company import Company
from app.models.core.enums import CompanyStatus, UserStatus
from app.models.core.user import User
from app.services.sales.lead_form_seed import ensure_default_lead_form
from app.services.sales.pipeline_seed import ensure_default_pipeline
from app.services.sales.workflow import ensure_default_workflow_rules
from app.utils.helpers import generate_company_code
from app.utils.security import get_password_hash

logger = logging.getLogger(__name__)


def find_active_sandbox(db: Session, parent_id: int) -> Company | None:
    return (
        db.query(Company)
        .filter(
            Company.sandbox_parent_id == parent_id,
            Company.is_sandbox.is_(True),
            Company.status != CompanyStatus.SUSPENDED,
        )
        .first()
    )


def _admin_email_for(parent_id: int) -> str:
    return f"sandbox.{parent_id}.{secrets.token_hex(4)}@sandbox.local"


def create_sandbox(db: Session, *, parent: Company) -> tuple[Company, User, str]:
    if parent.is_sandbox:
        raise ValueError("cannot create sandbox from a sandbox")
    if find_active_sandbox(db, parent.id) is not None:
        raise ValueError("sandbox already exists")

    sandbox = Company(
        name=f"{parent.name} (Sandbox)",
        company_code=generate_company_code(db),
        status=CompanyStatus.ACTIVE,
        is_sandbox=True,
        sandbox_parent_id=parent.id,
    )
    db.add(sandbox)
    db.flush()

    raw_password = secrets.token_urlsafe(12)
    admin = User(
        email=_admin_email_for(parent.id),
        full_name=f"{parent.name} Sandbox Admin",
        hashed_password=get_password_hash(raw_password),
        role="admin",
        company_id=sandbox.id,
        status=UserStatus.ACTIVE,
        is_active=True,
        employee_num=1,
    )
    db.add(admin)

    starter = db.query(Plan).filter(Plan.name == "Starter").first()
    if starter:
        db.add(
            Subscription(
                company_id=sandbox.id,
                plan_id=starter.id,
                provider="none",
                status="active",
            )
        )

    db.commit()
    db.refresh(sandbox)
    db.refresh(admin)

    try:
        ensure_default_pipeline(db, sandbox.id)
    except Exception:
        logger.exception("Default pipeline seed failed for sandbox company_id=%s", sandbox.id)
    try:
        ensure_default_lead_form(db, sandbox.id)
        ensure_default_workflow_rules(db, sandbox.id)
        db.commit()
    except Exception:
        logger.exception("Default form/workflow seed failed for sandbox company_id=%s", sandbox.id)

    return sandbox, admin, raw_password


def destroy_sandbox(db: Session, *, sandbox: Company) -> None:
    if not sandbox.is_sandbox:
        raise ValueError("not a sandbox company")

    users = db.query(User).filter(User.company_id == sandbox.id).all()
    for user in users:
        user.status = UserStatus.DISABLED
        user.is_active = False

    sandbox.status = CompanyStatus.SUSPENDED
    sandbox.sandbox_parent_id = None
    db.commit()


def _sandbox_brief(db: Session, sandbox: Company) -> dict:
    admin = (
        db.query(User)
        .filter(User.company_id == sandbox.id, User.role == "admin")
        .order_by(User.id.asc())
        .first()
    )
    return {
        "id": sandbox.id,
        "name": sandbox.name,
        "company_code": sandbox.company_code,
        "status": sandbox.status.value if hasattr(sandbox.status, "value") else sandbox.status,
        "admin_email": admin.email if admin else None,
    }


def sandbox_status_payload(db: Session, *, company: Company) -> dict:
    if company.is_sandbox:
        parent = db.query(Company).filter(Company.id == company.sandbox_parent_id).first() if company.sandbox_parent_id else None
        # After destroy, parent_id is cleared; still report self as sandbox.
        return {
            "is_sandbox": True,
            "parent_company_id": parent.id if parent else company.sandbox_parent_id,
            "parent_name": parent.name if parent else None,
            "sandbox": _sandbox_brief(db, company),
        }

    child = find_active_sandbox(db, company.id)
    return {
        "is_sandbox": False,
        "sandbox": _sandbox_brief(db, child) if child else None,
    }
