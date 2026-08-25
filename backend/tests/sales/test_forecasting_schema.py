from decimal import Decimal

import pytest
from sqlalchemy import inspect
from sqlalchemy.exc import IntegrityError

from app.models.sales.sales_quota import SalesQuota
from tests.helpers.auth import create_active_user
from tests.helpers.factories import create_company


def test_sales_quotas_table_exists(db_engine):
    assert "sales_quotas" in inspect(db_engine).get_table_names()
    cols = {c["name"] for c in inspect(db_engine).get_columns("sales_quotas")}
    assert {"company_id", "user_id", "year", "month", "amount"} <= cols


def test_unique_company_user_year_month(db):
    company = create_company(db, name="F Co", company_code="FC1")
    user = create_active_user(db, email="s@fc1.com", role="sales", company_id=company.id)
    db.add(SalesQuota(company_id=company.id, user_id=user.id, year=2026, month=8, amount=Decimal("1000")))
    db.commit()
    db.add(SalesQuota(company_id=company.id, user_id=user.id, year=2026, month=8, amount=Decimal("2000")))
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()
