from decimal import Decimal
from types import SimpleNamespace

from app.services.portal.share_links import (
    apply_share,
    hash_share_token,
    mint_share_token,
    portal_invoice_dto,
    portal_quote_dto,
    revoke_share,
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
        invoice_number="INV-1",
        status="sent",
        issued_date=None,
        due_date=None,
        paid_date=None,
        seller_gstin="AA",
        buyer_gstin="BB",
        place_of_supply="29",
        tax_mode="igst",
        subtotal=Decimal("100"),
        tax=Decimal("18"),
        cgst=0,
        sgst=0,
        igst=Decimal("18"),
        discount=0,
        total=Decimal("118"),
        notes="n",
        items=[
            SimpleNamespace(
                description="Roof",
                quantity=1,
                unit_price=Decimal("100"),
                tax=Decimal("18"),
                tax_rate=Decimal("18"),
                hsn="1234",
                total=Decimal("118"),
                product_id=99,
            )
        ],
        company_id=1,
        share_token_hash="secret",
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


def test_portal_quote_dto_shape():
    quote = SimpleNamespace(
        quote_number="Q-1",
        title="Roof quote",
        status="sent",
        seller_gstin="AA",
        buyer_gstin="BB",
        place_of_supply="29",
        tax_mode="igst",
        subtotal=Decimal("100"),
        tax=Decimal("18"),
        cgst=0,
        sgst=0,
        igst=Decimal("18"),
        total=Decimal("118"),
        notes="n",
        items=[
            SimpleNamespace(
                description="Roof",
                quantity=1,
                unit_price=Decimal("100"),
                tax=Decimal("18"),
                tax_rate=Decimal("18"),
                hsn="1234",
                total=Decimal("118"),
                product_id=99,
            )
        ],
        company_id=1,
        client_id=2,
        deal_id=3,
        share_token_hash="secret",
    )
    client = SimpleNamespace(name="Buyer Co")
    company = SimpleNamespace(name="Seller Co")
    dto = portal_quote_dto(quote, client=client, company=company)
    assert dto["quote_number"] == "Q-1"
    assert dto["title"] == "Roof quote"
    assert dto["client_name"] == "Buyer Co"
    assert dto["company_name"] == "Seller Co"
    assert "company_id" not in dto
    assert "share_token_hash" not in dto
    assert "client_id" not in dto
    assert "deal_id" not in dto
    assert "product_id" not in dto["items"][0]
