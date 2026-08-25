from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.core.user import User
from app.services.sales.onboarding import dismiss_onboarding, onboarding_status, seed_sample_data
from app.utils.dependencies import get_current_user

router = APIRouter()


def _company_user(user: User) -> int:
    if user.company_id is None:
        raise HTTPException(status_code=403, detail="User must belong to a company")
    return user.company_id


@router.get("/status")
def get_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _company_user(current_user)
    return onboarding_status(db, current_user)


@router.post("/sample-data")
def post_sample(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _company_user(current_user)
    return seed_sample_data(db, current_user)


@router.post("/dismiss")
def post_dismiss(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _company_user(current_user)
    return dismiss_onboarding(db, current_user)
