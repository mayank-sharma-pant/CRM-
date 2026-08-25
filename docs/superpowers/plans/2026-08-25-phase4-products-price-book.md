# Products Price Book + Tax Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A company catalog of sellable products with HSN and GST rate; quotes and invoices snapshot those values per line; mixed rates sum correctly; linked stock deducts when the invoice is created.

**Architecture:** New tenant-scoped `products` table. `line_tax` plus `resolve_sale_lines` turn request lines into snapshots. Quote and invoice create write those snapshots; quote accept copies them onto the invoice and then deducts `product.stock_item_id`. One list price on the product — no price-books table.

**Tech Stack:** FastAPI, SQLAlchemy, Pydantic, Next.js App Router, axios, Tailwind. Tests: pytest + FastAPI `TestClient` (in-memory SQLite).

**Spec:** [docs/superpowers/specs/2026-08-25-phase4-products-price-book-design.md](../specs/2026-08-25-phase4-products-price-book-design.md)

## Global Constraints

- No new pip dependency. No Alembic (two pre-existing heads).
- New `products` table via `Base.metadata.create_all`. New columns on `quotes`, `quote_items`, `invoice_items` via `_MISSING_COLUMNS` in `backend/create_missing_tables.py`.
- Never take `company_id` from the request body; derive from `get_current_user`.
- By-id miss (including cross-tenant) is **404**, not 403. Bad `product_id` on quote/invoice **create** is **400**.
- Write roles: purchase / md / admin. Sales and manager: list and pick only.
- Test login password is `"pw"`. Reset `auth_limiter._buckets.clear()` in login-heavy tests.
- Run pytest from `backend/`: `pytest tests/... -v`.
- Do not touch public `/api/v1` invoice payloads (`product_id` is a non-goal).
- Working tree may already have unrelated Phase 3 files. `git add` only the files listed in that task.

### File map

| File | Responsibility |
|---|---|
| `backend/app/models/sales/product.py` | `Product` catalog row |
| `backend/app/models/sales/quote.py` | GST header + line snapshot columns |
| `backend/app/models/finance/invoice.py` | line `product_id`, `tax_rate`, `tax` |
| `backend/app/services/finance/gst.py` | `line_tax(amount, rate_percent) -> float` |
| `backend/app/services/sales/product_lines.py` | resolve lines + stock deduction helper |
| `backend/app/routers/sales/products.py` | `/api/products` CRUD |
| `backend/app/routers/finance/invoices.py` | per-line GST + product stock deduct |
| `backend/app/routers/sales/quotes.py` | per-line GST; accept copies snapshots then deducts |
| `frontend/components/products/ProductsPage.jsx` | catalog UI |
| `frontend/components/shared/CreateOrderModal.jsx` | product picker on invoices |
| `frontend/app/sales/deals/[id]/page.jsx` | quote line editor |

---

### Task 1: Product model + snapshot columns

**Files:**
- Create: `backend/app/models/sales/product.py`
- Modify: `backend/app/models/sales/__init__.py`
- Modify: `backend/app/models/sales/quote.py`
- Modify: `backend/app/models/finance/invoice.py`
- Modify: `backend/create_missing_tables.py` (`_MISSING_COLUMNS`)
- Test: `backend/tests/sales/test_products_schema.py`

**Interfaces:**
- Consumes: existing `Base`, `StockItem` table name `stock_items`
- Produces: class `Product` with columns listed in the spec; `QuoteItem.product_id/hsn/tax_rate/tax`; `InvoiceItem.product_id/tax_rate/tax`; `Quote.cgst/sgst/igst/seller_gstin/buyer_gstin/place_of_supply/tax_mode`

- [ ] **Step 1: Write the failing schema test**

```python
from sqlalchemy import inspect

from app.models.finance.invoice import InvoiceItem
from app.models.sales.product import Product
from app.models.sales.quote import Quote, QuoteItem
from tests.helpers.factories import create_company


def test_products_table_and_snapshot_columns_exist(db_engine):
    tables = set(inspect(db_engine).get_table_names())
    assert "products" in tables
    product_cols = {c["name"] for c in inspect(db_engine).get_columns("products")}
    assert {
        "company_id", "name", "sku", "unit", "unit_price", "tax_rate", "hsn",
        "stock_item_id", "is_active", "created_by_id", "updated_by_id",
    } <= product_cols
    quote_cols = {c["name"] for c in inspect(db_engine).get_columns("quotes")}
    assert {"cgst", "sgst", "igst", "seller_gstin", "buyer_gstin", "place_of_supply", "tax_mode"} <= quote_cols
    qi_cols = {c["name"] for c in inspect(db_engine).get_columns("quote_items")}
    assert {"product_id", "hsn", "tax_rate", "tax"} <= qi_cols
    ii_cols = {c["name"] for c in inspect(db_engine).get_columns("invoice_items")}
    assert {"product_id", "tax_rate", "tax"} <= ii_cols


def test_can_persist_product(db):
    company = create_company(db, name="P Co", company_code="PCO")
    row = Product(
        company_id=company.id,
        name="Site visit",
        sku="SVC-1",
        unit="job",
        unit_price=1000,
        tax_rate=18,
        hsn="9983",
        is_active=True,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    assert row.id is not None
    assert str(row.tax_rate) in ("18", "18.00", "18.0")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && pytest tests/sales/test_products_schema.py -v`

Expected: FAIL with `ModuleNotFoundError: No module named 'app.models.sales.product'` or `products` not in tables.

- [ ] **Step 3: Write minimal implementation**

`backend/app/models/sales/product.py`:

```python
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, Numeric, String, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base


class Product(Base):
    __tablename__ = "products"
    __table_args__ = (
        UniqueConstraint("company_id", "sku", name="uq_products_company_sku"),
    )

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    sku = Column(String(100), nullable=True, index=True)
    unit = Column(String(32), nullable=False, default="unit")
    unit_price = Column(Numeric(12, 2), nullable=False, default=0)
    tax_rate = Column(Numeric(5, 2), nullable=False)
    hsn = Column(String(20), nullable=True)
    stock_item_id = Column(Integer, ForeignKey("stock_items.id"), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    company = relationship("Company", backref="products")
```

Add to `backend/app/models/sales/__init__.py`:

```python
from .product import Product
```

Add on `Quote` (after `tax`):

```python
cgst = Column(Numeric(12, 2), default=0)
sgst = Column(Numeric(12, 2), default=0)
igst = Column(Numeric(12, 2), default=0)
seller_gstin = Column(String(15), nullable=True)
buyer_gstin = Column(String(15), nullable=True)
place_of_supply = Column(String(2), nullable=True)
tax_mode = Column(String(10), nullable=True)
```

Add on `QuoteItem` (after `total`):

```python
product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
hsn = Column(String(20), nullable=True)
tax_rate = Column(Numeric(5, 2), nullable=True)
tax = Column(Numeric(12, 2), default=0)
```

Add on `InvoiceItem` (after `hsn`):

```python
product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
tax_rate = Column(Numeric(5, 2), nullable=True)
tax = Column(Numeric(12, 2), default=0)
```

Append to `_MISSING_COLUMNS` in `backend/create_missing_tables.py`:

```python
    ("quotes", "cgst", "NUMERIC(12,2) DEFAULT 0"),
    ("quotes", "sgst", "NUMERIC(12,2) DEFAULT 0"),
    ("quotes", "igst", "NUMERIC(12,2) DEFAULT 0"),
    ("quotes", "seller_gstin", "VARCHAR(15)"),
    ("quotes", "buyer_gstin", "VARCHAR(15)"),
    ("quotes", "place_of_supply", "VARCHAR(2)"),
    ("quotes", "tax_mode", "VARCHAR(10)"),
    ("quote_items", "product_id", "INTEGER"),
    ("quote_items", "hsn", "VARCHAR(20)"),
    ("quote_items", "tax_rate", "NUMERIC(5,2)"),
    ("quote_items", "tax", "NUMERIC(12,2) DEFAULT 0"),
    ("invoice_items", "product_id", "INTEGER"),
    ("invoice_items", "tax_rate", "NUMERIC(5,2)"),
    ("invoice_items", "tax", "NUMERIC(12,2) DEFAULT 0"),
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && pytest tests/sales/test_products_schema.py -v`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/models/sales/product.py backend/app/models/sales/__init__.py \
  backend/app/models/sales/quote.py backend/app/models/finance/invoice.py \
  backend/create_missing_tables.py backend/tests/sales/test_products_schema.py
git commit -m "$(cat <<'EOF'
feat(products): add catalog table and quote/invoice snapshot columns

EOF
)"
```

---

### Task 2: `line_tax` + `resolve_sale_lines`

**Files:**
- Modify: `backend/app/services/finance/gst.py`
- Create: `backend/app/services/sales/product_lines.py`
- Test: `backend/tests/finance/test_gst.py` (add `line_tax` cases)
- Test: `backend/tests/sales/test_product_lines.py`

**Interfaces:**
- Consumes: `Product` from Task 1; existing `_money` / `compute_gst`
- Produces:
  - `line_tax(amount, rate_percent) -> float`
  - `ResolvedSaleLine` dataclass: `description: str`, `quantity: int`, `unit_price` (Decimal), `hsn: str | None`, `tax_rate` (Decimal), `line_amount` (Decimal), `tax: float`, `product_id: int | None`, `deduct_stock_item_id: int | None`
  - `resolve_sale_lines(db, *, company_id: int, items: list, company_tax_rate: float) -> list[ResolvedSaleLine]`
  - Raises `ValueError` with message `product_id not found in your company` or `product is inactive` (router maps to HTTP 400)

Each item in `items` has attributes/keys: `description`, `quantity`, `unit_price`, optional `product_id`, optional `hsn`, optional `stock_item_id` (legacy invoice body).

Resolution rules (spec):
- `product_id` set: load `Product` where `id` + `company_id`. Missing → ValueError not found. `is_active` is false → ValueError inactive.
- Fill description/unit_price/hsn/tax_rate from product when the request value is missing/blank/None. Explicit request description, unit_price, hsn win. Request `tax_rate` is not on the invoice body today — tax_rate always from product when `product_id` is set.
- No `product_id`: tax_rate = `company_tax_rate`; hsn from request if sent.
- `deduct_stock_item_id`: if product has `stock_item_id`, use that; else if request has `stock_item_id`, use that.

- [ ] **Step 1: Write the failing tests**

Add to `backend/tests/finance/test_gst.py`:

```python
from app.services.finance.gst import line_tax


def test_line_tax_rounds_half_up():
    assert line_tax(200, 18) == 36.0
    assert line_tax(1000, 5) == 50.0
    assert line_tax(1, 18) == 0.18
```

Create `backend/tests/sales/test_product_lines.py`:

```python
import pytest
from pydantic import BaseModel
from typing import Optional

from app.models.sales.product import Product
from app.services.sales.product_lines import resolve_sale_lines
from tests.helpers.factories import create_company


class _Line(BaseModel):
    description: str = ""
    quantity: int = 1
    unit_price: Optional[float] = None
    product_id: Optional[int] = None
    hsn: Optional[str] = None
    stock_item_id: Optional[int] = None


def test_resolve_fills_from_product_and_keeps_free_text_rate(db):
    company = create_company(db, name="PL", company_code="PL1")
    product = Product(
        company_id=company.id, name="Consult", sku=None, unit="hr",
        unit_price=1000, tax_rate=5, hsn="9983", is_active=True,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    lines = resolve_sale_lines(
        db,
        company_id=company.id,
        items=[
            _Line(product_id=product.id, quantity=2),
            _Line(description="Extra", quantity=1, unit_price=100),
        ],
        company_tax_rate=18,
    )
    assert lines[0].description == "Consult"
    assert float(lines[0].unit_price) == 1000
    assert lines[0].tax == 100.0
    assert lines[0].hsn == "9983"
    assert lines[1].tax == 18.0
    assert lines[1].product_id is None


def test_resolve_rejects_foreign_and_inactive_product(db):
    a = create_company(db, name="A", company_code="PLA")
    b = create_company(db, name="B", company_code="PLB")
    foreign = Product(company_id=b.id, name="B", unit_price=1, tax_rate=18, is_active=True)
    inactive = Product(company_id=a.id, name="Old", unit_price=1, tax_rate=18, is_active=False)
    db.add_all([foreign, inactive])
    db.commit()
    db.refresh(foreign)
    db.refresh(inactive)
    with pytest.raises(ValueError, match="not found"):
        resolve_sale_lines(db, company_id=a.id, items=[_Line(product_id=foreign.id, description="x", quantity=1, unit_price=1)], company_tax_rate=18)
    with pytest.raises(ValueError, match="inactive"):
        resolve_sale_lines(db, company_id=a.id, items=[_Line(product_id=inactive.id, description="x", quantity=1, unit_price=1)], company_tax_rate=18)
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && pytest tests/finance/test_gst.py::test_line_tax_rounds_half_up tests/sales/test_product_lines.py -v`

Expected: FAIL — `line_tax` / `resolve_sale_lines` not defined.

- [ ] **Step 3: Write minimal implementation**

Add to `backend/app/services/finance/gst.py` (next to `_money`):

```python
def line_tax(amount, rate_percent) -> float:
    return _money(Decimal(str(amount)) * Decimal(str(rate_percent)) / Decimal("100"))
```

`backend/app/services/sales/product_lines.py`:

```python
from dataclasses import dataclass
from decimal import Decimal
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.core.user import User
from app.models.ops.stock_item import StockItem
from app.models.sales.product import Product
from app.services.finance.gst import line_tax
from app.utils.dependencies import apply_company_scope


@dataclass(frozen=True)
class ResolvedSaleLine:
    description: str
    quantity: int
    unit_price: Decimal
    hsn: Optional[str]
    tax_rate: Decimal
    line_amount: Decimal
    tax: float
    product_id: Optional[int]
    deduct_stock_item_id: Optional[int]


def _attr(item, name, default=None):
    if isinstance(item, dict):
        return item.get(name, default)
    return getattr(item, name, default)


def resolve_sale_lines(db: Session, *, company_id: int, items: list, company_tax_rate: float) -> list[ResolvedSaleLine]:
    resolved: list[ResolvedSaleLine] = []
    for item in items:
        product_id = _attr(item, "product_id")
        product = None
        if product_id is not None:
            product = (
                db.query(Product)
                .filter(Product.id == product_id, Product.company_id == company_id)
                .first()
            )
            if product is None:
                raise ValueError("product_id not found in your company")
            if not product.is_active:
                raise ValueError("product is inactive")

        req_description = str(_attr(item, "description") or "").strip()
        req_price = _attr(item, "unit_price")
        req_hsn = _attr(item, "hsn")
        if isinstance(req_hsn, str):
            req_hsn = req_hsn.strip() or None

        description = req_description or (product.name if product is not None else "")
        unit_price = product.unit_price if product is not None and req_price is None else req_price
        hsn = req_hsn if req_hsn is not None else (product.hsn if product is not None else None)
        tax_rate = Decimal(str(product.tax_rate if product is not None else company_tax_rate))
        qty = int(_attr(item, "quantity") or 0)
        price = Decimal(str(unit_price or 0))
        amount = Decimal(qty) * price
        legacy_stock = _attr(item, "stock_item_id")
        if product is not None and product.stock_item_id is not None:
            deduct = product.stock_item_id
        else:
            deduct = legacy_stock
        resolved.append(ResolvedSaleLine(
            description=description,
            quantity=qty,
            unit_price=price,
            hsn=hsn,
            tax_rate=tax_rate,
            line_amount=amount,
            tax=line_tax(amount, tax_rate),
            product_id=product.id if product is not None else None,
            deduct_stock_item_id=int(deduct) if deduct is not None else None,
        ))
    return resolved


def deduct_stock(db: Session, current_user: User, lines: list[ResolvedSaleLine]) -> set[int]:
    requested: dict[int, int] = {}
    for line in lines:
        if line.deduct_stock_item_id is None:
            continue
        requested[line.deduct_stock_item_id] = requested.get(line.deduct_stock_item_id, 0) + int(line.quantity or 0)
    if not requested:
        return set()
    rows = (
        apply_company_scope(db.query(StockItem), StockItem, current_user)
        .filter(StockItem.id.in_(requested.keys()))
        .with_for_update()
        .all()
    )
    stock_map = {s.id: s for s in rows}
    missing = [sid for sid in requested if sid not in stock_map]
    if missing:
        raise HTTPException(status_code=404, detail=f"Stock item(s) not found: {missing}")
    for sid, qty in requested.items():
        if int(stock_map[sid].quantity or 0) < qty:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for '{stock_map[sid].name}'. Available: {stock_map[sid].quantity}, requested: {qty}",
            )
    low: set[int] = set()
    for sid, qty in requested.items():
        stock_item = stock_map[sid]
        stock_item.quantity = int(stock_item.quantity or 0) - qty
        stock_item.updated_by_id = current_user.id
        if int(stock_item.quantity or 0) <= int(stock_item.reorder_level or 0):
            low.add(sid)
    return low
```

`deduct_stock` is covered by invoice/quote API tests in Task 4, not this task's unit tests. Make `QuoteItemIn.unit_price` optional in Task 4 so omitted price fills from the product (`req_price is None`).

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && pytest tests/finance/test_gst.py tests/sales/test_product_lines.py -v`

Expected: PASS. Also re-run `tests/sales/test_products_schema.py`.

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/finance/gst.py backend/app/services/sales/product_lines.py \
  backend/tests/finance/test_gst.py backend/tests/sales/test_product_lines.py
git commit -m "$(cat <<'EOF'
feat(products): resolve catalog lines and per-line GST amounts

EOF
)"
```

---

### Task 3: Products CRUD API

**Files:**
- Create: `backend/app/routers/sales/products.py`
- Modify: `backend/app/main.py` (import + `include_router` prefix `/api/products`)
- Test: `backend/tests/sales/test_products_api.py`

**Interfaces:**
- Consumes: `Product`; write roles `{purchase, md, admin}`
- Produces: JSON item `{id, name, sku, unit, unit_price, tax_rate, hsn, stock_item_id, stock_quantity, is_active}` where `stock_quantity` is `StockItem.quantity` or `null`
- `GET /api/products?q=&active_only=true`
- `GET /api/products/{id}`
- `POST /api/products` body: `{name, sku?, unit?, unit_price, tax_rate, hsn?, stock_item_id?, is_active?}`
- `PATCH /api/products/{id}` same optional fields
- `DELETE /api/products/{id}` → 204 or 400 if any `QuoteItem`/`InvoiceItem` has that `product_id`

Mirror inventory’s company-context check: platform admin / `company_id is None` → 403 `"User must be assigned to a company"`.

Blank SKU stored as `None`. Duplicate SKU → 400 `"SKU already exists"`. `tax_rate` not in 0–100 → 400 `"tax_rate must be between 0 and 100"`. `unit_price < 0` → 400. `stock_item_id` set but not in-company → 400 `"stock_item_id not found in your company"`.

- [ ] **Step 1: Write the failing API tests**

```python
import pytest

from app.models.finance.invoice import Invoice, InvoiceItem
from app.models.ops.stock_item import StockItem
from app.utils.rate_limit import auth_limiter
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company, create_client


@pytest.fixture(autouse=True)
def _reset_auth_rate_limit():
    auth_limiter._buckets.clear()
    yield


def _admin(db, code="PR1"):
    company = create_company(db, name=f"Co {code}", company_code=code)
    admin = create_active_user(db, email=f"admin@{code}.com", role="admin", company_id=company.id)
    return company, admin


def test_create_list_get_patch_product(client, db):
    company, admin = _admin(db)
    login_user(client, admin.email)
    created = client.post("/api/products", json={
        "name": "Consult", "sku": "C-1", "unit": "hr", "unit_price": 1000,
        "tax_rate": 18, "hsn": "9983",
    })
    assert created.status_code == 201, created.text
    body = created.json()
    assert body["name"] == "Consult"
    assert body["tax_rate"] == 18.0
    assert body["stock_quantity"] is None
    listed = client.get("/api/products")
    assert listed.status_code == 200
    assert listed.json()["total"] == 1
    got = client.get(f"/api/products/{body['id']}")
    assert got.status_code == 200
    patched = client.patch(f"/api/products/{body['id']}", json={"tax_rate": 5, "is_active": False})
    assert patched.status_code == 200
    assert patched.json()["tax_rate"] == 5.0
    assert patched.json()["is_active"] is False
    hidden = client.get("/api/products")
    assert hidden.json()["total"] == 0
    shown = client.get("/api/products", params={"active_only": False})
    assert shown.json()["total"] == 1


def test_sales_cannot_write_purchase_can(client, db):
    company, admin = _admin(db, code="PR2")
    create_active_user(db, email="sales@pr2.com", role="sales", company_id=company.id)
    create_active_user(db, email="purchase@pr2.com", role="purchase", company_id=company.id)
    login_user(client, "sales@pr2.com")
    assert client.get("/api/products").status_code == 200
    assert client.post("/api/products", json={"name": "X", "unit_price": 1, "tax_rate": 18}).status_code == 403
    login_user(client, "purchase@pr2.com")
    assert client.post("/api/products", json={"name": "X", "unit_price": 1, "tax_rate": 18}).status_code == 201


def test_duplicate_sku_and_bad_stock_and_tax_rate(client, db):
    company, admin = _admin(db, code="PR3")
    login_user(client, admin.email)
    assert client.post("/api/products", json={"name": "A", "sku": "DUP", "unit_price": 1, "tax_rate": 18}).status_code == 201
    assert client.post("/api/products", json={"name": "B", "sku": "DUP", "unit_price": 1, "tax_rate": 18}).status_code == 400
    assert client.post("/api/products", json={"name": "C", "unit_price": 1, "tax_rate": 101}).status_code == 400
    other = create_company(db, name="O", company_code="PR3O")
    foreign_stock = StockItem(company_id=other.id, name="Chip", sku="CH", unit="pcs", quantity=5, unit_price=1)
    db.add(foreign_stock)
    db.commit()
    db.refresh(foreign_stock)
    bad = client.post("/api/products", json={
        "name": "Linked", "unit_price": 1, "tax_rate": 18, "stock_item_id": foreign_stock.id,
    })
    assert bad.status_code == 400


def test_delete_unused_204_referenced_400(client, db):
    company, admin = _admin(db, code="PR4")
    customer = create_client(db, company_id=company.id, name="Buyer", assigned_to_id=admin.id)
    login_user(client, admin.email)
    pid = client.post("/api/products", json={"name": "A", "unit_price": 1, "tax_rate": 18}).json()["id"]
    assert client.delete(f"/api/products/{pid}").status_code == 204
    pid2 = client.post("/api/products", json={"name": "B", "unit_price": 1, "tax_rate": 18}).json()["id"]
    inv = Invoice(company_id=company.id, invoice_number="INV-P", client_id=customer.id, subtotal=1, tax=0, total=1)
    db.add(inv)
    db.flush()
    db.add(InvoiceItem(company_id=company.id, invoice_id=inv.id, description="B", quantity=1, unit_price=1, total=1, product_id=pid2))
    db.commit()
    assert client.delete(f"/api/products/{pid2}").status_code == 400
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && pytest tests/sales/test_products_api.py -v`

Expected: FAIL — `/api/products` 404.

- [ ] **Step 3: Write the router**

`backend/app/routers/sales/products.py` — follow `inventory.py` structure:

- `PRODUCT_WRITE_ROLES = {"purchase", "md", "admin"}`
- `_serialize(product, stock_quantity=None)` with `float(unit_price)`, `float(tax_rate)`
- `_blank_sku(value)` → `None` if missing/blank
- `_require_company(user)` 403 if no `company_id`
- `_get_product(db, user, product_id)` via `apply_company_scope` → 404
- `_validate_stock(db, user, stock_item_id)` → 400 if set and not in scope
- `_assert_writable(user)` 403 if role not in write set
- GET list: `active_only` default `True`; `q` ilike name/sku; join stock for quantity when `stock_item_id` set (query StockItem in-company by ids after fetch)
- DELETE: 400 `"Product is used on a quote or invoice"` if `db.query(QuoteItem).filter(QuoteItem.product_id==id).first()` or InvoiceItem same

Register in `backend/app/main.py`:

```python
from app.routers.sales.products import router as products_router
```

Next to quotes:

```python
app.include_router(products_router, prefix="/api/products", tags=["Products"])
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && pytest tests/sales/test_products_api.py tests/sales/test_products_schema.py -v`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/routers/sales/products.py backend/app/main.py backend/tests/sales/test_products_api.py
git commit -m "$(cat <<'EOF'
feat(products): company-scoped catalog CRUD with role gates

EOF
)"
```

---

### Task 4: Quote and invoice use product snapshots

**Files:**
- Modify: `backend/app/routers/finance/invoices.py`
- Modify: `backend/app/routers/sales/quotes.py`
- Modify: `backend/tests/sales/test_quotes.py`
- Test: `backend/tests/finance/test_products_gst.py`

**Interfaces:**
- Consumes: `resolve_sale_lines`, `deduct_stock`, `line_tax`, `compute_gst`
- Produces: quote/invoice header tax = sum of line taxes unless invoice body `tax` is sent; serialize line `product_id`, `hsn`, `tax_rate`, `tax`
- `QuoteItemIn.product_id: Optional[int] = None`; `unit_price: Optional[Decimal] = None`
- `InvoiceItemCreate.product_id: Optional[int] = None`; keep `unit_price: float = 0.0` so existing tests that send a price still work. Filling from product when `product_id` is set and the client sends `unit_price: 0` would wrongly replace catalog price with 0. Spec: explicit request values win. Invoice tests always send the real price. Quote test `_Line` omitted price. For invoices, treat `product_id` set + default 0 as “use catalog price” only if you also treat 0 as missing — **do not**. Invoices keep sending prices. Quotes: make `unit_price` optional; if omitted, fill from product.

Quote create (replace tax=0 path):
1. `company_tax_rate` from settings or 18.0
2. `try: lines = resolve_sale_lines(...) except ValueError as exc: raise HTTPException(400, str(exc))`
3. subtotal = sum(line.line_amount); header_tax = sum(line.tax)
4. `gst = compute_gst(subtotal=subtotal, rate_percent=company_tax_rate, seller_gstin=settings.gst_number, buyer_gstin=client.gstin, tax_override=header_tax)`
5. Quote.total = subtotal + gst.tax; store gst header fields
6. Persist QuoteItem snapshots; **do not** call `deduct_stock`

Quote `_serialize` items include product_id, hsn, tax_rate (string via `_money`), tax; header includes cgst/sgst/igst/tax_mode/gstins.

Quote accept:
1. Copy quote header money + GST fields onto Invoice (status Pending as today)
2. Copy each QuoteItem including product_id, hsn, tax_rate, tax
3. `lines = [ResolvedSaleLine(...) for item in quote.items]` **or** re-query products for `deduct_stock_item_id` from `item.product_id` (product may have been deactivated — still deduct from the stored product_id’s current `stock_item_id` if the product still exists). Spec: deduct if the product has stock_item_id. Load Product by id+company; if found and has stock_item_id, deduct qty.
4. Then `run_workflows` as today.

Simplest accept deduct: build `ResolvedSaleLine` list from quote items:

```python
from app.models.sales.product import Product
from app.services.sales.product_lines import ResolvedSaleLine, deduct_stock, resolve_sale_lines

accept_lines = []
for item in quote.items:
    deduct_id = None
    if item.product_id:
        product = db.query(Product).filter(Product.id == item.product_id, Product.company_id == quote.company_id).first()
        if product is not None:
            deduct_id = product.stock_item_id
    accept_lines.append(ResolvedSaleLine(
        description=item.description, quantity=item.quantity,
        unit_price=item.unit_price, hsn=item.hsn, tax_rate=item.tax_rate or 0,
        line_amount=item.total, tax=float(item.tax or 0),
        product_id=item.product_id, deduct_stock_item_id=deduct_id,
    ))
low_ids = deduct_stock(db, current_user, accept_lines)
# reuse existing low-stock notify loop from invoices.py (copy the notify_role_users block)
```

Invoice create: after validating qty/price, call `resolve_sale_lines`; subtotal from lines; `header_tax = body.tax if body.tax is not None else sum(line.tax)`; `compute_gst(..., tax_override=header_tax)`; persist InvoiceItem snapshots; `deduct_stock` instead of the inline stock_map loop; keep the low-stock notify loop using returned ids.

GET invoice detail items must include `product_id`, `tax_rate`, `tax`.

**Quote test updates** (`backend/tests/sales/test_quotes.py`): no CompanySettings → 18%.

- `test_create_and_accept_quote_creates_invoice`: `assert body["subtotal"] == "15000.00"`; `assert body["tax"] == "2700.00"`; `assert body["total"] == "17700.00"`; invoice `str(invoice.total) == "17700.00"`.
- Other tests that only check status codes stay.

- [ ] **Step 1: Write failing GST integration tests**

`backend/tests/finance/test_products_gst.py`:

```python
from app.models.core.company_settings import CompanySettings
from app.models.ops.stock_item import StockItem
from app.utils.rate_limit import auth_limiter
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_client, create_company


def _setup(client, db, *, gst_number=None, tax_rate=18.0):
    company = create_company(db, name="PG", company_code="PG1")
    admin = create_active_user(db, email="admin@pg1.com", role="admin", company_id=company.id)
    db.add(CompanySettings(
        company_id=company.id, company_name="PG", gst_number=gst_number, tax_rate=tax_rate,
    ))
    customer = create_client(db, company_id=company.id, name="Buyer", assigned_to_id=admin.id)
    db.commit()
    login_user(client, admin.email)
    p18 = client.post("/api/products", json={"name": "Std", "unit_price": 200, "tax_rate": 18, "hsn": "9983"}).json()
    p5 = client.post("/api/products", json={"name": "Food", "unit_price": 1000, "tax_rate": 5, "hsn": "2106"}).json()
    return company, admin, customer, p18, p5


def test_mixed_rates_sum_and_free_text_uses_company_rate(client, db):
    _company, _admin, customer, p18, p5 = _setup(client, db)
    created = client.post("/api/invoices", json={
        "client_id": customer.id,
        "items": [
            {"product_id": p5["id"], "quantity": 1, "unit_price": 1000, "description": "Food"},
            {"product_id": p18["id"], "quantity": 1, "unit_price": 200, "description": "Std"},
            {"description": "Extra", "quantity": 1, "unit_price": 100},
        ],
    })
    assert created.status_code == 201, created.text
    body = created.json()
    assert body["tax"] == 104.0  # 50 + 36 + 18
    assert body["tax_mode"] == "legacy"
    detail = client.get(f"/api/invoices/{body['id']}").json()
    rates = sorted(float(i["tax_rate"]) for i in detail["items"])
    assert rates == [5.0, 18.0, 18.0]


def test_quote_snapshots_then_accept_copies_and_deducts_stock(client, db):
    company, admin, customer, p18, _p5 = _setup(client, db)
    stock = StockItem(company_id=company.id, name="Kit", sku="KIT", unit="pcs", quantity=10, unit_price=200)
    db.add(stock)
    db.commit()
    db.refresh(stock)
    client.patch(f"/api/products/{p18['id']}", json={"stock_item_id": stock.id})
    deal = client.post("/api/deals", json={"title": "Job", "amount": "200.00", "client_id": customer.id}).json()
    quote = client.post("/api/quotes", json={
        "deal_id": deal["id"],
        "client_id": customer.id,
        "items": [{"product_id": p18["id"], "quantity": 3, "unit_price": 200, "description": "Std"}],
    })
    assert quote.status_code == 201, quote.text
    q = quote.json()
    assert q["tax"] == "108.00"
    assert q["total"] == "708.00"
    db.refresh(stock)
    assert stock.quantity == 10
    accepted = client.post(f"/api/quotes/{q['id']}/accept")
    assert accepted.status_code == 200, accepted.text
    db.refresh(stock)
    assert stock.quantity == 7
    invoice = client.get(f"/api/invoices/{accepted.json()['invoice_id']}").json()
    assert invoice["tax"] == 108.0
    assert invoice["items"][0]["product_id"] == p18["id"]
    assert invoice["items"][0]["hsn"] == "9983"
```

Also update `test_quotes.py` totals as specified above in the same step (those tests will fail after quote GST lands; write the new expected numbers **with** the implementation in Step 3, not before, if you want a clean red on `test_products_gst.py` first).

- [ ] **Step 2: Run the new GST tests to verify they fail**

Run: `cd backend && pytest tests/finance/test_products_gst.py -v`

Expected: FAIL — invoice tax is still one company rate on subtotal (234.0 on 1300 at 18%, not 104.0), quote tax still `"0.00"`.

- [ ] **Step 3: Implement quote + invoice changes**

Wire `resolve_sale_lines` / `deduct_stock` as described. Keep `notify_role_users` low-stock alerts. Map `ValueError` from resolve to HTTP 400.

Update `test_quotes.py` expected totals (15000 → 17700 with 18% on free-text).

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && pytest tests/finance/test_products_gst.py tests/finance/test_gst.py tests/finance/test_gst_invoice_api.py tests/sales/test_quotes.py tests/ops/test_inventory_api.py tests/sales/test_products_api.py -v`

Expected: PASS. Existing no-product GST invoice test still 36.0 on 200 @ 18%. Inventory test that sends `"tax": 0` still deducts stock (override 0 is a present tax — `body.tax is not None` is True for 0). That test already sends `tax: 0`; header tax stays 0; stock still deducts. Do not break it.

- [ ] **Step 5: Commit**

```bash
git add backend/app/routers/finance/invoices.py backend/app/routers/sales/quotes.py \
  backend/tests/finance/test_products_gst.py backend/tests/sales/test_quotes.py
git commit -m "$(cat <<'EOF'
feat(products): snapshot per-line GST on quotes and invoices

EOF
)"
```

---

### Task 5: Cross-tenant isolation

**Files:**
- Test: `backend/tests/tenancy/test_products_cross_tenant.py`

**Interfaces:**
- Consumes: `/api/products`, `/api/invoices` from Tasks 3–4
- Produces: B cannot GET/PATCH/DELETE A’s product (404); B using A’s `product_id` on invoice create is 400; A owner positive control succeeds

- [ ] **Step 1: Write the failing tests**

```python
import pytest

from app.utils.rate_limit import auth_limiter
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company, create_client


@pytest.fixture(autouse=True)
def _reset_auth_rate_limit():
    auth_limiter._buckets.clear()
    yield


def test_cross_tenant_product_is_404_and_foreign_product_id_is_400(client, db):
    a = create_company(db, name="A", company_code="PXA")
    b = create_company(db, name="B", company_code="PXB")
    create_active_user(db, email="admin@a.com", role="admin", company_id=a.id)
    create_active_user(db, email="admin@b.com", role="admin", company_id=b.id)
    buyer_b = create_client(db, company_id=b.id, name="B buyer")
    login_user(client, "admin@a.com")
    created = client.post("/api/products", json={"name": "A item", "unit_price": 10, "tax_rate": 18})
    assert created.status_code == 201, created.text
    pid = created.json()["id"]
    assert client.get(f"/api/products/{pid}").status_code == 200

    login_user(client, "admin@b.com")
    assert client.get(f"/api/products/{pid}").status_code == 404
    assert client.patch(f"/api/products/{pid}", json={"name": "stolen"}).status_code == 404
    assert client.delete(f"/api/products/{pid}").status_code == 404
    listed = client.get("/api/products")
    assert listed.status_code == 200
    assert listed.json()["total"] == 0
    inv = client.post("/api/invoices", json={
        "client_id": buyer_b.id,
        "items": [{"product_id": pid, "description": "x", "quantity": 1, "unit_price": 10}],
    })
    assert inv.status_code == 400

    login_user(client, "admin@a.com")
    assert client.get(f"/api/products/{pid}").status_code == 200
    assert client.patch(f"/api/products/{pid}", json={"name": "A item 2"}).status_code == 200
```

- [ ] **Step 2: Run test**

Run: `cd backend && pytest tests/tenancy/test_products_cross_tenant.py -v`

Expected: PASS if Task 3–4 scoping is correct. If it fails (B sees A’s row or 403 instead of 404), fix `apply_company_scope` on GET/PATCH/DELETE before continuing.

- [ ] **Step 3: Commit**

```bash
git add backend/tests/tenancy/test_products_cross_tenant.py
git commit -m "$(cat <<'EOF'
test(products): prove catalog and product_id are tenant-scoped

EOF
)"
```

---

### Task 6: Frontend catalog, invoice picker, quote editor

**Files:**
- Create: `frontend/components/products/ProductsPage.jsx`
- Create: `frontend/app/sales/products/page.jsx`
- Create: `frontend/app/manager/products/page.jsx`
- Create: `frontend/app/md/products/page.jsx`
- Create: `frontend/app/purchase/products/page.jsx`
- Create: `frontend/app/admin/products/page.jsx`
- Modify: `frontend/components/Sidebar.jsx`
- Modify: `frontend/components/shared/CreateOrderModal.jsx`
- Modify: `frontend/app/sales/deals/[id]/page.jsx`
- Modify: `docs/IMPLEMENTATION_PLAN.md` (Phase 4.1 progress log)

**Interfaces:**
- Consumes: `/api/products`, `/api/inventory` (stock link picker), existing invoice/quote APIs
- Produces: role pages; sidebar entries; invoice modal product select; deal quote line editor showing subtotal + tax

Role pages (mirror stock):

```jsx
'use client';
import ProductsPage from '../../../components/products/ProductsPage';

export default function SalesProductsPage() {
    return <ProductsPage roleLabel="Sales Team" />;
}
```

Admin: `'@/components/products/ProductsPage'` if that alias is what admin pages use; sales/manager/md/purchase use relative `../../../components/...` like stock. `canManage` true on md, purchase, admin.

`ProductsPage` must handle loading / error / empty / success. Fields: name, sku, unit, unit_price, tax_rate, hsn, optional stock `<select>` from `GET /inventory?limit=500`. Create POST; row deactivate via PATCH `is_active: false`; delete via DELETE with confirm. Search filters client-side like StockPage. Sales/manager: hide the create form; empty copy “Ask an admin to add catalog items.”

Sidebar: import `ShoppingBag`, add to `ICON_MAP`. Insert `{ name: 'Products', href: '/sales/products', icon: 'ShoppingBag' }` immediately after Stock for sales/manager/md/purchase. Admin: after Audit Logs, `href: '/admin/products'`.

`CreateOrderModal`:
- `EMPTY_ITEM` gains `product_id: null`, `tax_rate: null`
- Fetch `GET /products?active_only=true` when open
- Product `<select>` next to the stock select. On change: set product_id, description, unit_price, hsn, tax_rate from the product; clear stock_item_id
- `lineTaxSum = items.reduce((s,i) => s + (qty * price * Number(i.tax_rate ?? 0) / 100), 0)` — free-text `tax_rate` is null, so they won’t contribute until you set a default. Fetch is incomplete for company rate. **Use 18 as the free-text fallback in the preview only** (server still uses CompanySettings). Or fetch `/admin/settings` if already loaded — do **not** add a new settings call. Preview: `Number(item.tax_rate ?? 18)`.
- `taxTouched` state, default false. Displayed tax = `taxTouched ? tax : lineTaxSum`. When user edits the tax input, set `taxTouched` true.
- Submit `product_id` on each item. Send `tax` only if `taxTouched` (same as today’s `...(tax ? { tax } : {})` but using touched so a computed 18% isn’t sent as an override accidentally). When untouched, omit `tax` and let the server sum lines.

Deal quote UI: replace one-click `createQuote` with a small editor: one or more lines (description, qty, price, product select), show `subtotal` and `tax` live using the same 18-fallback preview, POST `/quotes` with those items. Keep accept/reject. Show `q.tax` on each quote card.

IMPLEMENTATION_PLAN.md: after Phase 3.9, add **Phase 4.1 — Products price book + tax — DONE (code)** with spec/plan links, test file names, `create_missing_tables.py` deploy note, residuals (no price books, no HSN table, no `/api/v1` product_id).

- [ ] **Step 1: Build ProductsPage + role routes + sidebar**

Four data states required. `canManage` gates write controls.

- [ ] **Step 2: Wire CreateOrderModal + deal quote editor**

- [ ] **Step 3: Verify**

Run: `cd backend && pytest tests/sales/test_products_schema.py tests/sales/test_products_api.py tests/sales/test_product_lines.py tests/finance/test_products_gst.py tests/finance/test_gst.py tests/finance/test_gst_invoice_api.py tests/sales/test_quotes.py tests/tenancy/test_products_cross_tenant.py tests/ops/test_inventory_api.py -v`

Run: `cd frontend && npx next build` (or the project’s existing build command).

If a browser is available, log in as admin: create two products (18% and 5%), create an invoice with both plus a typed line, confirm tax; accept a quote with a stock-linked product and confirm qty dropped. If no browser: say so; backend tests above are the proof.

- [ ] **Step 4: Commit**

```bash
git add frontend/components/products/ProductsPage.jsx \
  frontend/app/sales/products/page.jsx frontend/app/manager/products/page.jsx \
  frontend/app/md/products/page.jsx frontend/app/purchase/products/page.jsx \
  frontend/app/admin/products/page.jsx frontend/components/Sidebar.jsx \
  frontend/components/shared/CreateOrderModal.jsx \
  frontend/app/sales/deals/\[id\]/page.jsx docs/IMPLEMENTATION_PLAN.md
git commit -m "$(cat <<'EOF'
feat(products): catalog UI and product pickers on quotes and invoices

EOF
)"
```

---

## Self-review (plan vs spec)

| Spec requirement | Task |
|---|---|
| `products` table + unique SKU | 1 |
| Quote/invoice line snapshots + quote GST header columns | 1 |
| `_MISSING_COLUMNS` / no Alembic | 1 |
| `line_tax` + per-line then header `compute_gst` | 2, 4 |
| Free-text uses company tax_rate | 2, 4 |
| Invoice tax override still header-only | 4 (`body.tax is not None`) |
| CRUD `/api/products` + write roles | 3 |
| Inactive hidden by default | 3 |
| Delete unused 204 / referenced 400 | 3 |
| Quote tax no longer 0; tests updated | 4 |
| Accept copies snapshots then deducts stock | 4 |
| Cross-tenant 404 + foreign product_id 400 | 5 |
| Products pages + sidebar | 6 |
| CreateOrderModal product picker | 6 |
| Deal quote line editor | 6 |
| No price books / no `/api/v1` product_id / no HSN table | global non-goals |

No placeholders remain except none. `deduct_stock` lives in Task 2 so Task 4 can call it by name.
