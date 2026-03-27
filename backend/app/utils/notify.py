"""
Notification helpers.
Creates in-app notification records for users.
"""
from datetime import datetime, timedelta
import json

from sqlalchemy.orm import Session

from app.models.core.user import User
from app.models.sales.notification import Notification

NOTIFICATION_CATEGORIES = (
    "general",
    "tasks",
    "leads",
    "inventory",
    "finance",
    "leave",
    "approvals",
    "admin",
    "ai",
)
_ALLOWED_CATEGORIES = set(NOTIFICATION_CATEGORIES)


def normalize_notification_category(category: str | None) -> str:
    normalized = (category or "general").strip().lower()
    if normalized not in _ALLOWED_CATEGORIES:
        return "general"
    return normalized


def get_user_muted_notification_categories(user: User | None) -> set[str]:
    if user is None:
        return set()
    raw = getattr(user, "notification_prefs_json", None)
    if not raw:
        return set()
    try:
        payload = json.loads(raw)
    except (TypeError, json.JSONDecodeError):
        return set()
    categories = payload.get("muted_categories", [])
    if not isinstance(categories, list):
        return set()
    return {normalize_notification_category(item) for item in categories}


def send_notification(
    db: Session,
    user_id: int,
    title: str,
    message: str | None = None,
    type: str = "info",
    link: str | None = None,
    category: str = "general",
    dedupe_window_seconds: int | None = None,
    dedupe_match_message: bool = True,
    skip_if_unread_duplicate: bool = False,
) -> bool:
    """Insert a notification row for a specific user.

    Returns True when a row is inserted, False when skipped by dedupe rules.
    """
    category = normalize_notification_category(category)
    if dedupe_window_seconds is not None and dedupe_window_seconds < 0:
        dedupe_window_seconds = 0

    recipient = db.query(User).filter(User.id == user_id).first()
    muted_categories = get_user_muted_notification_categories(recipient)
    if category in muted_categories:
        return False

    should_check_duplicates = (dedupe_window_seconds or 0) > 0 or skip_if_unread_duplicate
    if should_check_duplicates:
        # Session autoflush is disabled in tests; flush so pending notifications are visible.
        db.flush()
        dup_query = db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.title == title,
            Notification.type == type,
            Notification.link == link,
        )
        if dedupe_match_message:
            dup_query = dup_query.filter(Notification.message == message)
        if (dedupe_window_seconds or 0) > 0:
            cutoff = datetime.utcnow() - timedelta(seconds=int(dedupe_window_seconds or 0))
            dup_query = dup_query.filter(Notification.created_at >= cutoff)
        if skip_if_unread_duplicate:
            dup_query = dup_query.filter(Notification.is_read == False)
        if dup_query.first():
            return False

    notif = Notification(
        user_id=user_id,
        title=title,
        message=message,
        type=type,
        link=link,
    )
    db.add(notif)
    # Do not commit here; caller controls transaction boundaries.
    return True


def notify_role_users(
    db: Session,
    company_id: int,
    role: str,
    title: str,
    message: str | None = None,
    type: str = "info",
    link: str | None = None,
    category: str = "general",
    dedupe_window_seconds: int | None = None,
    dedupe_match_message: bool = True,
    skip_if_unread_duplicate: bool = False,
) -> None:
    """Send a notification to all active users of a role within a company."""
    from app.models.core.user import User

    users = db.query(User).filter(
        User.company_id == company_id,
        User.role == role,
        User.is_active == True,
    ).all()
    for user in users:
        send_notification(
            db,
            user.id,
            title,
            message,
            type,
            link,
            category=category,
            dedupe_window_seconds=dedupe_window_seconds,
            dedupe_match_message=dedupe_match_message,
            skip_if_unread_duplicate=skip_if_unread_duplicate,
        )


def notify_platform_admins(
    db: Session,
    title: str,
    message: str | None = None,
    type: str = "info",
    link: str | None = None,
    category: str = "general",
    dedupe_window_seconds: int | None = None,
    dedupe_match_message: bool = True,
    skip_if_unread_duplicate: bool = False,
) -> None:
    """Send a notification to all active platform admins."""
    from app.models.core.user import User

    admins = db.query(User).filter(
        User.role == "admin",
        User.company_id == None,
        User.is_active == True,
    ).all()
    for admin in admins:
        send_notification(
            db,
            admin.id,
            title,
            message,
            type,
            link,
            category=category,
            dedupe_window_seconds=dedupe_window_seconds,
            dedupe_match_message=dedupe_match_message,
            skip_if_unread_duplicate=skip_if_unread_duplicate,
        )
