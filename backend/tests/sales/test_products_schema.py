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
