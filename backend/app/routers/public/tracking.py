"""Public open-pixel and click-redirect endpoints (no JWT). Phase 7.1."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import RedirectResponse, Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.sales.email_log import EmailLog
from app.services.sales.email_tracking import (
    TRANSPARENT_GIF,
    decode_target,
    hash_token,
    verify_target,
)
from app.utils.rate_limit import tracking_limiter

router = APIRouter()

_NO_STORE = {
    "Cache-Control": "no-store, no-cache, must-revalidate, private",
    "Pragma": "no-cache",
}


def _by_open_token(db: Session, token: str) -> Optional[EmailLog]:
    return db.query(EmailLog).filter(EmailLog.open_token_hash == hash_token(token)).first()


def _by_click_token(db: Session, token: str) -> Optional[EmailLog]:
    return db.query(EmailLog).filter(EmailLog.click_token_hash == hash_token(token)).first()


@router.get("/o/{token}.gif")
def track_open(token: str, request: Request, db: Session = Depends(get_db)):
    """Always a GIF, always 200 — an unknown token must not be distinguishable."""
    tracking_limiter.check(request, "track_open", max_attempts=240, window_seconds=60)
    row = _by_open_token(db, token)
    if row is not None:
        row.open_count = int(row.open_count or 0) + 1
        db.commit()
    return Response(content=TRANSPARENT_GIF, media_type="image/gif", headers=_NO_STORE)


@router.get("/c/{token}")
def track_click(
    token: str,
    request: Request,
    u: Optional[str] = Query(None),
    s: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    tracking_limiter.check(request, "track_click", max_attempts=240, window_seconds=60)
    row = _by_click_token(db, token)
    target = decode_target(u)
    if row is None or target is None or not verify_target(row.click_token_hash, target, s):
        raise HTTPException(status_code=404, detail="not found")
    row.click_count = int(row.click_count or 0) + 1
    db.commit()
    return RedirectResponse(target, status_code=302, headers=_NO_STORE)
