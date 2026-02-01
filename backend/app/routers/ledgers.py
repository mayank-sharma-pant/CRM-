from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.utils.auth import get_current_user
from app.models.user import User
from app.models.ledger import LedgerEntry
from app.database import get_db
import json

router = APIRouter(
    prefix="/api/ledgers",
    tags=["ledgers"]
)

# =================================================================
# LEDGER PERMISSION CONFIGURATION
# Sources of Truth for Role Access
# =================================================================

# Define all available ledgers
ALL_LEDGERS = {
    "stock_register": "Stock Register",
    "payments_made": "Payments Made",
    "payments_received": "Payments Received",
    "daily_expenses": "Daily Expenses",
    "cash_bank_balance": "Cash & Bank Balance",
    "pdc_given": "PDC Cheque Given",
    "pdc_received": "PDC Cheque Received",
    "account_transfer_purchase": "Account Transfer Purchase",
    "account_transfer_sales": "Account Transfer Sales"
}

# Role Access Matrix
# Format: "role": { "ledger_key": "edit" | "view" | None }
ROLE_PERMISSIONS = {
    "sales": {
        "payments_received": "edit",
        "daily_expenses": "edit",
        "pdc_given": "view",
        "pdc_received": "view",
        # Others are implicitly None (Hidden)
    },
    "team_lead": {
        "stock_register": "view",
        "payments_received": "edit",
        "daily_expenses": "edit",
        "pdc_given": "edit",
        "pdc_received": "edit",
        # Others are implicitly None (Hidden)
    },
    "manager": {
        "stock_register": "view",
        "payments_made": "edit",
        "payments_received": "edit",
        "daily_expenses": "edit",
        "cash_bank_balance": "view",
        "pdc_given": "edit",
        "pdc_received": "edit",
        "account_transfer_purchase": "edit",
        "account_transfer_sales": "edit",
    },
    "md": {
        # MD has view access to EVERYTHING
        "stock_register": "view",
        "payments_made": "view",
        "payments_received": "view",
        "daily_expenses": "view",
        "cash_bank_balance": "view",
        "pdc_given": "view",
        "pdc_received": "view",
        "account_transfer_purchase": "view",
        "account_transfer_sales": "view",
    },
    "purchase": {
        "stock_register": "edit",
        "payments_made": "edit",
        "payments_received": "view",
        "daily_expenses": "view",
        "pdc_given": "edit",
        "pdc_received": "view",
        "account_transfer_purchase": "edit",
    },
    # Admin is not part of frontend ledger access usually, but if they need it, define here.
    "admin": {} 
}

# =================================================================
# SCHEMAS
# =================================================================

class LedgerMetadata(BaseModel):
    slug: str
    name: str
    can_view: bool
    can_edit: bool

class LedgerDataResponse(BaseModel):
    ledger: str
    ledger_name: str
    can_view: bool
    can_edit: bool
    columns: List[Any]
    rows: List[Dict[str, Any]]

class LedgerEntryCreate(BaseModel):
    data: Dict[str, Any]

class LedgerEntryUpdate(BaseModel):
    data: Dict[str, Any]

class LedgerEntryResponse(BaseModel):
    id: int
    data: Dict[str, Any]
    
    class Config:
        from_attributes = True

# =================================================================
# HELPERS
# =================================================================

def get_user_ledger_permissions(role: str) -> Dict[str, str]:
    """Returns a dict of ledger_slug -> permission_level ('view' or 'edit')"""
    return ROLE_PERMISSIONS.get(role, {})

def get_ledger_columns(ledger_slug: str) -> List[Dict[str, Any]]:
    """Returns column definitions for specific ledgers"""
    # Define columns metadata using the generic structure from mock data
    # This ensures functionality matches frontend expectations
    
    if "stock_register" == ledger_slug:
        return [
            {"key": "date", "label": "Date", "width": "120px", "type": "date"},
            {"key": "product", "label": "Product", "width": "200px", "autoFocus": True},
            {"key": "category", "label": "Category", "width": "150px"},
            {"key": "brand", "label": "Brand", "width": "150px"},
            {"key": "qty_in", "label": "Qty In", "width": "100px", "type": "number", "className": "text-green-600 font-medium"},
            {"key": "qty_out", "label": "Qty Out", "width": "100px", "type": "number", "className": "text-red-500 font-medium"},
            {"key": "purchase_rate", "label": "Pur. Rate", "width": "120px", "type": "number", "format": "currency"},
            {"key": "sale_rate", "label": "Sale Rate", "width": "120px", "type": "number", "format": "currency"},
            {"key": "remarks", "label": "Remarks", "width": "200px"}
        ]
    elif "payments_made" == ledger_slug:
        return [
            {"key": "date", "label": "Date", "width": "120px", "type": "date"},
            {"key": "party_name", "label": "Party Name", "width": "200px", "autoFocus": True},
            {"key": "mode", "label": "Mode", "width": "120px"},
            {"key": "reference", "label": "Reference / UTR", "width": "150px"},
            {"key": "amount", "label": "Amount", "width": "120px", "type": "number", "className": "font-bold"},
            {"key": "purpose", "label": "Purpose", "width": "150px"},
            {"key": "remarks", "label": "Remarks", "width": "200px"}
        ]
    elif "payments_received" == ledger_slug:
        return [
            {"key": "date", "label": "Date", "width": "120px", "type": "date"},
            {"key": "party_name", "label": "Party Name", "width": "200px", "autoFocus": True},
            {"key": "mode", "label": "Mode", "width": "120px"},
            {"key": "reference", "label": "Reference", "width": "150px"},
            {"key": "amount", "label": "Amount", "width": "120px", "type": "number", "className": "text-green-600 font-bold"},
            {"key": "invoice_no", "label": "Against Invoice", "width": "150px"},
            {"key": "remarks", "label": "Remarks", "width": "200px"}
        ]
    elif "daily_expenses" == ledger_slug:
        return [
            {"key": "date", "label": "Date", "width": "120px", "type": "date"},
            {"key": "expense_type", "label": "Expense Type", "width": "150px"},
            {"key": "paid_to", "label": "Paid To", "width": "180px", "autoFocus": True},
            {"key": "mode", "label": "Mode", "width": "120px"},
            {"key": "amount", "label": "Amount", "width": "120px", "type": "number"},
            {"key": "remarks", "label": "Remarks", "width": "200px"}
        ]
    # Default fallback
    return [
        {"key": "date", "label": "Date", "width": "120px", "type": "date"},
        {"key": "description", "label": "Description", "width": "250px", "autoFocus": True},
        {"key": "amount", "label": "Amount", "width": "120px", "type": "number"},
        {"key": "remarks", "label": "Remarks", "width": "200px"}
    ]

# =================================================================
# ENDPOINTS
# =================================================================

@router.get("/", response_model=List[LedgerMetadata])
def get_authorized_ledgers(current_user: User = Depends(get_current_user)):
    """
    Returns the list of ledgers the current user is authorized to view.
    This drives the frontend navigation.
    """
    role = current_user.role
    permissions = get_user_ledger_permissions(role)
    
    authorized_ledgers = []
    
    # Iterate through strict order of ledgers
    for slug, name in ALL_LEDGERS.items():
        access_level = permissions.get(slug)
        
        if access_level:
            authorized_ledgers.append(LedgerMetadata(
                slug=slug,
                name=name,
                can_view=True,
                can_edit=(access_level == "edit")
            ))
            
    return authorized_ledgers

@router.get("/{ledger_slug}", response_model=LedgerDataResponse)
def get_ledger_data(
    ledger_slug: str, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns data for a specific ledger using persistent database.
    """
    # 1. Validate existence
    if ledger_slug not in ALL_LEDGERS:
        raise HTTPException(status_code=404, detail="Ledger not found")
        
    # 2. Check Permissions
    role = current_user.role
    permissions = get_user_ledger_permissions(role)
    access_level = permissions.get(ledger_slug)
    
    if not access_level:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="You do not have permission to view this ledger."
        )
    
    can_edit = (access_level == "edit")
    
    # 3. Fetch Data from Database
    entries = db.query(LedgerEntry).filter(LedgerEntry.ledger_slug == ledger_slug).all()
    
    # Format rows: extract data json and inject id
    rows = []
    for entry in entries:
        row_data = entry.data.copy()
        row_data['id'] = entry.id
        rows.append(row_data)
        
    # Get columns definition
    columns = get_ledger_columns(ledger_slug)
    
    return LedgerDataResponse(
        ledger=ledger_slug,
        ledger_name=ALL_LEDGERS[ledger_slug],
        can_view=True,
        can_edit=can_edit,
        columns=columns,
        rows=rows
    )

@router.post("/{ledger_slug}", response_model=LedgerEntryResponse)
def create_ledger_entry(
    ledger_slug: str, 
    entry: LedgerEntryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Creates a new ledger entry.
    """
    # 1. Validate existence
    if ledger_slug not in ALL_LEDGERS:
        raise HTTPException(status_code=404, detail="Ledger not found")
        
    # 2. Check Edit Permissions
    role = current_user.role
    permissions = get_user_ledger_permissions(role)
    access_level = permissions.get(ledger_slug)
    
    if access_level != "edit":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="You do not have permission to edit this ledger."
        )

    # 3. Create Entry
    db_entry = LedgerEntry(
        ledger_slug=ledger_slug,
        data=entry.data,
        created_by=current_user.id
    )
    
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    
    return db_entry

@router.put("/{ledger_slug}/{entry_id}", response_model=LedgerEntryResponse)
def update_ledger_entry(
    ledger_slug: str,
    entry_id: int,
    entry_update: LedgerEntryUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Updates an existing ledger entry.
    """
    # 1. Validate existence
    if ledger_slug not in ALL_LEDGERS:
        raise HTTPException(status_code=404, detail="Ledger not found")

    # 2. Check Edit Permissions
    role = current_user.role
    permissions = get_user_ledger_permissions(role)
    access_level = permissions.get(ledger_slug)
    
    if access_level != "edit":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="You do not have permission to edit this ledger."
        )
        
    # 3. Find Entry
    db_entry = db.query(LedgerEntry).filter(
        LedgerEntry.id == entry_id,
        LedgerEntry.ledger_slug == ledger_slug
    ).first()
    
    if not db_entry:
        raise HTTPException(status_code=404, detail="Entry not found")
        
    # 4. Update Data
    # Merge existing data with updates (partial update if needed, but here we replace for simplicity)
    # Ideally should patch, but full JSON replacement is fine for this UI
    db_entry.data = entry_update.data
    
    db.commit()
    db.refresh(db_entry)
    
    return db_entry

@router.delete("/{ledger_slug}/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_ledger_entry(
    ledger_slug: str,
    entry_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Deletes a ledger entry.
    """
    # 1. Check Edit Permissions
    role = current_user.role
    permissions = get_user_ledger_permissions(role)
    access_level = permissions.get(ledger_slug)
    
    if access_level != "edit":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized")
        
    # 2. Find and Delete
    db_entry = db.query(LedgerEntry).filter(
        LedgerEntry.id == entry_id,
        LedgerEntry.ledger_slug == ledger_slug
    ).first()
    
    if not db_entry:
        raise HTTPException(status_code=404, detail="Entry not found")
        
    db.delete(db_entry)
    db.commit()
    return None
