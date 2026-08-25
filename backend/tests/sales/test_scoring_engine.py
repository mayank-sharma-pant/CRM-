from datetime import datetime, timezone, timedelta
from types import SimpleNamespace

from app.services.scoring.engine import score_entity, fields_for, LEAD_FIELDS, DEAL_FIELDS

NOW = datetime(2026, 8, 26, tzinfo=timezone.utc)


def rule(**kw):
    kw.setdefault("id", 1)
    kw.setdefault("is_active", True)
    kw.setdefault("points", 10)
    kw.setdefault("value", None)
    return SimpleNamespace(**kw)


def lead(**kw):
    kw.setdefault("created_at", NOW)
    kw.setdefault("last_contacted_at", None)
    return SimpleNamespace(**kw)


def test_eq_case_insensitive_string_matches():
    r = rule(field="source", operator="eq", value="Referral", points=20)
    out = score_entity(lead(source="referral"), [r], now=NOW)
    assert out["total"] == 20
    assert out["breakdown"][0]["matched"] is True


def test_ne_and_in():
    r_ne = rule(id=1, field="status", operator="ne", value="Lost", points=5)
    r_in = rule(id=2, field="source", operator="in", value="Referral, Website", points=7)
    out = score_entity(lead(status="Active", source="website"), [r_ne, r_in], now=NOW)
    assert out["total"] == 12


def test_numeric_operators():
    r = rule(field="amount", operator="gte", value="50000", points=30)
    out = score_entity(SimpleNamespace(amount=50000, created_at=NOW), [r], now=NOW)
    assert out["total"] == 30


def test_is_set_and_is_empty():
    r_set = rule(id=1, field="email", operator="is_set", points=10)
    r_empty = rule(id=2, field="phone", operator="is_empty", points=3)
    out = score_entity(lead(email="a@b.com", phone=None), [r_set, r_empty], now=NOW)
    assert out["total"] == 13


def test_days_since_last_contact_null_is_large_sentinel():
    r = rule(field="days_since_last_contact", operator="gt", value="30", points=-15)
    out = score_entity(lead(last_contacted_at=None), [r], now=NOW)
    assert out["total"] == -15  # NULL -> never contacted -> matches ">30"


def test_days_since_last_contact_recent_does_not_match():
    r = rule(field="days_since_last_contact", operator="gt", value="30", points=-15)
    recent = lead(last_contacted_at=NOW - timedelta(days=2))
    out = score_entity(recent, [r], now=NOW)
    assert out["total"] == 0


def test_negative_total_allowed():
    r = rule(field="source", operator="eq", value="Cold", points=-40)
    out = score_entity(lead(source="Cold"), [r], now=NOW)
    assert out["total"] == -40


def test_inactive_rule_skipped():
    r = rule(field="source", operator="eq", value="X", points=99, is_active=False)
    out = score_entity(lead(source="X"), [r], now=NOW)
    assert out["total"] == 0
    assert out["breakdown"] == []


def test_bad_rule_never_crashes():
    r = rule(field="amount", operator="gt", value="not-a-number", points=10)
    out = score_entity(SimpleNamespace(amount=5, created_at=NOW), [r], now=NOW)
    assert out["total"] == 0
    assert out["breakdown"][0]["matched"] is False


def test_field_whitelists_shape():
    assert "source" in LEAD_FIELDS and "amount" in DEAL_FIELDS
    assert fields_for("lead") is LEAD_FIELDS
    assert fields_for("deal") is DEAL_FIELDS
