from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.core.user import User
from app.services.sales.reminders import run_due_reminders
from app.utils.dependencies import require_admin_or_md

router = APIRouter()


@router.post("/run")
def run_reminders(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    return run_due_reminders(db)
