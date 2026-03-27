"""
Notifications API
Endpoints for listing, marking read, and creating notifications.
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import List
import json
from pydantic import BaseModel, Field

from app.database import get_db
from app.utils.dependencies import get_current_user
from app.models.core.user import User
from app.models.sales.notification import Notification
from app.utils.notify import NOTIFICATION_CATEGORIES, normalize_notification_category, get_user_muted_notification_categories

router = APIRouter()


class NotificationPreferencesBody(BaseModel):
    muted_categories: List[str] = Field(default_factory=list)


def _preferences_payload(user: User) -> dict:
    muted = sorted(get_user_muted_notification_categories(user))
    return {
        "available_categories": list(NOTIFICATION_CATEGORIES),
        "muted_categories": muted,
        "enabled_categories": [c for c in NOTIFICATION_CATEGORIES if c not in muted],
    }


@router.get("")
def list_notifications(
    unread_only: bool = Query(False),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List notifications for the current user."""
    query = db.query(Notification).filter(Notification.user_id == current_user.id)
    if unread_only:
        query = query.filter(Notification.is_read == False)
    
    unread_count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).count()
    
    total = query.count()
    notifications = query.order_by(Notification.created_at.desc()).offset(skip).limit(limit).all()
    
    return {
        "notifications": [
            {
                "id": n.id,
                "title": n.title,
                "message": n.message,
                "type": n.type,
                "link": n.link,
                "is_read": n.is_read,
                "created_at": n.created_at.isoformat() if n.created_at else None
            }
            for n in notifications
        ],
        "unread_count": unread_count,
        "total": total
    }


@router.get("/preferences")
def get_notification_preferences(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current user's notification preference categories."""
    return _preferences_payload(current_user)


@router.put("/preferences")
def update_notification_preferences(
    body: NotificationPreferencesBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update current user's muted notification categories."""
    normalized = {normalize_notification_category(c) for c in body.muted_categories if c}
    normalized.discard("general")
    current_user.notification_prefs_json = json.dumps({"muted_categories": sorted(normalized)})
    db.commit()
    db.refresh(current_user)
    return _preferences_payload(current_user)


@router.post("/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark a notification as read."""
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    db.commit()
    return {"message": "Marked as read"}


@router.post("/read-all")
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark all notifications as read."""
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).update({"is_read": True})
    db.commit()
    return {"message": "All marked as read"}
