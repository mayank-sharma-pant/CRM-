from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.core.user import User
from app.services.marketplace.service import (
    install_app,
    list_apps,
    list_installs,
    serialize_app,
    serialize_install,
    uninstall_app,
)
from app.utils.dependencies import get_current_user, require_admin_or_md

router = APIRouter()


@router.get("/apps")
def read_apps(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    apps = list_apps(db, current_user.company_id)
    return {"total": len(apps), "apps": apps}


@router.post("/apps/{slug}/install")
def post_install(
    slug: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    row = install_app(db, current_user.company_id, slug, current_user.id)
    return serialize_app(row.app_slug, row.status)


@router.delete("/apps/{slug}")
def delete_install(
    slug: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    row = uninstall_app(db, current_user.company_id, slug)
    return serialize_app(row.app_slug, row.status)


@router.get("/installs")
def read_installs(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    rows = list_installs(db, current_user.company_id)
    return {"total": len(rows), "items": [serialize_install(r) for r in rows]}
