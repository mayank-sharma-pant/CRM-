# Customer Portal (view invoice/quote) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Staff mint magic links so a customer can view one invoice or one quote without logging in; regenerate/revoke kills the old URL.

**Architecture:** `share_token_hash` + `share_created_at` on `invoices` and `quotes`. Staff `POST`/`DELETE …/share` under JWT. Public `GET /api/portal/{invoices|quotes}/{token}` returns a read-only DTO. Next pages at `/p/invoice/[token]` and `/p/quote/[token]`. Hash at rest via SHA-256; raw token returned once on mint.

**Tech Stack:** FastAPI, SQLAlchemy, Next.js App Router, axios/`fetch`, Tailwind. Tests: pytest + FastAPI `TestClient` (in-memory SQLite).

**Spec:** [docs/superpowers/specs/2026-08-25-phase4-customer-portal-design.md](../specs/2026-08-25-phase4-customer-portal-design.md)

## Global Constraints

- No new pip dependency. No Alembic (two pre-existing heads).
- New columns via `_MISSING_COLUMNS` in `backend/create_missing_tables.py` plus matching SQLAlchemy attributes. No new tables.
- Never take `company_id` from the request body.
- By-id miss (including cross-tenant) is **404**. Public miss/revoked/unknown token is **404** with generic `"not found"`.
- View only — no accept/pay/login on portal routes.
- Mint: `secrets.token_urlsafe(32)`; persist `hashlib.sha256(raw.encode("utf-8")).hexdigest()`.
- Staff share: anyone who can already GET that invoice/quote (same company + existing sales/manager row rules where they apply).
- Test password `"pw"`. Reset `auth_limiter._buckets.clear()` (and portal limiter buckets if added) in login-heavy tests.
- Run pytest from `backend/` with `.venv/bin/pytest` if needed: `pytest tests/... -v`.
- `git add` only the files listed in that task.

### File map

| File | Responsibility |
|---|---|
| `backend/app/models/finance/invoice.py` | `share_token_hash`, `share_created_at` on Invoice |
| `backend/app/models/sales/quote.py` | same on Quote |
| `backend/create_missing_tables.py` | `_MISSING_COLUMNS` ALTERs |
| `backend/app/services/portal/share_links.py` | mint/hash + apply/revoke helpers + public DTO builders |
| `backend/app/routers/finance/invoices.py` | `POST`/`DELETE /{id}/share`; detail adds `share_active` / `share_created_at` |
| `backend/app/routers/sales/quotes.py` | same for quotes |
| `backend/app/routers/public/portal.py` | `GET /api/portal/invoices/{token}`, `GET /api/portal/quotes/{token}` |
| `backend/app/main.py` | include portal router |
| `backend/app/utils/rate_limit.py` | optional `portal_limiter` instance |
| `frontend/components/portal/ShareLinkControls.jsx` | Share / Copy / Revoke UI for CRM |
| `frontend/app/sales/invoices/[invoiceId]/page.jsx` (and manager/purchase siblings) | wire ShareLinkControls |
| `frontend/app/sales/deals/[id]/page.jsx` | share control per quote row |
| `frontend/app/p/invoice/[token]/page.jsx` | public invoice view |
| `frontend/app/p/quote/[token]/page.jsx` | public quote view |
| `frontend/src/middleware.ts`, `RouteGuard.jsx`, `Layout.jsx`, `services/api.js` | allow `/p/*` without session |
| `docs/IMPLEMENTATION_PLAN.md` | Phase 4.3 progress log |

---

### Task 1: Schema columns

**Files:**
- Modify: `backend/app/models/finance/invoice.py`
- Modify: `backend/app/models/sales/quote.py`
- Modify: `backend/create_missing_tables.py`
- Test: `backend/tests/portal/test_portal_schema.py`

**Interfaces:**
- Consumes: existing `Invoice`, `Quote`
- Produces: `share_token_hash: str | None` (String 64, unique), `share_created_at: datetime | None` on both models

- [ ] **Step 1: Write the failing schema test**

```python
from datetime import datetime, timezone

from sqlalchemy import inspect

from app.models.finance.invoice import Invoice
from app.models.sales.quote import Quote
from tests.helpers.factories import create_company


def test_share_columns_exist(db_engine):
    inv_cols = {c["name"] for c in inspect(db_engine).get_columns("invoices")}
    quote_cols = {c["name"] for c in inspect(db_engine).get_columns("quotes")}
    for cols in (inv_cols, quote_cols):
        assert "share_token_hash" in cols
        assert "share_created_at" in cols


def test_can_persist_share_hash_on_invoice_and_quote(db):
    company = create_company(db, name="Portal Co", company_code="PRT")
    # Minimal rows: reuse patterns from other schema tests if factories lack invoice/quote —
    # create via ORM with required FKs (client) as existing test_can_persist_a_deal style.
    from app.models.sales.client import Client
    from app.models.core.enums import InvoiceStatus, QuoteStatus

    client = Client(company_id=company.id, name="Buyer")
    db.add(client)
    db.flush()
    inv = Invoice(
        company_id=company.id,
        invoice_number="INV-P-1",
        client_id=client.id,
        status=InvoiceStatus.DRAFT,
        share_token_hash="a" * 64,
        share_created_at=datetime.now(timezone.utc),
    )
    q = Quote(
        company_id=company.id,
        quote_number="Q-P-1",
        client_id=client.id,
        status=QuoteStatus.DRAFT,
        share_token_hash="b" * 64,
        share_created_at=datetime.now(timezone.utc),
    )
    db.add_all([inv, q])
    db.commit()
    db.refresh(inv)
    db.refresh(q)
    assert inv.share_token_hash == "a" * 64
    assert q.share_token_hash == "b" * 64
    assert inv.share_created_at is not None
    assert q.share_created_at is not None
```

If `InvoiceStatus` / `QuoteStatus` import paths differ, open `app/models/core/enums.py` and use the real enum members. If timezone-aware datetimes fail on SQLite, use `datetime.utcnow()` to match sibling tests.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && .venv/bin/pytest tests/portal/test_portal_schema.py -v`

Expected: FAIL — columns missing.

- [ ] **Step 3: Write minimal implementation**

On `Invoice` and `Quote` (after existing timestamp columns is fine):

```python
share_token_hash = Column(String(64), nullable=True, unique=True, index=True)
share_created_at = Column(DateTime, nullable=True)
```

Append to `_MISSING_COLUMNS`:

```python
    ("invoices", "share_token_hash", "VARCHAR(64)"),
    ("invoices", "share_created_at", "TIMESTAMP"),
    ("quotes", "share_token_hash", "VARCHAR(64)"),
    ("quotes", "share_created_at", "TIMESTAMP"),
```

(Unique on ALTER is not enforced by `_MISSING_COLUMNS`; model `unique=True` covers fresh `create_all` / test DB. Residual: prod ALTER may need a manual unique index later — note in IMPLEMENTATION_PLAN only if you confirm ALTER does not add UNIQUE.)

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && .venv/bin/pytest tests/portal/test_portal_schema.py -v`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/models/finance/invoice.py backend/app/models/sales/quote.py \
  backend/create_missing_tables.py backend/tests/portal/test_portal_schema.py
git commit -m "$(cat <<'EOF'
feat(portal): add share token columns on invoices and quotes

EOF
)"
```

---

### Task 2: Share link service

**Files:**
- Create: `backend/app/services/portal/__init__.py` (empty)
- Create: `backend/app/services/portal/share_links.py`
- Test: `backend/tests/portal/test_share_links_service.py`

**Interfaces:**
- Consumes: Task 1 columns; `Invoice`/`Quote` duck-typed rows; `Company`, `Client`
- Produces:

```python
def mint_share_token() -> tuple[str, str]:
    """Return (raw_token, token_hash)."""

def hash_share_token(raw: str) -> str: ...

def apply_share(doc, *, now=None) -> tuple[str, str]:
    """Mint, set doc.share_token_hash + share_created_at; return (raw, url_path_suffix unused — return raw + hash)."""

def revoke_share(doc) -> None:
    """Null hash and created_at."""

def portal_invoice_dto(invoice, *, client, company) -> dict: ...
def portal_quote_dto(quote, *, client, company) -> dict: ...
```

DTO keys exactly as the spec (invoice vs quote). Money fields as float or string consistent with existing serializers (`float(...)` is fine). Status as `.value` if enum. **Omit** `company_id`, `share_token_hash`, user ids, `product_id`, `client_id`, `deal_id`.

`apply_share` must overwrite an existing hash (regenerate).

- [ ] **Step 1: Write failing service tests**

```python
from types import SimpleNamespace
from decimal import Decimal

from app.services.portal.share_links import (
    apply_share, hash_share_token, mint_share_token, portal_invoice_dto, revoke_share,
)


def test_mint_hash_roundtrip_and_apply_revoke():
    raw, h = mint_share_token()
    assert len(raw) >= 32
    assert h == hash_share_token(raw)
    assert h != raw
    doc = SimpleNamespace(share_token_hash=None, share_created_at=None)
    raw2, h2 = apply_share(doc)
    assert doc.share_token_hash == h2 == hash_share_token(raw2)
    assert doc.share_created_at is not None
    old = raw2
    raw3, h3 = apply_share(doc)
    assert hash_share_token(old) != h3
    revoke_share(doc)
    assert doc.share_token_hash is None
    assert doc.share_created_at is None


def test_portal_invoice_dto_omits_secrets():
    inv = SimpleNamespace(
        invoice_number="INV-1", status="sent",
        issued_date=None, due_date=None, paid_date=None,
        seller_gstin="AA", buyer_gstin="BB", place_of_supply="29", tax_mode="igst",
        subtotal=Decimal("100"), tax=Decimal("18"), cgst=0, sgst=0, igst=Decimal("18"),
        discount=0, total=Decimal("118"), notes="n",
        items=[SimpleNamespace(
            description="Roof", quantity=1, unit_price=Decimal("100"),
            tax=Decimal("18"), tax_rate=Decimal("18"), hsn="1234", total=Decimal("118"),
            product_id=99,
        )],
        company_id=1, share_token_hash="secret",
    )
    client = SimpleNamespace(name="Buyer Co")
    company = SimpleNamespace(name="Seller Co")
    dto = portal_invoice_dto(inv, client=client, company=company)
    assert dto["invoice_number"] == "INV-1"
    assert dto["client_name"] == "Buyer Co"
    assert dto["company_name"] == "Seller Co"
    assert "company_id" not in dto
    assert "share_token_hash" not in dto
    assert "product_id" not in dto["items"][0]
```

Add a parallel `test_portal_quote_dto_shape` asserting `quote_number` / `title` and same omit rules.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && .venv/bin/pytest tests/portal/test_share_links_service.py -v`

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `share_links.py`**

```python
import hashlib
import secrets
from datetime import datetime, timezone


def hash_share_token(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def mint_share_token() -> tuple[str, str]:
    raw = secrets.token_urlsafe(32)
    return raw, hash_share_token(raw)


def apply_share(doc, *, now=None) -> tuple[str, str]:
    raw, token_hash = mint_share_token()
    doc.share_token_hash = token_hash
    doc.share_created_at = now or datetime.now(timezone.utc)
    return raw, token_hash


def revoke_share(doc) -> None:
    doc.share_token_hash = None
    doc.share_created_at = None


def _money(v):
    if v is None:
        return 0.0
    return float(v)


def _status(v):
    return v.value if hasattr(v, "value") else v


def _items(rows):
    return [
        {
            "description": it.description,
            "quantity": it.quantity,
            "unit_price": _money(it.unit_price),
            "tax": _money(getattr(it, "tax", 0)),
            "tax_rate": _money(getattr(it, "tax_rate", None)) if getattr(it, "tax_rate", None) is not None else None,
            "hsn": getattr(it, "hsn", None),
            "total": _money(it.total),
        }
        for it in (rows or [])
    ]


def portal_invoice_dto(invoice, *, client, company) -> dict:
    return {
        "invoice_number": invoice.invoice_number,
        "status": _status(invoice.status),
        "issued_date": invoice.issued_date.isoformat() if invoice.issued_date else None,
        "due_date": invoice.due_date.isoformat() if invoice.due_date else None,
        "paid_date": invoice.paid_date.isoformat() if getattr(invoice, "paid_date", None) else None,
        "client_name": client.name if client else None,
        "seller_gstin": invoice.seller_gstin,
        "buyer_gstin": invoice.buyer_gstin,
        "place_of_supply": invoice.place_of_supply,
        "tax_mode": invoice.tax_mode,
        "subtotal": _money(invoice.subtotal),
        "tax": _money(invoice.tax),
        "cgst": _money(invoice.cgst),
        "sgst": _money(invoice.sgst),
        "igst": _money(invoice.igst),
        "discount": _money(getattr(invoice, "discount", 0)),
        "total": _money(invoice.total),
        "notes": invoice.notes,
        "company_name": company.name if company else None,
        "items": _items(invoice.items),
    }


def portal_quote_dto(quote, *, client, company) -> dict:
    return {
        "quote_number": quote.quote_number,
        "title": quote.title,
        "status": _status(quote.status),
        "client_name": client.name if client else None,
        "seller_gstin": quote.seller_gstin,
        "buyer_gstin": quote.buyer_gstin,
        "place_of_supply": quote.place_of_supply,
        "tax_mode": quote.tax_mode,
        "subtotal": _money(quote.subtotal),
        "tax": _money(quote.tax),
        "cgst": _money(quote.cgst),
        "sgst": _money(quote.sgst),
        "igst": _money(quote.igst),
        "total": _money(quote.total),
        "notes": quote.notes,
        "company_name": company.name if company else None,
        "items": _items(quote.items),
    }
```

- [ ] **Step 4: Run tests**

Run: `cd backend && .venv/bin/pytest tests/portal/test_share_links_service.py tests/portal/test_portal_schema.py -v`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/portal/ backend/tests/portal/test_share_links_service.py
git commit -m "$(cat <<'EOF'
feat(portal): mint/hash/revoke helpers and public DTOs

EOF
)"
```

---

### Task 3: Staff share + public portal API

**Files:**
- Create: `backend/app/routers/public/portal.py`
- Modify: `backend/app/main.py`
- Modify: `backend/app/routers/finance/invoices.py`
- Modify: `backend/app/routers/sales/quotes.py`
- Modify: `backend/app/utils/rate_limit.py` (add `portal_limiter = RateLimiter()` next to existing `public_form_limiter`)
- Test: `backend/tests/portal/test_portal_api.py`

**Interfaces:**
- Consumes: `apply_share`, `revoke_share`, `hash_share_token`, `portal_invoice_dto`, `portal_quote_dto`
- Produces: staff + public HTTP behaviour from the spec

Staff responses:

```python
{"token": raw, "url": f"/p/invoice/{raw}", "created_at": isoformat}
# quotes → /p/quote/{raw}
```

Detail GET: add `"share_active": bool(invoice.share_token_hash)`, `"share_created_at": iso or null`.

Public: no `Depends(get_current_user)`. On GET, `portal_limiter.check(request, "portal", max_attempts=60, window_seconds=60)` (tune if existing form limiter uses different numbers — mirror `public_form_limiter` usage in `public/lead_forms.py`). Lookup by hash; load client + company; return DTO. Miss → 404 `"not found"`.

Invoice share endpoints must reuse the **same access checks** as `get_invoice` (sales creator / manager team). Quote share: same scope as `get_quote`.

Register: `app.include_router(portal_router, prefix="/api/portal", tags=["Portal"])`.

- [ ] **Step 1: Write failing API tests**

```python
import pytest

from app.utils.rate_limit import auth_limiter
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_client, create_company


@pytest.fixture(autouse=True)
def _reset_auth():
    auth_limiter._buckets.clear()
    yield


def _make_invoice(client, db, company, admin):
    buyer = create_client(db, company_id=company.id, name="Buyer", assigned_to_id=admin.id)
    res = client.post("/api/invoices", json={
        "client_id": buyer.id,
        "items": [{"description": "Work", "quantity": 1, "unit_price": 100}],
    })
    assert res.status_code in (200, 201), res.text
    return res.json()


def test_share_mint_public_get_regenerate_revoke(client, db):
    company = create_company(db, name="A Co", company_code="PCA")
    admin = create_active_user(db, email="admin@pca.com", role="admin", company_id=company.id)
    login_user(client, admin.email)
    inv = _make_invoice(client, db, company, admin)
    iid = inv["id"]
    mint = client.post(f"/api/invoices/{iid}/share")
    assert mint.status_code == 200, mint.text
    body = mint.json()
    assert body["token"]
    assert body["url"] == f"/p/invoice/{body['token']}"
    token = body["token"]
    # public — clear cookies by using a fresh client pattern: logout or headers without auth
    client.cookies.clear()
    got = client.get(f"/api/portal/invoices/{token}")
    assert got.status_code == 200, got.text
    data = got.json()
    assert data["invoice_number"]
    assert "company_id" not in data
    assert "share_token_hash" not in data
    # regenerate
    login_user(client, admin.email)
    mint2 = client.post(f"/api/invoices/{iid}/share").json()
    client.cookies.clear()
    assert client.get(f"/api/portal/invoices/{token}").status_code == 404
    assert client.get(f"/api/portal/invoices/{mint2['token']}").status_code == 200
    login_user(client, admin.email)
    assert client.delete(f"/api/invoices/{iid}/share").status_code == 204
    client.cookies.clear()
    assert client.get(f"/api/portal/invoices/{mint2['token']}").status_code == 404


def test_quote_share_and_public_get(client, db):
    company = create_company(db, name="Q Co", company_code="PCQ")
    admin = create_active_user(db, email="admin@pcq.com", role="admin", company_id=company.id)
    login_user(client, admin.email)
    buyer = create_client(db, company_id=company.id, name="Buyer", assigned_to_id=admin.id)
    # create deal if quotes require deal_id — check QuoteCreate; many tests pass deal_id
    from tests.helpers.factories import create_deal  # if missing, POST /api/deals first
    deal = client.post("/api/deals", json={"title": "Job", "amount": "100", "client_id": buyer.id}).json()
    q = client.post("/api/quotes", json={
        "deal_id": deal["id"],
        "client_id": buyer.id,
        "items": [{"description": "Line", "quantity": 1, "unit_price": 50}],
    })
    assert q.status_code in (200, 201), q.text
    qid = q.json()["id"]
    mint = client.post(f"/api/quotes/{qid}/share")
    assert mint.status_code == 200, mint.text
    token = mint.json()["token"]
    client.cookies.clear()
    got = client.get(f"/api/portal/quotes/{token}")
    assert got.status_code == 200, got.text
    assert got.json()["quote_number"]
    assert "company_id" not in got.json()


def test_detail_includes_share_active(client, db):
    company = create_company(db, name="D Co", company_code="PCD")
    admin = create_active_user(db, email="admin@pcd.com", role="admin", company_id=company.id)
    login_user(client, admin.email)
    inv = _make_invoice(client, db, company, admin)
    before = client.get(f"/api/invoices/{inv['id']}").json()
    assert before.get("share_active") is False
    client.post(f"/api/invoices/{inv['id']}/share")
    after = client.get(f"/api/invoices/{inv['id']}").json()
    assert after.get("share_active") is True
    assert after.get("share_created_at")
```

Fix invoice create payload to match existing `test_gst_invoice_api.py` / `test_quotes.py` exactly if the stub above differs (read those files and copy the working JSON). If `client.cookies.clear()` does not drop auth in this project’s TestClient, use a second fixture client or omit Authorization header per how other public-form tests work — search `tests/` for `/api/public/forms`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && .venv/bin/pytest tests/portal/test_portal_api.py -v`

Expected: FAIL — 404 on share routes / portal.

- [ ] **Step 3: Implement routers**

In `invoices.py` (after access checks mirrored from `get_invoice`):

```python
@router.post("/{invoice_id}/share")
def share_invoice(...):
    # load invoice with same scope/403 rules as get_invoice
    raw, _ = apply_share(invoice)
    db.commit()
    created = invoice.share_created_at
    return {
        "token": raw,
        "url": f"/p/invoice/{raw}",
        "created_at": created.isoformat() if created else None,
    }

@router.delete("/{invoice_id}/share", status_code=204)
def revoke_invoice_share(...):
    revoke_share(invoice)
    db.commit()
    return Response(status_code=204)
```

Same for quotes with `/p/quote/{raw}`. Extend `_serialize` / `get_invoice` return dict with `share_active` and `share_created_at`.

`portal.py`:

```python
router = APIRouter()

@router.get("/invoices/{token}")
def public_invoice(token: str, request: Request, db: Session = Depends(get_db)):
    portal_limiter.check(request, "portal", max_attempts=60, window_seconds=60)
    token_hash = hash_share_token(token)
    invoice = db.query(Invoice).filter(Invoice.share_token_hash == token_hash).first()
    if invoice is None:
        raise HTTPException(status_code=404, detail="not found")
    client = db.query(Client).filter(Client.id == invoice.client_id).first()
    company = db.query(Company).filter(Company.id == invoice.company_id).first()
    # ensure items loaded
    return portal_invoice_dto(invoice, client=client, company=company)
```

Mirror for quotes. Include router in `main.py`.

- [ ] **Step 4: Run tests**

Run: `cd backend && .venv/bin/pytest tests/portal/ tests/finance/test_gst_invoice_api.py tests/sales/test_quotes.py -v`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/routers/public/portal.py backend/app/main.py \
  backend/app/routers/finance/invoices.py backend/app/routers/sales/quotes.py \
  backend/app/utils/rate_limit.py backend/tests/portal/test_portal_api.py
git commit -m "$(cat <<'EOF'
feat(portal): staff share endpoints and public document GET

EOF
)"
```

---

### Task 4: Cross-tenant isolation

**Files:**
- Test: `backend/tests/tenancy/test_portal_cross_tenant.py`

**Interfaces:**
- Consumes: Task 3 endpoints
- Produces: B cannot share A’s invoice/quote (404); B’s public token cannot read A’s doc; A positive control

- [ ] **Step 1: Write the test**

```python
import pytest

from app.utils.rate_limit import auth_limiter
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_client, create_company


@pytest.fixture(autouse=True)
def _reset_auth():
    auth_limiter._buckets.clear()
    yield


def test_cross_tenant_cannot_share_or_read_portal(client, db):
    a = create_company(db, name="A", company_code="PTA")
    b = create_company(db, name="B", company_code="PTB")
    admin_a = create_active_user(db, email="admin@pta.com", role="admin", company_id=a.id)
    create_active_user(db, email="admin@ptb.com", role="admin", company_id=b.id)
    login_user(client, "admin@pta.com")
    buyer = create_client(db, company_id=a.id, name="Buyer", assigned_to_id=admin_a.id)
    inv = client.post("/api/invoices", json={
        "client_id": buyer.id,
        "items": [{"description": "Work", "quantity": 1, "unit_price": 100}],
    }).json()
    mint = client.post(f"/api/invoices/{inv['id']}/share")
    assert mint.status_code == 200
    token = mint.json()["token"]
    iid = inv["id"]

    login_user(client, "admin@ptb.com")
    assert client.post(f"/api/invoices/{iid}/share").status_code == 404
    assert client.delete(f"/api/invoices/{iid}/share").status_code == 404

    client.cookies.clear()
    # B has no session — token still works for the real document (public);
    # prove a random other token 404s and A owner can still revoke
    assert client.get(f"/api/portal/invoices/{token}").status_code == 200
    assert client.get("/api/portal/invoices/not-a-real-token").status_code == 404

    login_user(client, "admin@pta.com")
    assert client.delete(f"/api/invoices/{iid}/share").status_code == 204
```

Also mint a quote for A and assert B’s `POST /api/quotes/{qid}/share` → 404.

- [ ] **Step 2: Run test**

Run: `cd backend && .venv/bin/pytest tests/tenancy/test_portal_cross_tenant.py -v`

Expected: PASS (or fix scoping to stay 404).

- [ ] **Step 3: Commit**

```bash
git add backend/tests/tenancy/test_portal_cross_tenant.py
git commit -m "$(cat <<'EOF'
test(portal): prove share config and tokens are tenant-safe

EOF
)"
```

---

### Task 5: Frontend CRM + public pages + progress log

**Files:**
- Create: `frontend/components/portal/ShareLinkControls.jsx`
- Modify: `frontend/app/sales/invoices/[invoiceId]/page.jsx`
- Modify: `frontend/app/manager/invoices/[invoiceId]/page.jsx`
- Modify: `frontend/app/purchase/invoices/[invoiceId]/page.jsx`
- Modify: `frontend/app/sales/deals/[id]/page.jsx` (quote rows)
- Create: `frontend/app/p/invoice/[token]/page.jsx`
- Create: `frontend/app/p/quote/[token]/page.jsx`
- Modify: `frontend/src/middleware.ts` — treat `pathname.startsWith('/p/')` as public
- Modify: `frontend/components/RouteGuard.jsx` — `/p` and `/p/` public like `/f/`
- Modify: `frontend/components/Layout.jsx` — no chrome for `/p/`
- Modify: `frontend/services/api.js` — add `/p` to publicPaths (401 interceptor)
- Modify: `docs/IMPLEMENTATION_PLAN.md`

**Interfaces:**
- Consumes: staff share APIs; public portal GETs; `share_active` on detail
- Produces: working share UI + public document pages

- [ ] **Step 1: ShareLinkControls**

Props: `kind: 'invoice' | 'quote'`, `id: number`, `shareActive: boolean`, `onChange: () => void` (refetch parent).

Behaviour:
- Button “Share link” / “Regenerate” → `POST /invoices/{id}/share` or `/quotes/{id}/share`
- On success: keep token in component state; show copyable `window.location.origin + url`; toast success
- “Copy” uses clipboard API on the in-memory URL only
- “Revoke” → `DELETE …/share` then clear local token; call `onChange`
- If `shareActive` and no local token: show “Link active” + Regenerate + Revoke (no recoverable URL)

Use real `<button type="button">` and existing `showToast` if the parent passes it, or import the project’s toast helper (grep `showToast` in invoice pages / Auth — mirror deals page).

- [ ] **Step 2: Wire CRM pages**

Invoice detail pages: after load, pass `d.id`, `d.share_active`, refetch on change.  
Deal quotes list: per quote row, `ShareLinkControls kind="quote" id={q.id} shareActive={q.share_active}` — ensure list/detail serialize includes `share_active` (Task 3 `_serialize`).

- [ ] **Step 3: Public pages**

```jsx
'use client';
// page.jsx — useParams().token
// fetch(`/api/portal/invoices/${token}`) — same pattern as frontend/app/f/[slug]/page.jsx
// states: loading | error | success
// render company_name, number, client_name, status, line table, totals, GST if present
```

Mirror for quotes. No login chrome (Layout/middleware/RouteGuard already allowlisted).

- [ ] **Step 4: IMPLEMENTATION_PLAN.md**

After Phase 4.2 section add:

```markdown
### Phase 4.3 — Customer portal (view invoice/quote) — DONE (code)

Staff-minted magic links; hash at rest; public view-only invoice/quote pages.
Spec: [`superpowers/specs/2026-08-25-phase4-customer-portal-design.md`](./superpowers/specs/2026-08-25-phase4-customer-portal-design.md); plan: [`superpowers/plans/2026-08-25-phase4-customer-portal.md`](./superpowers/plans/2026-08-25-phase4-customer-portal.md).

- **Verification:** `test_portal_schema.py`, `test_share_links_service.py`, `test_portal_api.py`, `test_portal_cross_tenant.py`.
- **Deploy:** `create_missing_tables.py` for `share_token_hash` / `share_created_at` on `invoices` and `quotes`.
- **Residuals:** no expiry, no email of link, no accept/pay; ALTER path may not add UNIQUE (model unique on fresh DBs); rate limit via `portal_limiter` if wired.
```

- [ ] **Step 5: Verify**

Run: `cd backend && .venv/bin/pytest tests/portal/ tests/tenancy/test_portal_cross_tenant.py -v`  
Run: `cd frontend && npx next build` (or note if blocked).

- [ ] **Step 6: Commit**

```bash
git add frontend/components/portal/ShareLinkControls.jsx \
  frontend/app/sales/invoices/[invoiceId]/page.jsx \
  frontend/app/manager/invoices/[invoiceId]/page.jsx \
  frontend/app/purchase/invoices/[invoiceId]/page.jsx \
  frontend/app/sales/deals/[id]/page.jsx \
  frontend/app/p/ \
  frontend/src/middleware.ts frontend/components/RouteGuard.jsx \
  frontend/components/Layout.jsx frontend/services/api.js \
  docs/IMPLEMENTATION_PLAN.md
git commit -m "$(cat <<'EOF'
feat(portal): share controls and public invoice/quote pages

EOF
)"
```

---

## Self-review (plan vs spec)

| Spec requirement | Task |
|---|---|
| Columns + `_MISSING_COLUMNS` | 1 |
| Mint/hash/revoke + DTOs omit secrets | 2 |
| Staff POST/DELETE share, public GET, detail `share_active`, rate limiter if easy | 3 |
| Cross-tenant 404 + positive | 4 |
| CRM share UI, `/p/*` pages, middleware/guard/layout/api public, progress log | 5 |
| No login/accept/pay/email/expiry | global non-goals |

No placeholders remain. Token helpers named consistently `mint_share_token` / `hash_share_token` / `apply_share` / `revoke_share` across Tasks 2–3.
