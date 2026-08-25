import pytest

from app.services.finance.gst import GSTIN_ERROR, compute_gst, line_tax, normalize_gstin


def test_normalize_and_reject_bad_gstin():
    assert normalize_gstin(" 27aabcu9603r1zm ") == "27AABCU9603R1ZM"
    assert normalize_gstin("") is None
    assert normalize_gstin(None) is None
    with pytest.raises(ValueError, match=GSTIN_ERROR):
        normalize_gstin("not-a-gstin")


def test_legacy_lump_tax_without_seller_gstin():
    result = compute_gst(subtotal=200, rate_percent=18, seller_gstin=None, buyer_gstin=None)
    assert result.tax == 36.0
    assert result.cgst == 0 and result.sgst == 0 and result.igst == 0
    assert result.tax_mode == "legacy"


def test_intra_state_splits_cgst_sgst():
    seller = "27AABCU9603R1ZM"
    buyer = "27AAAAA0000A1Z5"
    result = compute_gst(subtotal=200, rate_percent=18, seller_gstin=seller, buyer_gstin=buyer)
    assert result.tax_mode == "intra"
    assert result.place_of_supply == "27"
    assert result.cgst == 18.0
    assert result.sgst == 18.0
    assert result.igst == 0
    assert result.tax == 36.0


def test_line_tax_rounds_half_up():
    assert line_tax(200, 18) == 36.0
    assert line_tax(1000, 5) == 50.0
    assert line_tax(1, 18) == 0.18


def test_inter_state_uses_igst():
    seller = "27AABCU9603R1ZM"
    buyer = "29AAAAA0000A1Z5"
    result = compute_gst(subtotal=200, rate_percent=18, seller_gstin=seller, buyer_gstin=buyer)
    assert result.tax_mode == "inter"
    assert result.place_of_supply == "29"
    assert result.igst == 36.0
    assert result.cgst == 0 and result.sgst == 0
