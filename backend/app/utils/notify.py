"""
Notification Helper
Creates in-app notification records for users.
"""
from sqlalchemy.orm import Session
from app.models.notification import Notification


def send_notification(
    db: Session,
    user_id: int,
    title: str,
    message: str = None,
    type: str = "info",
    link: str = None
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
    message: str = None,
    type: str = "info",
    link: str = None
):
    """Send a notification to all users of a given role within a company."""
    from app.models.user import User
    users = db.query(User).filter(
        User.company_id == company_id,
        User.role == role,
        User.is_active == True
    ).all()
    for u in users:
        send_notification(db, u.id, title, message, type, link)
