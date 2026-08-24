from sqlalchemy.orm import Session

from app.models.sales.deal import Deal
from app.models.ops.document import Document
from app.models.sales.custom_field import CustomFieldValue
from app.models.sales.email_log import EmailLog
from app.models.sales.follow_up import FollowUp
from app.models.sales.lead import Lead
from app.models.sales.note import Note
from app.models.sales.tag import LeadTag
from app.models.sales.task import Task
from app.services.sales.recycle import soft_delete_lead
from app.utils.helpers import normalize_email, normalize_phone


def find_duplicate_leads(db: Session, company_id: int, lead: Lead) -> list[Lead]:
    email = normalize_email(lead.email)
    phone = normalize_phone(lead.phone)
    if not email and not phone:
        return []
    q = db.query(Lead).filter(
        Lead.company_id == company_id,
        Lead.id != lead.id,
        Lead.deleted_at.is_(None),
    )
    clauses = []
    if email:
        clauses.append(Lead.email.ilike(email))
    if phone:
        clauses.append(Lead.phone == phone)
    from sqlalchemy import or_
    return q.filter(or_(*clauses)).order_by(Lead.id).all()


def merge_leads(db: Session, keep: Lead, source: Lead) -> Lead:
    for model, col in (
        (Note, Note.lead_id),
        (Task, Task.lead_id),
        (FollowUp, FollowUp.lead_id),
        (EmailLog, EmailLog.lead_id),
        (Deal, Deal.lead_id),
        (Document, Document.lead_id),
    ):
        db.query(model).filter(col == source.id).update({"lead_id": keep.id}, synchronize_session=False)

    source_values = db.query(CustomFieldValue).filter(
        CustomFieldValue.entity_id == source.id,
        CustomFieldValue.company_id == keep.company_id,
    ).all()
    keep_keys = {
        v.field_def_id
        for v in db.query(CustomFieldValue).filter(
            CustomFieldValue.entity_id == keep.id,
            CustomFieldValue.company_id == keep.company_id,
        ).all()
    }
    for val in source_values:
        if val.field_def_id in keep_keys:
            db.delete(val)
        else:
            val.entity_id = keep.id

    keep_tag_ids = {
        row.tag_id for row in db.query(LeadTag).filter(LeadTag.lead_id == keep.id).all()
    }
    for row in db.query(LeadTag).filter(LeadTag.lead_id == source.id).all():
        if row.tag_id in keep_tag_ids:
            db.delete(row)
        else:
            row.lead_id = keep.id
            keep_tag_ids.add(row.tag_id)

    if not (keep.email or "").strip() and source.email:
        keep.email = source.email
    if not (keep.phone or "").strip() and source.phone:
        keep.phone = source.phone
    if not (keep.company or "").strip() and source.company:
        keep.company = source.company
    if not (keep.notes or "").strip() and source.notes:
        keep.notes = source.notes

    soft_delete_lead(source)
    db.flush()
    return keep
