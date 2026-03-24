"""
Notification Helper
Creates in-app notification records for users.
"""
from sqlalchemy.orm import Session
from app.models.sales.notification import Notification


def send_notification(
    db: Session,
    user_id: int,
    title: str,
    message: str | None = None,
    type: str = "info",
    link: str | None = None
):
    """Insert a notification row for a specific user."""
    notif = Notification(
        user_id=user_id,
        title=title,
        message=message,
        type=type,
        link=link
    )
    db.add(notif)
    # Don't commit here — let the caller commit as part of their transaction


def notify_role_users(
    db: Session,
    company_id: int,
    role: str,
    title: str,
    message: str | None = None,
    type: str = "info",
    link: str | None = None
):
    """Send a notification to all users of a given role within a company."""
    from app.models.core.user import User
    users = db.query(User).filter(
        User.company_id == company_id,
        User.role == role,
        User.is_active == True
    ).all()
    for u in users:
        send_notification(db, u.id, title, message, type, link)


def notify_platform_admins(
    db: Session,
    title: str,
    message: str | None = None,
    type: str = "info",
    link: str | None = None
):
    """Send a notification to all platform administrators (role='admin' and company_id is None)."""
    from app.models.core.user import User
    admins = db.query(User).filter(
        User.role == "admin",
        User.company_id == None,
        User.is_active == True
    ).all()
    for admin in admins:
        send_notification(db, admin.id, title, message, type, link)
