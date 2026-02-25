"""
Audit logging helper.
Use log_activity() to record actions on any entity.
"""
from app.models.audit import AuditLog


def log_activity(db, *, user, action, entity_type, entity_id, entity_name=None, before=None, after=None):
    """
    Record an audit log entry.
    
    Args:
        db: Database session
        user: Current user object
        action: Action string (e.g., 'created', 'updated', 'status_changed', 'deleted')
        entity_type: Entity type (e.g., 'lead', 'client', 'task', 'invoice')
        entity_id: Entity ID
        entity_name: Human-readable entity name
        before: Previous value (for updates)
        after: New value (for updates)
    """
    entry = AuditLog(
        company_id=getattr(user, 'company_id', None),
        admin_id=user.id,
        admin_name=user.full_name or user.email,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id),
        entity_name=entity_name,
        before_value=before,
        after_value=after
    )
    db.add(entry)
    # Don't commit here — let the caller manage the transaction
    return entry
