from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.core.user import User
from app.models.finance.accounting import AccountingConnection, AccountingSyncItem
from app.services.accounting.service import (
    AccountingNotConnected,
    connect,
    disconnect,
    get_connection,
    sync_all,
)
from app.utils.dependencies import apply_company_scope, require_admin_or_md

router = APIRouter()


class ConnectIn(BaseModel):
    provider: str


def _iso(value: Optional[datetime]) -> Optional[str]:
    return value.isoformat() if value else None


def _connection_out(row: AccountingConnection | None) -> dict:
    if row is None:
        return {
            "provider": None,
            "status": "disconnected",
            "connected_at": None,
            "last_sync_at": None,
            "last_error": None,
        }
    return {
        "provider": row.provider,
        "status": row.status,
        "connected_at": _iso(row.connected_at),
        "last_sync_at": _iso(row.last_sync_at),
        "last_error": row.last_error,
    }


@router.get("/connection")
def read_connection(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    return _connection_out(get_connection(db, current_user.company_id))


@router.put("/connection")
def put_connection(
    payload: ConnectIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    try:
        row = connect(db, current_user.company_id, payload.provider)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return _connection_out(row)


@router.delete("/connection")
def delete_connection(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    return _connection_out(disconnect(db, current_user.company_id))


@router.post("/sync")
def bulk_sync(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    try:
        return sync_all(db, current_user.company_id)
    except AccountingNotConnected as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/items")
def list_items(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    rows = (
        apply_company_scope(db.query(AccountingSyncItem), AccountingSyncItem, current_user)
        .order_by(AccountingSyncItem.id.desc())
        .all()
    )
    return {
        "items": [
            {
                "invoice_id": r.entity_id,
                "provider": r.provider,
                "external_id": r.external_id,
                "status": r.status,
                "last_synced_at": _iso(r.last_synced_at),
            }
            for r in rows
        ]
    }
