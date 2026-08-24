from fastapi import APIRouter, Request, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.billing import Subscription, WebhookEvent, Plan
from app.models.core.user import User
from app.models.core.company import Company
from app.services.billing.provider import get_billing_provider
from app.utils.dependencies import require_admin

router = APIRouter(prefix="/api/billing", tags=["Billing"])

_KIND_TO_STATUS = {"activated": "active", "cancelled": "cancelled", "past_due": "past_due"}


@router.post("/webhook")
async def razorpay_webhook(request: Request, db: Session = Depends(get_db)):
    raw = await request.body()
    provider = get_billing_provider()
    try:
        event = provider.verify_and_parse(dict(request.headers), raw)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    if db.query(WebhookEvent).filter(WebhookEvent.event_id == event.event_id).first():
        return {"status": "duplicate"}  # idempotent no-op

    db.add(WebhookEvent(event_id=event.event_id, provider="razorpay"))
    new_status = _KIND_TO_STATUS.get(event.kind)
    if new_status and event.provider_subscription_id:
        sub = db.query(Subscription).filter(
            Subscription.provider_subscription_id == event.provider_subscription_id
        ).first()
        if sub:
            sub.status = new_status
            if new_status == "active":
                sub.current_period_end = event.period_end
                company = db.query(Company).filter(Company.id == sub.company_id).first()
                if company:
                    company.status = "active"
                    company.trial_ends_at = None
    try:
        db.commit()
    except IntegrityError:
        # Lost the race: another delivery of the same event_id committed first
        # between our pre-check and our insert. Treat it as the same idempotent
        # no-op the pre-check duplicate path returns.
        db.rollback()
        return {"status": "duplicate"}
    return {"status": "ok"}


def _load_sub(db, company_id):
    sub = db.query(Subscription).filter(Subscription.company_id == company_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="No subscription for this company")
    return sub


@router.get("/subscription")
def get_subscription(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    from app.services.billing.limits import current_seat_usage

    sub = _load_sub(db, current_user.company_id)
    plan = db.query(Plan).filter(Plan.id == sub.plan_id).one()
    used = current_seat_usage(db, current_user.company_id)
    return {
        "status": sub.status,
        "plan": {"id": plan.id, "name": plan.name, "price_monthly": float(plan.price_monthly)},
        "limits": {"max_users": plan.max_users, "max_teams": plan.max_teams, "max_storage_gb": plan.max_storage_gb},
        "usage": {"users": used},
        "trial_ends_at": sub.trial_ends_at.isoformat() if sub.trial_ends_at else None,
    }


class CheckoutRequest(BaseModel):
    plan_id: int


@router.post("/checkout")
def checkout(body: CheckoutRequest, current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.id == current_user.company_id).one()
    plan = db.query(Plan).filter(Plan.id == body.plan_id, Plan.is_active == True).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    handle = get_billing_provider().create_checkout(company, plan)
    sub = _load_sub(db, current_user.company_id)
    sub.provider_subscription_id = handle.get("subscription_id")
    db.commit()
    return handle


@router.post("/cancel")
def cancel(current_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    sub = _load_sub(db, current_user.company_id)
    get_billing_provider().cancel(sub)
    sub.status = "cancelled"
    db.commit()
    return {"status": "cancelled"}
