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
