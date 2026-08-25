from datetime import datetime, timedelta, timezone
from sqlalchemy import func as sa_func
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.orm import Session, load_only

from app.database import get_db
from app.models.core.user import User
from app.models.core.company import Company
from app.models.sales.lead import Lead
from app.models.sales.client import Client
from app.models.sales.task import Task
from app.models.finance.invoice import Invoice
from app.models.sales.audit import AuditLog
from app.models.core.company_settings import CompanySettings
from app.models.billing import Plan
from app.utils.security import create_access_token, decode_access_token, verify_password

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/platform/auth/login")


def _plan_to_id(plan: str | None) -> int:
    mapping = {"starter": 1, "growth": 2, "pro": 2, "enterprise": 3}
    return mapping.get((plan or "").lower(), 1)


def _require_platform_admin(token: str, db: Session) -> User:
    payload = decode_access_token(token, audience="platform")
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    email = payload.get("sub")
    if not email or not str(email).strip():
        raise HTTPException(status_code=401, detail="Invalid credentials")
    email_norm = str(email).strip().lower()
    user = (
        db.query(User)
        .options(
            load_only(
                User.id,
                User.email,
                User.full_name,
                User.role,
                User.company_id,
                User.status,
                User.is_active,
            )
        )
        .filter(sa_func.lower(User.email) == email_norm)
        .first()
    )
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if user.status == "disabled":
        raise HTTPException(status_code=403, detail="User account is disabled")
    if not (user.role == "admin" and user.company_id is None):
        raise HTTPException(status_code=403, detail="Platform admin access required")
    from app.tenancy import bind_for_user
    bind_for_user(user, db)
    return user


def get_current_platform_admin(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    return _require_platform_admin(token, db)


def _create_platform_audit(db: Session, admin: User, action: str, company_id: int | None = None):
    log = AuditLog(
        company_id=company_id,
        admin_id=admin.id,
        admin_name=admin.full_name,
        action=action,
        entity_type="platform",
    )
    db.add(log)
    db.commit()


@router.post("/auth/login")
def platform_login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = (
        db.query(User)
        .options(
            load_only(
                User.id,
                User.email,
                User.full_name,
                User.hashed_password,
                User.role,
                User.company_id,
                User.status,
                User.is_active,
            )
        )
        .filter(sa_func.lower(User.email) == form_data.username.lower())
        .first()
    )
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    if user.status == "disabled":
        raise HTTPException(status_code=403, detail="User account is disabled")
    if not (user.role == "admin" and user.company_id is None):
        raise HTTPException(
            status_code=403,
            detail=(
                "Not a platform administrator. This login is only for system admins "
                "without a company. Use the main CRM sign-in at /login for your company account."
            ),
        )

    token = create_access_token(data={"sub": user.email, "role": user.role}, audience="platform")
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user.id, "email": user.email, "full_name": user.full_name, "role": user.role},
    }


@router.get("/auth/me")
def platform_me(current_user: User = Depends(get_current_platform_admin)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
    }


@router.get("/metrics/dashboard")
def platform_dashboard_metrics(
    current_user: User = Depends(get_current_platform_admin),
    db: Session = Depends(get_db),
):
    total_companies = db.query(Company).count()
    active_companies = db.query(Company).filter(Company.status == "active").count()
    pending_companies = db.query(Company).filter(Company.status == "pending").count()
    suspended_companies = db.query(Company).filter(Company.status == "suspended").count()

    plans = db.query(Company.plan).all()
    plan_distribution: dict[int, int] = {}
    for (plan,) in plans:
        pid = _plan_to_id(plan)
        plan_distribution[pid] = plan_distribution.get(pid, 0) + 1

    return {
        "companies": {
            "total": total_companies,
            "active": active_companies,
            "pending": pending_companies,
            "suspended": suspended_companies,
        },
        "users": {
            "total": db.query(User).filter(User.company_id.isnot(None)).count(),
            "active": db.query(User).filter(User.company_id.isnot(None), User.is_active == True).count(),
        },
        "business_metrics": {
            "leads": db.query(Lead).count(),
            "clients": db.query(Client).count(),
            "tasks": db.query(Task).count(),
            "invoices": db.query(Invoice).count(),
        },
        "plan_distribution": [{"plan_id": k, "count": v} for k, v in sorted(plan_distribution.items())],
    }


@router.get("/companies")
def list_companies(
    status: str | None = Query(None),
    current_user: User = Depends(get_current_platform_admin),
    db: Session = Depends(get_db),
):
    query = db.query(Company)
    if status:
        query = query.filter(Company.status == status)
    companies = query.order_by(Company.created_at.desc()).all()

    # Pre-fetch user counts in a single query
    user_counts = dict(
        db.query(User.company_id, sa_func.count(User.id))
        .filter(User.company_id.isnot(None))
        .group_by(User.company_id)
        .all()
    )

    return {
        "companies": [
            {
                "id": c.id,
                "name": c.name,
                "status": c.status,
                "plan_id": _plan_to_id(c.plan),
                "user_count": user_counts.get(c.id, 0),
                "requested_at": c.created_at.isoformat() if c.created_at else None,
                "created_at": c.created_at.isoformat() if c.created_at else None,
            }
            for c in companies
        ]
    }


@router.get("/companies/pending")
def list_pending_companies(
    current_user: User = Depends(get_current_platform_admin),
    db: Session = Depends(get_db),
):
    companies = db.query(Company).filter(Company.status == "pending").order_by(Company.created_at.desc()).all()
    return {
        "companies": [
            {
                "id": c.id,
                "name": c.name,
                "status": c.status,
                "plan_id": _plan_to_id(c.plan),
                "requested_at": c.created_at.isoformat() if c.created_at else None,
            }
            for c in companies
        ]
    }


@router.get("/companies/{company_id}")
def get_company_detail(
    company_id: int,
    current_user: User = Depends(get_current_platform_admin),
    db: Session = Depends(get_db),
):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return {
        "id": company.id,
        "name": company.name,
        "status": company.status,
        "plan_id": _plan_to_id(company.plan),
        "created_at": company.created_at.isoformat() if company.created_at else None,
        "approved_at": company.updated_at.isoformat() if company.status == "active" and company.updated_at else None,
        "statistics": {
            "users": db.query(User).filter(User.company_id == company.id).count(),
            "leads": db.query(Lead).filter(Lead.company_id == company.id).count(),
            "clients": db.query(Client).filter(Client.company_id == company.id).count(),
            "tasks": db.query(Task).filter(Task.company_id == company.id).count(),
        },
    }


@router.post("/companies/{company_id}/approve")
def approve_company(
    company_id: int,
    current_user: User = Depends(get_current_platform_admin),
    db: Session = Depends(get_db),
):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    company.status = "active"
    company.updated_at = datetime.now(timezone.utc)
    # Also activate all pending users in this company
    db.query(User).filter(User.company_id == company_id, User.status == "pending").update({"status": "active", "is_active": True})
    
    # Ensure company settings exist
    settings = db.query(CompanySettings).filter(CompanySettings.company_id == company_id).first()
    if not settings:
        settings = CompanySettings(company_id=company_id)
        db.add(settings)
        
    db.commit()
    _create_platform_audit(db, current_user, "company_approved", company_id=company_id)
    return {"message": "Company approved"}


@router.post("/companies/{company_id}/reject")
def reject_company(
    company_id: int,
    reason: str | None = Query(None),
    current_user: User = Depends(get_current_platform_admin),
    db: Session = Depends(get_db),
):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    company.status = "rejected"
    company.updated_at = datetime.now(timezone.utc)
    db.commit()
    _create_platform_audit(db, current_user, f"company_rejected:{reason or 'no_reason'}", company_id=company_id)
    return {"message": "Company rejected"}


@router.patch("/companies/{company_id}/status")
def update_company_status(
    company_id: int,
    new_status: str = Query(...),
    current_user: User = Depends(get_current_platform_admin),
    db: Session = Depends(get_db),
):
    if new_status not in ["active", "pending", "suspended", "rejected"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    company.status = new_status
    company.updated_at = datetime.now(timezone.utc)
    db.commit()
    _create_platform_audit(db, current_user, f"company_status_changed:{new_status}", company_id=company_id)
    return {"message": "Company status updated"}


@router.get("/plans")
def get_plans(current_user: User = Depends(get_current_platform_admin), db: Session = Depends(get_db)):
    plans = db.query(Plan).order_by(Plan.price_monthly).all()
    return {"plans": [
        {"id": p.id, "name": p.name, "price_monthly": float(p.price_monthly), "currency": p.currency,
         "max_users": p.max_users, "max_teams": p.max_teams, "max_storage_gb": p.max_storage_gb,
         "max_api_requests_per_day": p.max_api_requests_per_day,
         "is_active": p.is_active} for p in plans
    ]}


class PlanUpdate(BaseModel):
    price_monthly: float | None = None
    max_users: int | None = None
    max_teams: int | None = None
    max_storage_gb: int | None = None
    max_api_requests_per_day: int | None = None
    is_active: bool | None = None


@router.patch("/plans/{plan_id}")
def update_plan(plan_id: int, body: PlanUpdate,
                current_user: User = Depends(get_current_platform_admin),
                db: Session = Depends(get_db)):
    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(plan, field, value)
    db.commit()
    return {"message": "Plan updated"}


@router.get("/logs")
def get_platform_logs(
    days: int = Query(7, ge=1, le=365),
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(get_current_platform_admin),
    db: Session = Depends(get_db),
):
    since = datetime.now(timezone.utc) - timedelta(days=days)
    logs = (
        db.query(AuditLog)
        .filter(AuditLog.timestamp >= since, AuditLog.entity_type == "platform")
        .order_by(AuditLog.timestamp.desc())
        .limit(limit)
        .all()
    )
    total = db.query(AuditLog).filter(AuditLog.timestamp >= since, AuditLog.entity_type == "platform").count()
    return {
        "logs": [
            {
                "id": log.id,
                "timestamp": log.timestamp.isoformat() if log.timestamp else None,
                "action": log.action,
                "company_id": log.company_id,
                "performed_by": log.admin_name,
                "ip_address": None,
            }
            for log in logs
        ],
        "total": total,
    }
