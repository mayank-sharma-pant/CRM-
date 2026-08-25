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
