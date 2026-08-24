from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.core.team_membership import TeamMembership
from app.models.core.user import User
from app.models.sales.lead import Lead
from app.models.sales.quote import Quote
from app.models.sales.task import Task
from app.models.sales.workflow_rule import WorkflowRule
from app.utils.notify import send_notification, notify_role_users

DEFAULT_RULES = (
    ("lead_created", "assign_round_robin"),
    ("lead_created", "create_task"),
    ("stage_changed", "notify"),
    ("quote_accepted", "notify"),
)


def ensure_default_workflow_rules(db: Session, company_id: int) -> None:
    existing = db.query(WorkflowRule).filter(WorkflowRule.company_id == company_id).count()
    if existing:
        return
    for trigger, action in DEFAULT_RULES:
        db.add(WorkflowRule(company_id=company_id, trigger=trigger, action=action, is_active=True))
    db.flush()


def run_workflows(db: Session, trigger: str, *, lead: Lead | None = None, quote: Quote | None = None) -> None:
    company_id = None
    if lead is not None:
        company_id = lead.company_id
    elif quote is not None:
        company_id = quote.company_id
    if company_id is None:
        return
    ensure_default_workflow_rules(db, company_id)
    rules = (
        db.query(WorkflowRule)
        .filter(
            WorkflowRule.company_id == company_id,
            WorkflowRule.trigger == trigger,
            WorkflowRule.is_active == True,
        )
        .order_by(WorkflowRule.id.asc())
        .all()
    )
    for rule in rules:
        if rule.action == "assign_round_robin" and lead is not None:
            _assign_round_robin(db, lead)
        elif rule.action == "create_task" and lead is not None:
            _create_follow_up_task(db, lead)
        elif rule.action == "notify":
            _notify(db, lead=lead, quote=quote)


def _assign_round_robin(db: Session, lead: Lead) -> None:
    if lead.assigned_to_id:
        return
    query = db.query(User).filter(
        User.company_id == lead.company_id,
        User.role == "sales",
        User.is_active == True,
    )
    if lead.team_id is not None:
        query = query.join(TeamMembership, TeamMembership.user_id == User.id).filter(
            TeamMembership.team_id == lead.team_id,
            TeamMembership.company_id == lead.company_id,
        )
    candidates = query.all()
    if not candidates:
        return
    ranked = []
    for user in candidates:
        load = (
            db.query(func.count(Lead.id))
            .filter(Lead.company_id == lead.company_id, Lead.assigned_to_id == user.id)
            .scalar()
        )
        ranked.append((load, user.id, user))
    ranked.sort()
    lead.assigned_to_id = ranked[0][2].id


def _create_follow_up_task(db: Session, lead: Lead) -> None:
    db.add(
        Task(
            company_id=lead.company_id,
            title=f"Follow up: {lead.name}",
            lead_id=lead.id,
            assigned_to_id=lead.assigned_to_id,
        )
    )


def _notify(db: Session, *, lead: Lead | None, quote: Quote | None) -> None:
    if quote is not None:
        notify_role_users(
            db,
            quote.company_id,
            "admin",
            "Quote accepted",
            f"Quote {quote.quote_number} was accepted.",
            category="finance",
        )
        return
    if lead is not None and lead.assigned_to_id:
        send_notification(
            db,
            lead.assigned_to_id,
            f"Lead updated: {lead.name}",
            f"{lead.name} moved to {getattr(lead.status, 'value', lead.status)}.",
            category="leads",
        )
