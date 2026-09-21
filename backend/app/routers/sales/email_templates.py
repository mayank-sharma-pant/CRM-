from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.core.user import User
from app.models.sales.email_template import EmailTemplate
from app.utils.dependencies import apply_company_scope, get_current_user, require_admin_or_md

router = APIRouter()


class EmailTemplateIn(BaseModel):
    name: str
    subject: str
    body: str


class EmailTemplatePatch(BaseModel):
    name: Optional[str] = None
    subject: Optional[str] = None
    body: Optional[str] = None


def _require_company(user: User) -> int:
    if user.company_id is None:
        raise HTTPException(status_code=403, detail="User must belong to a company")
    return user.company_id


def _serialize(row: EmailTemplate) -> dict:
    return {
        "id": row.id,
        "company_id": row.company_id,
        "name": row.name,
        "subject": row.subject,
        "body": row.body,
        "created_by_id": row.created_by_id,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


def _get_template(db: Session, template_id: int, current_user: User) -> EmailTemplate:
    row = (
        apply_company_scope(db.query(EmailTemplate), EmailTemplate, current_user)
        .filter(EmailTemplate.id == template_id)
        .first()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Not found")
    return row


def _clean_text(value: str, field: str, *, max_len: int | None = None) -> str:
    text = (value or "").strip() if field != "body" else (value or "")
    if field == "body":
        if not text.strip():
            raise HTTPException(status_code=400, detail="body is required")
        return text
    if not text:
        raise HTTPException(status_code=400, detail=f"{field} is required")
    if max_len is not None and len(text) > max_len:
        raise HTTPException(status_code=400, detail=f"{field} must be at most {max_len} characters")
    return text


@router.get("")
def list_templates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_company(current_user)
    rows = (
        apply_company_scope(db.query(EmailTemplate), EmailTemplate, current_user)
        .order_by(EmailTemplate.id.desc())
        .all()
    )
    return {"items": [_serialize(r) for r in rows], "total": len(rows)}


@router.post("", status_code=status.HTTP_201_CREATED)
def create_template(
    payload: EmailTemplateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    company_id = _require_company(current_user)
    row = EmailTemplate(
        company_id=company_id,
        name=_clean_text(payload.name, "name", max_len=200),
        subject=_clean_text(payload.subject, "subject", max_len=200),
        body=_clean_text(payload.body, "body"),
        created_by_id=current_user.id,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _serialize(row)


@router.get("/{template_id:int}")
def read_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_company(current_user)
    return _serialize(_get_template(db, template_id, current_user))


@router.patch("/{template_id:int}")
def patch_template(
    template_id: int,
    payload: EmailTemplatePatch,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    _require_company(current_user)
    row = _get_template(db, template_id, current_user)
    data = payload.model_dump(exclude_unset=True)
    if "name" in data:
        row.name = _clean_text(data["name"], "name", max_len=200)
    if "subject" in data:
        row.subject = _clean_text(data["subject"], "subject", max_len=200)
    if "body" in data:
        row.body = _clean_text(data["body"], "body")
    db.commit()
    db.refresh(row)
    return _serialize(row)


@router.delete("/{template_id:int}", status_code=status.HTTP_204_NO_CONTENT)
def delete_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_md),
):
    _require_company(current_user)
    row = _get_template(db, template_id, current_user)
    db.delete(row)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
