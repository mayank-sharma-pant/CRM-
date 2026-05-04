from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.utils.dependencies import get_current_user, apply_company_scope, ensure_company_access, is_platform_admin
from app.models.core.user import User
from app.models.finance.ledger import LedgerEntry
from app.models.ops.stock_item import StockItem
from app.database import get_db
import json

router = APIRouter(
    prefix="/api/ledgers",
    tags=["ledgers"]
)

# =================================================================
# LEDGER PERMISSION CONFIGURATION (STRICT – API is source of truth)
# Role: sales_executive → "sales", company_admin → admin with company_id, platform_admin → admin with company_id NULL
# =================================================================

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

# Strict access matrix: "role" -> ledger_slug -> "edit" | "view". Omitted = not visible.
# sales_executive = sales, team_lead, manager (view only), purchase, md (view only), company_admin = full edit (handled by user)
ROLE_PERMISSIONS = {
    "sales": {
        "stock_register": "view",
    },
    "team_lead": {
        "stock_register": "view",
    },
    "manager": {
        "stock_register": "view",
        "payments_made": "view",
        "payments_received": "edit",
        "daily_expenses": "edit",
        "cash_bank_balance": "view",
        "pdc_given": "edit",
        "pdc_received": "view",
        "account_transfer_purchase": "edit",
        "account_transfer_sales": "edit",
    },
    "md": {
        "stock_register": "edit",
        "payments_made": "edit",
        "payments_received": "edit",
        "daily_expenses": "edit",
        "cash_bank_balance": "edit",
        "pdc_given": "edit",
        "pdc_received": "edit",
        "account_transfer_purchase": "edit",
        "account_transfer_sales": "edit",
    },
    "purchase": {
        "stock_register": "edit",
        "payments_made": "edit",
        "account_transfer_purchase": "edit",
        "pdc_given": "edit",
        "cash_bank_balance": "edit",
        "payments_received": "edit",
        "daily_expenses": "edit",
        "pdc_received": "view",
        "account_transfer_sales": "edit",
    },
    "admin": {},  # platform_admin: no access. company_admin handled below.
}

# Company admin (admin with company_id set) gets full edit on all ledgers
COMPANY_ADMIN_LEDGERS = {slug: "edit" for slug in ALL_LEDGERS}

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
# HELPERS (permissions from user only – no frontend role checks)
# =================================================================

def get_user_ledger_permissions(user: User) -> Dict[str, str]:
    """Returns ledger_slug -> 'view' | 'edit'. Platform admin gets no ledgers."""
    if is_platform_admin(user):
        return {}
    if user.role == "admin" and user.company_id is not None:
        return COMPANY_ADMIN_LEDGERS.copy()
    return ROLE_PERMISSIONS.get(user.role, {}).copy()

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
    elif "cash_bank_balance" == ledger_slug:
        return [
            {"key": "date", "label": "Date", "width": "120px", "type": "date"},
            {"key": "opening_cash", "label": "Opening Cash", "width": "120px", "type": "number", "format": "currency"},
            {"key": "cash_in", "label": "Cash In", "width": "100px", "type": "number"},
            {"key": "cash_out", "label": "Cash Out", "width": "100px", "type": "number"},
            {"key": "closing_cash", "label": "Closing Cash", "width": "120px", "type": "number", "format": "currency"},
            {"key": "opening_bank", "label": "Opening Bank", "width": "120px", "type": "number", "format": "currency"},
            {"key": "bank_in", "label": "Bank In", "width": "100px", "type": "number"},
            {"key": "bank_out", "label": "Bank Out", "width": "100px", "type": "number"},
            {"key": "closing_bank", "label": "Closing Bank", "width": "120px", "type": "number", "format": "currency"},
            {"key": "remarks", "label": "Remarks", "width": "200px"}
        ]
    elif "pdc_given" == ledger_slug:
        return [
            {"key": "cheque_date", "label": "Cheque Date", "width": "120px", "type": "date"},
            {"key": "cheque_number", "label": "Cheque Number", "width": "120px"},
            {"key": "bank_name", "label": "Bank Name", "width": "150px"},
            {"key": "party_name", "label": "Party Name", "width": "200px", "autoFocus": True},
            {"key": "amount", "label": "Amount", "width": "120px", "type": "number", "format": "currency"},
            {"key": "status", "label": "Status", "width": "120px"},
            {"key": "clearing_date", "label": "Clearing Date", "width": "120px", "type": "date"},
            {"key": "remarks", "label": "Remarks", "width": "200px"}
        ]
    elif "pdc_received" == ledger_slug:
        return [
            {"key": "cheque_date", "label": "Cheque Date", "width": "120px", "type": "date"},
            {"key": "cheque_number", "label": "Cheque Number", "width": "120px"},
            {"key": "bank_name", "label": "Bank Name", "width": "150px"},
            {"key": "party_name", "label": "Party Name", "width": "200px", "autoFocus": True},
            {"key": "amount", "label": "Amount", "width": "120px", "type": "number", "format": "currency"},
            {"key": "status", "label": "Status", "width": "120px"},
            {"key": "clearing_date", "label": "Clearing Date", "width": "120px", "type": "date"},
            {"key": "remarks", "label": "Remarks", "width": "200px"}
        ]
    elif "account_transfer_purchase" == ledger_slug:
        return [
            {"key": "date", "label": "Date", "width": "120px", "type": "date"},
            {"key": "vendor", "label": "Vendor", "width": "200px", "autoFocus": True},
            {"key": "product", "label": "Product", "width": "150px"},
            {"key": "invoice_number", "label": "Invoice Number", "width": "130px"},
            {"key": "amount", "label": "Amount", "width": "120px", "type": "number", "format": "currency"},
            {"key": "bank", "label": "Bank", "width": "120px"},
            {"key": "utr_reference", "label": "UTR / Reference", "width": "150px"},
            {"key": "remarks", "label": "Remarks", "width": "200px"}
        ]
    elif "account_transfer_sales" == ledger_slug:
        return [
            {"key": "date", "label": "Date", "width": "120px", "type": "date"},
            {"key": "client", "label": "Client", "width": "200px", "autoFocus": True},
            {"key": "product", "label": "Product", "width": "150px"},
            {"key": "invoice_number", "label": "Invoice Number", "width": "130px"},
            {"key": "amount", "label": "Amount", "width": "120px", "type": "number", "format": "currency"},
            {"key": "bank", "label": "Bank", "width": "120px"},
            {"key": "utr_reference", "label": "UTR / Reference", "width": "150px"},
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

@router.get("", response_model=List[LedgerMetadata])
def get_authorized_ledgers(current_user: User = Depends(get_current_user)):
    """
    Returns the list of ledgers the current user is authorized to view.
    Sidebar must be built only from this response. Platform admin gets [].
    """
    permissions = get_user_ledger_permissions(current_user)

    authorized_ledgers = []
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

@router.get("/{ledger_slug}")
def get_ledger_data(
    ledger_slug: str, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns data for a specific ledger using persistent database.
    """
    import traceback as tb_mod
    try:
        # 1. Validate existence
        if ledger_slug not in ALL_LEDGERS:
            raise HTTPException(status_code=404, detail="Ledger not found")
            
        # 2. Check Permissions (backend enforces – frontend is not trusted)
        permissions = get_user_ledger_permissions(current_user)
        access_level = permissions.get(ledger_slug)
        
        if not access_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="You do not have permission to view this ledger."
            )
        
        can_edit = (access_level == "edit")
        
        # 3. Fetch Data from Database (company-scoped)
        entry_query = apply_company_scope(db.query(LedgerEntry), LedgerEntry, current_user)
        entries = entry_query.filter(LedgerEntry.ledger_slug == ledger_slug).all()
        
        # Format rows: extract data json and inject id
        rows = []
        for entry in entries:
            row_data = (entry.data or {}).copy()
            row_data['id'] = entry.id
            rows.append(row_data)
        
        # For stock_register: also include current inventory items not already in ledger
        if ledger_slug == "stock_register":
            stock_query = apply_company_scope(db.query(StockItem), StockItem, current_user)
            stock_items = stock_query.all()
            
            # Collect product names already in ledger rows
            existing_products = set()
            for row in rows:
                product_name = row.get("product", "")
                if product_name:
                    existing_products.add(product_name.strip().lower())
            
            # Add stock items not yet recorded in ledger
            for idx, si in enumerate(stock_items):
                if si.name and si.name.strip().lower() not in existing_products:
                    rows.append({
                        "id": -(idx + 1),  # negative id to indicate auto-generated
                        "date": si.updated_at.strftime("%Y-%m-%d") if si.updated_at else (si.created_at.strftime("%Y-%m-%d") if si.created_at else ""),
                        "product": si.name,
                        "category": si.category or "",
                        "brand": "",
                        "qty_in": int(si.quantity or 0),
                        "qty_out": 0,
                        "purchase_rate": float(si.unit_price or 0),
                        "sale_rate": 0,
                        "remarks": f"Current stock (SKU: {si.sku or 'N/A'})"
                    })
            
        # Get columns definition
        columns = get_ledger_columns(ledger_slug)
        
        return {
            "ledger": ledger_slug,
            "ledger_name": ALL_LEDGERS[ledger_slug],
            "can_view": True,
            "can_edit": can_edit,
            "columns": columns,
            "rows": rows
        }
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
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
        
    # 2. Check Edit Permissions (backend enforces on every write)
    permissions = get_user_ledger_permissions(current_user)
    if permissions.get(ledger_slug) != "edit":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to edit this ledger."
        )

    # 3. Create Entry
    if current_user.company_id is None:
        raise HTTPException(status_code=403, detail="User must be assigned to a company")
    db_entry = LedgerEntry(
        company_id=current_user.company_id,
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
    permissions = get_user_ledger_permissions(current_user)
    if permissions.get(ledger_slug) != "edit":
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
    ensure_company_access(db_entry, current_user)
        
    # 4. Update Data + audit fields
    db_entry.data = entry_update.data
    db_entry.updated_by = current_user.id
    db_entry.updated_at = func.now()

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
    # 1. Validate ledger exists and check edit permission
    if ledger_slug not in ALL_LEDGERS:
        raise HTTPException(status_code=404, detail="Ledger not found")
    permissions = get_user_ledger_permissions(current_user)
    if permissions.get(ledger_slug) != "edit":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to edit this ledger.")

    # 2. Find and Delete
    db_entry = db.query(LedgerEntry).filter(
        LedgerEntry.id == entry_id,
        LedgerEntry.ledger_slug == ledger_slug
    ).first()
    if not db_entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    ensure_company_access(db_entry, current_user)
        
    db.delete(db_entry)
    db.commit()
    return None
