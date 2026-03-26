"""
CSV Import API Endpoints
Provides CSV upload processing for leads and other entities.
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
import csv
import io
import codecs

from app.database import get_db
from app.utils.dependencies import get_current_user, get_active_team_id
from app.models.core.user import User
from app.models.sales.lead import Lead
from app.utils.audit import log_activity

router = APIRouter()

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
        
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Invalid file type. Only CSV files are allowed.")
        
    try:
        # Read file correctly handling the bytes
        contents = await file.read()
        csv_file = io.StringIO(contents.decode('utf-8'))
        reader = csv.DictReader(csv_file)
        
        # Normalize headers to lowercase to handle varying formats (e.g. "Name", "NAME")
        if reader.fieldnames:
            reader.fieldnames = [str(header).strip().lower() for header in reader.fieldnames]
            
        required_fields = ['name']
        if not set(required_fields).issubset(set(reader.fieldnames or [])):
            raise HTTPException(status_code=400, detail="CSV must contain at least a 'name' column.")
            
        leads_to_create = []
        # Team selection: for sales/manager, require active team to avoid ambiguity.
        if current_user.role in ("sales", "manager"):
            if active_team_id is None:
                raise HTTPException(status_code=400, detail="Active team required for CSV import.")
            team_id = active_team_id
        else:
            team_id = active_team_id
        assigned_to_id = current_user.id if current_user.role == "sales" else None
        
        row_count: int = 0
        for row in reader:
            if row_count >= 500:
                break # Limit to 500 records per upload
            
            # Skip empty rows
            name_val = row.get('name', '')
            if not name_val or not str(name_val).strip():
                continue
                
            lead = Lead(
                company_id=current_user.company_id,
                name=str(name_val).strip(),
                email=str(row.get('email', '')).strip() or None,
                phone=str(row.get('phone', '')).strip() or None,
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
        db.commit()
        
        # Log batch creation
        for lead in leads_to_create:
            db.refresh(lead)
            log_activity(db, user=current_user, action='created', entity_type='lead',
                         entity_id=lead.id, entity_name=lead.name)
        db.commit()
        
        return {"message": f"Successfully imported {len(leads_to_create)} leads.", "count": len(leads_to_create)}
        
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Invalid CSV encoding. Please upload a UTF-8 encoded file.")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to process CSV: {str(e)}")
