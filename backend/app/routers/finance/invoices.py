"""Invoice creation and list (company-scoped)."""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime, timezone
from decimal import Decimal
import uuid

from app.database import get_db
from app.utils.dependencies import get_current_user, apply_company_scope, ensure_company_access, get_active_team_id
from app.models.core.user import User
from app.models.core.team_membership import TeamMembership
from app.models.sales.client import Client
from app.models.finance.invoice import Invoice, InvoiceItem
from app.models.core.company_settings import CompanySettings
from app.models.ops.stock_item import StockItem
from app.utils.notify import notify_role_users
from app.services.finance.gst import compute_gst
from app.services.sales.product_lines import deduct_stock, resolve_sale_lines

router = APIRouter()


class InvoiceItemCreate(BaseModel):
    description: str
    quantity: int = 1
    unit_price: float = 0.0
    stock_item_id: Optional[int] = None
    hsn: Optional[str] = None
    product_id: Optional[int] = None


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


def _notify_low_stock(db: Session, company_id: int, low_stock_alert_ids: set[int]) -> None:
    if not low_stock_alert_ids:
        return
    stock_rows = (
        db.query(StockItem)
        .filter(StockItem.company_id == company_id, StockItem.id.in_(low_stock_alert_ids))
        .all()
    )
    stock_map = {s.id: s for s in stock_rows}
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
        import uuid
        invoice_number = f"DRAFT-{uuid.uuid4().hex[:8].upper()}"

    try:
        lines = resolve_sale_lines(
            db,
            company_id=company_id,
            items=body.items,
            company_tax_rate=tax_rate,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    subtotal = float(sum((line.line_amount for line in lines), Decimal("0")))
    header_tax = body.tax if body.tax is not None else sum(line.tax for line in lines)

    # Use frontend-provided tax/discount if present, else sum of per-line taxes
    try:
        gst = compute_gst(
            subtotal=subtotal,
            rate_percent=tax_rate,
            seller_gstin=getattr(settings, "gst_number", None) if settings else None,
            buyer_gstin=getattr(client, "gstin", None),
            tax_override=header_tax,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    tax = gst.tax
    discount_val = round(body.discount, 2) if body.discount else 0.0
    total = subtotal + tax - discount_val

    # Handle due_days -> due_date
    from datetime import timedelta
    issued = body.issued_date or datetime.now(timezone.utc).date()
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
        cgst=gst.cgst,
        sgst=gst.sgst,
        igst=gst.igst,
        seller_gstin=gst.seller_gstin,
        buyer_gstin=gst.buyer_gstin,
        place_of_supply=gst.place_of_supply,
        tax_mode=gst.tax_mode,
    )
    db.add(invoice)
    db.flush()

    for line in lines:
        db.add(InvoiceItem(
            company_id=company_id,
            invoice_id=invoice.id,
            description=line.description,
            quantity=line.quantity,
            unit_price=line.unit_price,
            total=line.line_amount,
            hsn=line.hsn,
            product_id=line.product_id,
            tax_rate=line.tax_rate,
            tax=line.tax,
        ))

    low_stock_alert_ids = deduct_stock(db, current_user, lines)
    _notify_low_stock(db, company_id, low_stock_alert_ids)

    db.commit()
    db.refresh(invoice)

    return {
        "id": invoice.id,
        "invoice_number": invoice.invoice_number,
        "client_id": invoice.client_id,
        "subtotal": float(invoice.subtotal or 0),
        "tax": float(invoice.tax or 0),
        "cgst": float(invoice.cgst or 0),
        "sgst": float(invoice.sgst or 0),
        "igst": float(invoice.igst or 0),
        "tax_mode": invoice.tax_mode,
        "seller_gstin": invoice.seller_gstin,
        "buyer_gstin": invoice.buyer_gstin,
        "place_of_supply": invoice.place_of_supply,
        "total": float(invoice.total or 0),
        "status": invoice.status,
        "issued_date": invoice.issued_date.isoformat() if invoice.issued_date else None,
        "due_date": invoice.due_date.isoformat() if invoice.due_date else None,
    }


@router.get("")
def list_invoices(
    status: Optional[str] = Query(None, description="Filter by status (Paid/Pending/Overdue/Draft)"),
    search: Optional[str] = Query(None, description="Search by client name or invoice number"),
    client_id: Optional[int] = Query(None, description="Filter by client_id"),
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

    if client_id is not None:
        # Ensure client exists and is accessible, then filter
        client = apply_company_scope(db.query(Client), Client, current_user).filter(Client.id == client_id).first()
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")
        query = query.filter(Invoice.client_id == client_id)

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
        "total": float(invoice.total or 0),
        "subtotal": float(invoice.subtotal or 0),
        "tax": float(invoice.tax or 0),
        "cgst": float(invoice.cgst or 0),
        "sgst": float(invoice.sgst or 0),
        "igst": float(invoice.igst or 0),
        "tax_mode": invoice.tax_mode,
        "seller_gstin": invoice.seller_gstin,
        "buyer_gstin": invoice.buyer_gstin,
        "place_of_supply": invoice.place_of_supply,
        "issued": invoice.issued_date.isoformat() if invoice.issued_date else None,
        "due": invoice.due_date.isoformat() if invoice.due_date else None,
        "items": [
            {
                "description": item.description,
                "quantity": item.quantity,
                "unit_price": item.unit_price,
                "total": item.total,
                "hsn": item.hsn,
                "product_id": item.product_id,
                "tax_rate": item.tax_rate,
                "tax": item.tax,
            } for item in items
        ]
    }


@router.post("/{invoice_id}/payment-link")
def create_payment_link(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Attach a pay-now URL. Uses a local stub when Razorpay invoice links are not wired."""
    invoice = apply_company_scope(db.query(Invoice), Invoice, current_user).filter(Invoice.id == invoice_id).first()
    if invoice is None:
        raise HTTPException(status_code=404, detail="Invoice not found")
    ensure_company_access(invoice, current_user)
    if invoice.payment_url:
        return {"payment_url": invoice.payment_url, "invoice_id": invoice.id}
    token = uuid.uuid4().hex
    invoice.payment_url = f"/pay/{token}"
    invoice.payment_reference = token
    db.commit()
    db.refresh(invoice)
    return {"payment_url": invoice.payment_url, "invoice_id": invoice.id}
