from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.sales.marketplace import MarketplaceInstall
from app.services.marketplace.catalog import CATALOG, get_app


def _now():
    return datetime.now(timezone.utc)


def serialize_app(slug: str, status: str) -> dict:
    app = CATALOG[slug]
    return {**app, "status": status}


def serialize_install(row: MarketplaceInstall) -> dict:
    return {
        "id": row.id,
        "app_slug": row.app_slug,
        "status": row.status,
        "installed_at": row.installed_at.isoformat() if row.installed_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }


def _row(db: Session, company_id: int, slug: str) -> MarketplaceInstall | None:
    return (
        db.query(MarketplaceInstall)
        .filter(
            MarketplaceInstall.company_id == company_id,
            MarketplaceInstall.app_slug == slug,
        )
        .first()
    )


def list_apps(db: Session, company_id: int) -> list[dict]:
    rows = {
        r.app_slug: r
        for r in db.query(MarketplaceInstall).filter(
            MarketplaceInstall.company_id == company_id
        ).all()
    }
    out = []
    for slug in CATALOG:
        row = rows.get(slug)
        status = row.status if row is not None else "not_installed"
        out.append(serialize_app(slug, status))
    return out


def list_installs(db: Session, company_id: int) -> list[MarketplaceInstall]:
    return (
        db.query(MarketplaceInstall)
        .filter(MarketplaceInstall.company_id == company_id)
        .order_by(MarketplaceInstall.id.asc())
        .all()
    )


def install_app(db: Session, company_id: int, slug: str, installed_by_id: int | None):
    if get_app(slug) is None:
        raise HTTPException(status_code=400, detail="Unknown app")
    row = _row(db, company_id, slug)
    now = _now()
    if row is None:
        row = MarketplaceInstall(
            company_id=company_id,
            app_slug=slug,
            status="installed",
            installed_by_id=installed_by_id,
            installed_at=now,
            updated_at=now,
        )
        db.add(row)
    else:
        row.status = "installed"
        row.installed_by_id = installed_by_id
        row.installed_at = now
        row.updated_at = now
    db.commit()
    db.refresh(row)
    return row


def uninstall_app(db: Session, company_id: int, slug: str) -> MarketplaceInstall:
    if get_app(slug) is None:
        raise HTTPException(status_code=404, detail="App not found")
    row = _row(db, company_id, slug)
    if row is None or row.status != "installed":
        raise HTTPException(status_code=404, detail="App not found")
    row.status = "uninstalled"
    row.updated_at = _now()
    db.commit()
    db.refresh(row)
    return row
