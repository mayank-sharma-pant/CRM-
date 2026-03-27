"""Invoice creation and list (company-scoped)."""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional, List
from datetime import date

from app.database import get_db
from app.utils.dependencies import get_current_user, apply_company_scope, ensure_company_access, get_active_team_id
from app.models.core.user import User
from app.models.core.team_membership import TeamMembership
from app.models.sales.client import Client
from app.models.finance.invoice import Invoice, InvoiceItem
from app.models.core.company_settings import CompanySettings
from app.models.ops.stock_item import StockItem
from app.utils.notify import notify_role_users

router = APIRouter()


class InvoiceItemCreate(BaseModel):
    description: str
    quantity: int = 1
    unit_price: float = 0.0
    stock_item_id: Optional[int] = None


class InvoiceCreate(BaseModel):
    client_id: int
    items: List[InvoiceItemCreate]
    invoice_number: Optional[str] = None
    issued_date: Optional[date] = None
    due_date: Optional[date] = None
    due_days: Optional[int] = None
    notes: Optional[str] = None
    tax: Optional[float] = None       # dollar amount from frontend
    discount: Optional[float] = None   # dollar amount from frontend


def _stock_link_for_role(role: str) -> str:
    role_map = {
        "purchase": "/purchase/stock",
        "md": "/md/stock",
        "manager": "/manager/stock",
        "sales": "/sales/stock",
    }
    return role_map.get(role, "/purchase/stock")


@router.post("", status_code=status.HTTP_201_CREATED)
def create_invoice(
    body: InvoiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    active_team_id: Optional[int] = Depends(get_active_team_id),
):
    """Create a new invoice for a client (company-scoped)."""
    if current_user.company_id is None:
        raise HTTPException(status_code=403, detail="User must be assigned to a company")

    if not body.items:
        raise HTTPException(status_code=400, detail="At least one line item is required")

    if body.tax is not None and body.tax < 0:
        raise HTTPException(status_code=400, detail="tax must be >= 0")
    if body.discount is not None and body.discount < 0:
        raise HTTPException(status_code=400, detail="discount must be >= 0")
    if body.due_days is not None and body.due_days < 0:
        raise HTTPException(status_code=400, detail="due_days must be >= 0")

    for item in body.items:
        if (item.quantity or 0) <= 0:
            raise HTTPException(status_code=400, detail="Quantity must be greater than zero for all line items")
        if (item.unit_price or 0) < 0:
            raise HTTPException(status_code=400, detail="Unit price cannot be negative")

    client = db.query(Client).filter(Client.id == body.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    ensure_company_access(client, current_user)

    # Scoping: Sales must own the client to bill them
    if current_user.role == "sales" and client.assigned_to_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only create invoices for your own clients")
    # Scoping: Manager must manage the client's team
    if current_user.role == "manager":
        if active_team_id is None or client.team_id != active_team_id:
            raise HTTPException(status_code=403, detail="You can only create invoices for your team's clients")

    company_id = current_user.company_id
    settings = db.query(CompanySettings).filter(CompanySettings.company_id == company_id).first()
    
    # Use defaults if settings don't exist
    prefix = "INV"
    tax_rate = 18.0
    if settings:
        prefix = (settings.invoice_prefix or "INV").strip() or "INV"
        tax_rate = getattr(settings, "tax_rate", 18.0) or 18.0

    if body.invoice_number:
        invoice_number = body.invoice_number.strip()
        existing = db.query(Invoice).filter(
            Invoice.company_id == company_id,
            Invoice.invoice_number == invoice_number,
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Invoice number already exists for this company")
    else:
        count = db.query(Invoice).filter(Invoice.company_id == company_id).count()
        invoice_number = f"{prefix}-{company_id:03d}-{count + 1:04d}"
        # Robust collision guard against concurrent creates or deleted invoices
        while db.query(Invoice).filter(Invoice.company_id == company_id, Invoice.invoice_number == invoice_number).first():
            count += 1
            invoice_number = f"{prefix}-{company_id:03d}-{count + 1:04d}"

    subtotal = 0.0
    for it in body.items:
        total = (it.quantity or 0) * (it.unit_price or 0)
        subtotal += total

    # Optional stock deduction map when stock_item_id is provided on line items
    requested_stock_qty: dict[int, int] = {}
    for it in body.items:
        if it.stock_item_id is not None:
            requested_stock_qty[it.stock_item_id] = requested_stock_qty.get(it.stock_item_id, 0) + int(it.quantity or 0)

    stock_map: dict[int, StockItem] = {}
    if requested_stock_qty:
        stock_rows = (
            apply_company_scope(db.query(StockItem), StockItem, current_user)
            .filter(StockItem.id.in_(requested_stock_qty.keys()))
            .with_for_update()
            .all()
        )
        stock_map = {s.id: s for s in stock_rows}

        missing_ids = [sid for sid in requested_stock_qty.keys() if sid not in stock_map]
        if missing_ids:
            raise HTTPException(status_code=404, detail=f"Stock item(s) not found: {missing_ids}")

        for sid, qty in requested_stock_qty.items():
            if int(stock_map[sid].quantity or 0) < qty:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient stock for '{stock_map[sid].name}'. Available: {stock_map[sid].quantity}, requested: {qty}",
                )

    # Use frontend-provided tax/discount if present, else auto-calc from company settings
    if body.tax is not None:
        tax = round(body.tax, 2)
    else:
        tax = round(subtotal * (float(tax_rate) / 100), 2)
    discount_val = round(body.discount, 2) if body.discount else 0.0
    total = subtotal + tax - discount_val

    # Handle due_days -> due_date
    from datetime import timedelta
    issued = body.issued_date or date.today()
    due = body.due_date
    if not due and body.due_days is not None:
        due = issued + timedelta(days=body.due_days)

    invoice = Invoice(
        company_id=company_id,
        invoice_number=invoice_number,
        client_id=body.client_id,
        subtotal=subtotal,
        tax=tax,
        discount=discount_val,
        total=total,
        status="Draft",
        issued_date=issued,
        due_date=due,
        notes=body.notes,
        created_by_id=current_user.id,
    )
    db.add(invoice)
    db.flush()

    low_stock_alert_ids: set[int] = set()

    for it in body.items:
        total = (it.quantity or 0) * (it.unit_price or 0)
        if it.stock_item_id is not None:
            stock_item = stock_map[it.stock_item_id]
            stock_item.quantity = int(stock_item.quantity or 0) - int(it.quantity or 0)
            stock_item.updated_by_id = current_user.id
            if int(stock_item.quantity or 0) <= int(stock_item.reorder_level or 0):
                low_stock_alert_ids.add(stock_item.id)

        db.add(InvoiceItem(
            company_id=company_id,
            invoice_id=invoice.id,
            description=it.description,
            quantity=it.quantity or 1,
            unit_price=it.unit_price or 0.0,
            total=total,
        ))

    for stock_id in low_stock_alert_ids:
        stock_item = stock_map.get(stock_id)
        if stock_item is None:
            continue
        for target_role in ("purchase", "md", "manager", "sales"):
            notify_role_users(
                db,
                company_id=company_id,
                role=target_role,
                title=f"Low Stock: {stock_item.name}",
                message=f"Only {stock_item.quantity} {stock_item.unit}(s) remaining.",
                type="warning",
                link=_stock_link_for_role(target_role),
                category="inventory",
                dedupe_window_seconds=6 * 60 * 60,
                dedupe_match_message=False,
                skip_if_unread_duplicate=True,
            )

    db.commit()
    db.refresh(invoice)

    return {
        "id": invoice.id,
        "invoice_number": invoice.invoice_number,
        "client_id": invoice.client_id,
        "subtotal": invoice.subtotal,
        "tax": invoice.tax,
        "total": invoice.total,
        "status": invoice.status,
        "issued_date": invoice.issued_date.isoformat() if invoice.issued_date else None,
        "due_date": invoice.due_date.isoformat() if invoice.due_date else None,
    }


@router.get("")
def list_invoices(
    status: Optional[str] = Query(None, description="Filter by status (Paid/Pending/Overdue/Draft)"),
    search: Optional[str] = Query(None, description="Search by client name or invoice number"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    active_team_id: Optional[int] = Depends(get_active_team_id),
):
    """
    List invoices for the current company (paginated).
    This is a company-scoped list endpoint, separate from role-specific MD/Purchase views.
    """
    if current_user.company_id is None:
        raise HTTPException(status_code=403, detail="User must be assigned to a company")

    query = apply_company_scope(db.query(Invoice), Invoice, current_user)
    
    # Scoping: Sales restrict to self, Manager restrict to team
    if getattr(current_user, "role", "") == "sales":
        query = query.filter(Invoice.created_by_id == current_user.id)
    elif getattr(current_user, "role", "") == "manager":
        # Managers see invoices created by their team members
        if active_team_id is None:
            query = query.filter(False)
        else:
            team_member_ids = (
                apply_company_scope(db.query(User.id), User, current_user)
                .join(TeamMembership, TeamMembership.user_id == User.id)
                .filter(TeamMembership.team_id == active_team_id)
                .all()
            )
            team_member_ids = [uid[0] for uid in team_member_ids]
            query = query.filter(Invoice.created_by_id.in_(team_member_ids)) if team_member_ids else query.filter(False)

    if status and status != "All":
        query = query.filter(Invoice.status == status)

    if search:
        search_pattern = f"%{search}%"
        query = query.join(Client, Client.id == Invoice.client_id).filter(
            (Client.name.ilike(search_pattern)) |
            (Invoice.invoice_number.ilike(search_pattern))
        )

    total = query.count()
    invoices = query.order_by(Invoice.created_at.desc()).offset(skip).limit(limit).all()

    client_q = apply_company_scope(db.query(Client), Client, current_user)
    user_q = apply_company_scope(db.query(User), User, current_user)
    items = []
    
    client_ids = {inv.client_id for inv in invoices if inv.client_id}
    clients = client_q.filter(Client.id.in_(client_ids)).all() if client_ids else []
    client_map = {c.id: c for c in clients}
    
    creator_ids = {inv.created_by_id for inv in invoices if getattr(inv, "created_by_id", None)}
    creators = user_q.filter(User.id.in_(creator_ids)).all() if creator_ids else []
    creator_map = {c.id: c for c in creators}

    for inv in invoices:
        client = client_map.get(inv.client_id)
        creator = creator_map.get(inv.created_by_id)
        
        items.append({
            "id": inv.id,
            "invoice_number": inv.invoice_number,
            "client": client.name if client else None,
            "client_id": inv.client_id,
            "sales_rep_id": inv.created_by_id,
            "sales_rep_name": creator.full_name if creator else "System",
            "subtotal": float(inv.subtotal or 0),
            "tax": float(inv.tax or 0),
            "discount": float(inv.discount or 0),
            "total": float(inv.total or 0),
            "status": inv.status,
            "issued_date": inv.issued_date.isoformat() if inv.issued_date else None,
            "due_date": inv.due_date.isoformat() if inv.due_date else None,
            "created_at": inv.created_at.isoformat() if getattr(inv, "created_at", None) else None,
        })

    return {
        "items": items,
        "total": total,
        "skip": skip,
        "limit": limit,
    }

@router.get("/{invoice_id}")
def get_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    active_team_id: Optional[int] = Depends(get_active_team_id),
):
    """Get a specific invoice by ID (company-scoped)."""
    if current_user.company_id is None:
        raise HTTPException(status_code=403, detail="User must be assigned to a company")
        
    invoice = apply_company_scope(db.query(Invoice), Invoice, current_user).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    # Scoping checks
    if current_user.role == "sales" and invoice.created_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied to this invoice")
    if current_user.role == "manager":
        if active_team_id is None:
            raise HTTPException(status_code=403, detail="Active team required")
        creator_in_team = apply_company_scope(db.query(TeamMembership), TeamMembership, current_user).filter(
            TeamMembership.team_id == active_team_id,
            TeamMembership.user_id == invoice.created_by_id,
        ).first()
        if not creator_in_team:
            raise HTTPException(status_code=403, detail="Access denied to another team's invoice")

    client = apply_company_scope(db.query(Client), Client, current_user).filter(Client.id == invoice.client_id).first()

    items = db.query(InvoiceItem).filter(InvoiceItem.invoice_id == invoice.id).all()
    
    return {
        "id": invoice.id,
        "number": invoice.invoice_number,
        "client": {
            "name": client.name if client else None,
            "email": client.email if client else None,
            "address": client.address if client else None,
        },
        "status": invoice.status,
        "total": invoice.total,
        "subtotal": invoice.subtotal,
        "tax": invoice.tax,
        "issued": invoice.issued_date.isoformat() if invoice.issued_date else None,
        "due": invoice.due_date.isoformat() if invoice.due_date else None,
        "items": [
            {
                "description": item.description,
                "quantity": item.quantity,
                "unit_price": item.unit_price,
                "total": item.total
            } for item in items
        ]
    }
