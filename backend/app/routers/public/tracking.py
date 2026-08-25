"""Public open-pixel and click-redirect endpoints (no JWT). Phase 7.1."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import RedirectResponse, Response
from sqlalchemy import func
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


@router.get("/o/{token}.gif")
def track_open(token: str, request: Request, db: Session = Depends(get_db)):
    """Always a GIF, always 200 — an unknown token must not be distinguishable."""
    tracking_limiter.check(request, "track_open", max_attempts=240, window_seconds=60)
    db.query(EmailLog).filter(EmailLog.open_token_hash == hash_token(token)).update(
        {EmailLog.open_count: func.coalesce(EmailLog.open_count, 0) + 1},
        synchronize_session=False,
    )
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
    token_hash = hash_token(token)
    target = decode_target(u)
    if target is None or not verify_target(token_hash, target, s):
        raise HTTPException(status_code=404, detail="not found")

    # One conditional UPDATE: existence check and increment in the same statement,
    # so concurrent clicks on the same link cannot overwrite each other.
    matched = db.query(EmailLog).filter(EmailLog.click_token_hash == token_hash).update(
        {EmailLog.click_count: func.coalesce(EmailLog.click_count, 0) + 1},
        synchronize_session=False,
    )
    db.commit()
    if not matched:
        raise HTTPException(status_code=404, detail="not found")
    return RedirectResponse(target, status_code=302, headers=_NO_STORE)
