"""Phase 7.7 — price books API and line resolution."""
import pytest

from app.models.core.company_settings import CompanySettings
from app.models.sales.price_book import PriceBook, PriceBookEntry
from app.models.sales.product import Product
from app.services.sales.product_lines import resolve_sale_lines
from app.utils.rate_limit import auth_limiter
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_client, create_company


@pytest.fixture(autouse=True)
def _reset_auth_rate_limit():
    auth_limiter._buckets.clear()
    yield


class _Line:
    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)


def _admin(db, code="PB1"):
    company = create_company(db, name=f"Co {code}", company_code=code)
    admin = create_active_user(db, email=f"admin@{code.lower()}.com", role="admin", company_id=company.id)
    db.add(CompanySettings(company_id=company.id, company_name="Co", tax_rate=18.0))
    return company, admin


def _product(db, company_id, *, name="Widget", unit_price=1000):
    product = Product(
        company_id=company_id, name=name, unit_price=unit_price, tax_rate=18, is_active=True,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


def test_create_list_set_default_and_entries(client, db):
    company, admin = _admin(db)
    product = _product(db, company.id)
    login_user(client, admin.email)

    retail = client.post("/api/price-books", json={"name": "Retail", "is_default": True})
    assert retail.status_code == 201, retail.text
    retail_id = retail.json()["id"]
    assert retail.json()["is_default"] is True

    dealer = client.post("/api/price-books", json={"name": "Dealer"})
    assert dealer.status_code == 201
    dealer_id = dealer.json()["id"]

    listed = client.get("/api/price-books")
    assert listed.status_code == 200
    assert len(listed.json()["items"]) == 2

    patched = client.patch(f"/api/price-books/{dealer_id}", json={"is_default": True})
    assert patched.status_code == 200
    assert patched.json()["is_default"] is True
    retail_after = client.get(f"/api/price-books/{retail_id}").json()
    assert retail_after["is_default"] is False

    saved = client.put(
        f"/api/price-books/{dealer_id}/entries",
        json={"entries": [{"product_id": product.id, "unit_price": 750}]},
    )
    assert saved.status_code == 200, saved.text
    assert len(saved.json()["entries"]) == 1
    assert saved.json()["entries"][0]["unit_price"] == 750.0


def test_sales_cannot_write_books(client, db):
    company, admin = _admin(db, "PB2")
    create_active_user(db, email="sales@pb2.com", role="sales", company_id=company.id)
    login_user(client, "sales@pb2.com")
    assert client.get("/api/price-books").status_code == 200
    assert client.post("/api/price-books", json={"name": "X"}).status_code == 403


def test_resolve_uses_book_entry_default_and_override(db):
    company, _ = _admin(db, "PB3")
    product = _product(db, company.id, unit_price=1000)
    dealer = PriceBook(company_id=company.id, name="Dealer", is_default=True, is_active=True)
    db.add(dealer)
    db.flush()
    db.add(PriceBookEntry(
        company_id=company.id, price_book_id=dealer.id, product_id=product.id, unit_price=800,
    ))
    db.commit()

    lines = resolve_sale_lines(
        db, company_id=company.id, items=[_Line(product_id=product.id, quantity=1)], company_tax_rate=18,
    )
    assert float(lines[0].unit_price) == 800.0

    retail = PriceBook(company_id=company.id, name="Retail", is_default=False, is_active=True)
    db.add(retail)
    db.flush()
    db.add(PriceBookEntry(
        company_id=company.id, price_book_id=retail.id, product_id=product.id, unit_price=900,
    ))
    db.commit()

    lines_retail = resolve_sale_lines(
        db,
        company_id=company.id,
        items=[_Line(product_id=product.id, quantity=1)],
        company_tax_rate=18,
        price_book_id=retail.id,
    )
    assert float(lines_retail[0].unit_price) == 900.0

    lines_override = resolve_sale_lines(
        db,
        company_id=company.id,
        items=[_Line(product_id=product.id, quantity=1, unit_price=650)],
        company_tax_rate=18,
    )
    assert float(lines_override[0].unit_price) == 650.0


def test_invoice_uses_default_book_price(client, db):
    company, admin = _admin(db, "PB4")
    customer = create_client(db, company_id=company.id, name="Buyer", assigned_to_id=admin.id)
    product = _product(db, company.id, unit_price=1000)
    login_user(client, admin.email)

    book = client.post("/api/price-books", json={"name": "Dealer", "is_default": True}).json()
    client.put(
        f"/api/price-books/{book['id']}/entries",
        json={"entries": [{"product_id": product.id, "unit_price": 750}]},
    )

    created = client.post("/api/invoices", json={
        "client_id": customer.id,
        "items": [{"product_id": product.id, "quantity": 2, "description": "Widget"}],
    })
    assert created.status_code == 201, created.text
    detail = client.get(f"/api/invoices/{created.json()['id']}").json()
    assert float(detail["items"][0]["total"]) == 1500.0


def test_invoice_with_explicit_book_id(client, db):
    company, admin = _admin(db, "PB5")
    customer = create_client(db, company_id=company.id, name="Buyer", assigned_to_id=admin.id)
    product = _product(db, company.id, unit_price=1000)
    login_user(client, admin.email)

    default = client.post("/api/price-books", json={"name": "Default", "is_default": True}).json()
    retail = client.post("/api/price-books", json={"name": "Retail"}).json()
    client.put(
        f"/api/price-books/{default['id']}/entries",
        json={"entries": [{"product_id": product.id, "unit_price": 800}]},
    )
    client.put(
        f"/api/price-books/{retail['id']}/entries",
        json={"entries": [{"product_id": product.id, "unit_price": 950}]},
    )

    created = client.post("/api/invoices", json={
        "client_id": customer.id,
        "price_book_id": retail["id"],
        "items": [{"product_id": product.id, "quantity": 1, "description": "Widget"}],
    })
    assert created.status_code == 201, created.text
    detail = client.get(f"/api/invoices/{created.json()['id']}").json()
    assert float(detail["items"][0]["total"]) == 950.0


def test_foreign_book_on_create_is_400(client, db):
    company, admin = _admin(db, "PB6")
    other = create_company(db, name="Other", company_code="PBO")
    foreign = PriceBook(company_id=other.id, name="Foreign", is_default=False, is_active=True)
    db.add(foreign)
    db.commit()
    db.refresh(foreign)
    customer = create_client(db, company_id=company.id, name="Buyer", assigned_to_id=admin.id)
    product = _product(db, company.id)
    login_user(client, admin.email)
    resp = client.post("/api/invoices", json={
        "client_id": customer.id,
        "price_book_id": foreign.id,
        "items": [{"product_id": product.id, "quantity": 1, "description": "X"}],
    })
    assert resp.status_code == 400


def test_cross_tenant_book_is_404(client, db):
    company, admin = _admin(db, "PB7")
    other = create_company(db, name="Spy Co", company_code="PBS")
    foreign = PriceBook(company_id=company.id, name="Mine", is_default=False, is_active=True)
    db.add(foreign)
    db.commit()
    db.refresh(foreign)
    spy = create_active_user(db, email="spy@pbs.com", role="admin", company_id=other.id)
    login_user(client, spy.email)
    assert client.get(f"/api/price-books/{foreign.id}").status_code == 404
