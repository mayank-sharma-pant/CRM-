"""
CSV Import API Endpoints
Provides CSV upload processing for leads, clients, deals, and undo.
"""
from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
import csv
import io
import logging
from typing import Optional

from app.database import get_db
from app.utils.dependencies import get_current_user, get_active_team_id
from app.models.core.user import User
from app.models.sales.client import Client
from app.models.sales.deal import Deal
from app.models.sales.lead import Lead
from app.utils.audit import log_activity
from app.utils.helpers import normalize_email, normalize_phone
from app.services.sales.lead_import import new_leads_from_preview, preview_import as preview_leads
from app.services.sales.client_import import new_clients_from_preview, preview_import as preview_clients
from app.services.sales.deal_import import new_deals_from_preview, preview_import as preview_deals
from app.services.sales.import_batch import last_batch, record_batch, serialize_batch, undo_last_batch
from app.services.sales.pipeline_seed import ensure_default_pipeline
from app.models.sales.pipeline import PipelineStage

router = APIRouter()
logger = logging.getLogger("app")
MAX_CSV_BYTES = 2 * 1024 * 1024  # 2 MB hard cap per upload
MAX_IMPORT_ROWS = 500


async def _csv_bytes(file: UploadFile) -> bytes:
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Invalid file type. Only CSV files are allowed.")
    contents = await file.read(MAX_CSV_BYTES + 1)
    if len(contents) > MAX_CSV_BYTES:
        raise HTTPException(status_code=413, detail="CSV file too large. Maximum size is 2 MB.")
    return contents


def _team_for_import(current_user: User, active_team_id: int | None) -> int | None:
    if current_user.role in ("sales", "manager"):
        if active_team_id is None:
            raise HTTPException(status_code=400, detail="Active team required for CSV import.")
        return active_team_id
    return active_team_id


def _commit_response(preview: dict, created_count: int) -> dict:
    counts = preview["counts"]
    return {
        "message": f"Successfully imported {created_count} rows.",
        "count": created_count,
        "created": created_count,
        "skipped_duplicate": counts["duplicate"],
        "skipped_invalid": counts["invalid"],
    }


@router.get("/last")
def get_last_import(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.company_id is None:
        raise HTTPException(status_code=403, detail="User must be assigned to a company")
    return {"batch": serialize_batch(last_batch(db, current_user.company_id))}


@router.post("/undo")
def undo_import(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.company_id is None:
        raise HTTPException(status_code=403, detail="User must be assigned to a company")
    try:
        return undo_last_batch(db, current_user.company_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/leads/preview")
async def preview_leads_import(
    file: UploadFile = File(...),
    mapping: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.company_id is None:
        raise HTTPException(status_code=403, detail="User must be assigned to a company")
    try:
        contents = await _csv_bytes(file)
        return preview_leads(db, current_user.company_id, contents, mapping)
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Invalid CSV encoding. Please upload a UTF-8 encoded file.")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except HTTPException:
        raise
    except Exception:
        logger.exception("CSV import preview failed for user_id=%s", current_user.id)
        raise HTTPException(status_code=500, detail="Failed to process CSV file.")


@router.post("/leads/commit")
async def commit_leads_import(
    file: UploadFile = File(...),
    mapping: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    active_team_id: int | None = Depends(get_active_team_id),
):
    if current_user.company_id is None:
        raise HTTPException(status_code=403, detail="User must be assigned to a company")
    try:
        contents = await _csv_bytes(file)
        preview = preview_leads(db, current_user.company_id, contents, mapping)
        team_id = _team_for_import(current_user, active_team_id)
        assigned_to_id = current_user.id if current_user.role == "sales" else None
        created = []
        for values in new_leads_from_preview(preview):
            lead = Lead(
                company_id=current_user.company_id,
                name=values["name"],
                email=normalize_email(values["email"] or None),
                phone=normalize_phone(values["phone"] or None),
                company=values["company"] or None,
                source=values["source"] or "CSV Import",
                service_type=values["service_type"] or None,
                status="New",
                assigned_to_id=assigned_to_id,
                team_id=team_id,
            )
            created.append(lead)
        if created:
            db.add_all(created)
            db.flush()
            record_batch(
                db,
                company_id=current_user.company_id,
                entity_type="lead",
                entity_ids=[lead.id for lead in created],
                created_by_id=current_user.id,
            )
            db.commit()
            for lead in created:
                db.refresh(lead)
                log_activity(
                    db, user=current_user, action="created", entity_type="lead",
                    entity_id=lead.id, entity_name=lead.name,
                )
            db.commit()
        return _commit_response(preview, len(created))
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Invalid CSV encoding. Please upload a UTF-8 encoded file.")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        logger.exception("CSV import commit failed for user_id=%s", current_user.id)
        raise HTTPException(status_code=500, detail="Failed to process CSV file.")


@router.post("/clients/preview")
async def preview_clients_import(
    file: UploadFile = File(...),
    mapping: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.company_id is None:
        raise HTTPException(status_code=403, detail="User must be assigned to a company")
    try:
        contents = await _csv_bytes(file)
        return preview_clients(db, current_user.company_id, contents, mapping)
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Invalid CSV encoding. Please upload a UTF-8 encoded file.")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except HTTPException:
        raise
    except Exception:
        logger.exception("Client CSV preview failed for user_id=%s", current_user.id)
        raise HTTPException(status_code=500, detail="Failed to process CSV file.")


@router.post("/clients/commit")
async def commit_clients_import(
    file: UploadFile = File(...),
    mapping: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    active_team_id: int | None = Depends(get_active_team_id),
):
    if current_user.company_id is None:
        raise HTTPException(status_code=403, detail="User must be assigned to a company")
    try:
        contents = await _csv_bytes(file)
        preview = preview_clients(db, current_user.company_id, contents, mapping)
        team_id = _team_for_import(current_user, active_team_id)
        assigned_to_id = current_user.id if current_user.role == "sales" else None
        created = []
        for values in new_clients_from_preview(preview):
            row = Client(
                company_id=current_user.company_id,
                name=values["name"],
                email=normalize_email(values["email"] or None),
                phone=normalize_phone(values["phone"] or None),
                company=values["company"] or None,
                address=values["address"] or None,
                gstin=(values["gstin"] or None),
                assigned_to_id=assigned_to_id,
                team_id=team_id,
            )
            created.append(row)
        if created:
            db.add_all(created)
            db.flush()
            record_batch(
                db,
                company_id=current_user.company_id,
                entity_type="client",
                entity_ids=[row.id for row in created],
                created_by_id=current_user.id,
            )
            db.commit()
            for row in created:
                db.refresh(row)
                log_activity(
                    db, user=current_user, action="created", entity_type="client",
                    entity_id=row.id, entity_name=row.name,
                )
            db.commit()
        return _commit_response(preview, len(created))
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Invalid CSV encoding. Please upload a UTF-8 encoded file.")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        logger.exception("Client CSV commit failed for user_id=%s", current_user.id)
        raise HTTPException(status_code=500, detail="Failed to process CSV file.")


@router.post("/deals/preview")
async def preview_deals_import(
    file: UploadFile = File(...),
    mapping: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.company_id is None:
        raise HTTPException(status_code=403, detail="User must be assigned to a company")
    try:
        contents = await _csv_bytes(file)
        return preview_deals(db, current_user.company_id, contents, mapping)
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Invalid CSV encoding. Please upload a UTF-8 encoded file.")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except HTTPException:
        raise
    except Exception:
        logger.exception("Deal CSV preview failed for user_id=%s", current_user.id)
        raise HTTPException(status_code=500, detail="Failed to process CSV file.")


@router.post("/deals/commit")
async def commit_deals_import(
    file: UploadFile = File(...),
    mapping: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    active_team_id: int | None = Depends(get_active_team_id),
):
    if current_user.company_id is None:
        raise HTTPException(status_code=403, detail="User must be assigned to a company")
    try:
        contents = await _csv_bytes(file)
        preview = preview_deals(db, current_user.company_id, contents, mapping)
        pipeline = ensure_default_pipeline(db, current_user.company_id)
        first_stage = (
            db.query(PipelineStage)
            .filter(
                PipelineStage.company_id == current_user.company_id,
                PipelineStage.pipeline_id == pipeline.id,
            )
            .order_by(PipelineStage.position.asc())
            .first()
        )
        if first_stage is None:
            raise HTTPException(status_code=400, detail="Default pipeline has no stages")
        team_id = _team_for_import(current_user, active_team_id)
        assigned_to_id = current_user.id if current_user.role == "sales" else None
        created = []
        for values in new_deals_from_preview(preview):
            close_raw = values.get("expected_close") or ""
            expected_close = None
            if close_raw:
                try:
                    expected_close = date.fromisoformat(str(close_raw)[:10])
                except ValueError:
                    expected_close = None
            deal = Deal(
                company_id=current_user.company_id,
                title=values["title"],
                amount=Decimal(values.get("amount_decimal") or values.get("amount") or "0"),
                pipeline_id=pipeline.id,
                stage_id=first_stage.id,
                client_id=values["client_id"],
                source=values.get("source") or "CSV Import",
                expected_close=expected_close,
                assigned_to_id=assigned_to_id,
                created_by_id=current_user.id,
                team_id=team_id,
            )
            created.append(deal)
        if created:
            db.add_all(created)
            db.flush()
            record_batch(
                db,
                company_id=current_user.company_id,
                entity_type="deal",
                entity_ids=[deal.id for deal in created],
                created_by_id=current_user.id,
            )
            db.commit()
            for deal in created:
                db.refresh(deal)
                log_activity(
                    db, user=current_user, action="created", entity_type="deal",
                    entity_id=deal.id, entity_name=deal.title,
                )
            db.commit()
        return _commit_response(preview, len(created))
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Invalid CSV encoding. Please upload a UTF-8 encoded file.")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        logger.exception("Deal CSV commit failed for user_id=%s", current_user.id)
        raise HTTPException(status_code=500, detail="Failed to process CSV file.")


@router.post("/leads")
async def import_leads(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    active_team_id: int | None = Depends(get_active_team_id),
):
    """Import leads from a CSV file"""
    if current_user.company_id is None:
        raise HTTPException(status_code=403, detail="User must be assigned to a company")
        
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Invalid file type. Only CSV files are allowed.")
        
    try:
        contents = await file.read(MAX_CSV_BYTES + 1)
        if len(contents) > MAX_CSV_BYTES:
            raise HTTPException(status_code=413, detail="CSV file too large. Maximum size is 2 MB.")
        csv_file = io.StringIO(contents.decode('utf-8'))
        reader = csv.DictReader(csv_file)
        
        if reader.fieldnames:
            reader.fieldnames = [str(header).strip().lower() for header in reader.fieldnames]
            
        required_fields = ['name']
        if not set(required_fields).issubset(set(reader.fieldnames or [])):
            raise HTTPException(status_code=400, detail="CSV must contain at least a 'name' column.")
            
        leads_to_create = []
        if current_user.role in ("sales", "manager"):
            if active_team_id is None:
                raise HTTPException(status_code=400, detail="Active team required for CSV import.")
            team_id = active_team_id
        else:
            team_id = active_team_id
        assigned_to_id = current_user.id if current_user.role == "sales" else None
        
        row_count: int = 0
        import_limited = False
        for row in reader:
            if row_count >= MAX_IMPORT_ROWS:
                import_limited = True
                break
            
            name_val = row.get('name', '')
            if not name_val or not str(name_val).strip():
                continue
                
            lead = Lead(
                company_id=current_user.company_id,
                name=str(name_val).strip(),
                email=normalize_email(str(row.get('email', '')).strip() or None),
                phone=normalize_phone(str(row.get('phone', '')).strip() or None),
                company=str(row.get('company', '')).strip() or None,
                source=str(row.get('source', '')).strip() or 'CSV Import',
                service_type=str(row.get('service_type', '')).strip() or None,
                status="New",
                assigned_to_id=assigned_to_id,
                team_id=team_id
            )
            leads_to_create.append(lead)
            row_count = row_count + 1
            
        if not leads_to_create:
            raise HTTPException(status_code=400, detail="No valid data found in CSV.")
            
        db.add_all(leads_to_create)
        db.flush()
        record_batch(
            db,
            company_id=current_user.company_id,
            entity_type="lead",
            entity_ids=[lead.id for lead in leads_to_create],
            created_by_id=current_user.id,
        )
        db.commit()
        
        for lead in leads_to_create:
            db.refresh(lead)
            log_activity(db, user=current_user, action='created', entity_type='lead',
                         entity_id=lead.id, entity_name=lead.name)
        db.commit()
        
        response = {"message": f"Successfully imported {len(leads_to_create)} leads.", "count": len(leads_to_create)}
        if import_limited:
            response["message"] = (
                f"Successfully imported {len(leads_to_create)} leads. "
                f"Import capped at {MAX_IMPORT_ROWS} rows per upload."
            )
            response["import_limited"] = True
            response["max_rows"] = MAX_IMPORT_ROWS
        return response
        
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Invalid CSV encoding. Please upload a UTF-8 encoded file.")
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        logger.exception("CSV import failed for user_id=%s", current_user.id)
        raise HTTPException(status_code=500, detail="Failed to process CSV file.")
