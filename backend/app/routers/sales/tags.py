from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.core.user import User
from app.services.sales.tags import list_company_tags
from app.utils.dependencies import get_current_user

router = APIRouter()


@router.get("")
def list_tags(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.company_id is None:
        raise HTTPException(status_code=403, detail="User must belong to a company")
    rows = list_company_tags(db, current_user.company_id)
    return {"items": [{"id": t.id, "name": t.name} for t in rows], "total": len(rows)}
