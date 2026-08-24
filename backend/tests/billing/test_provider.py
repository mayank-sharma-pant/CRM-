import hmac, hashlib, json
from app.config import settings
from app.services.billing.provider import get_billing_provider
from app.services.billing.null_provider import NullProvider


def _sign(raw: bytes, secret: str) -> str:
    return hmac.new(secret.encode(), raw, hashlib.sha256).hexdigest()


def test_get_provider_defaults_to_null_without_keys(monkeypatch):
    monkeypatch.setattr(settings, "RAZORPAY_KEY_ID", "", raising=False)
    monkeypatch.setattr(settings, "RAZORPAY_KEY_SECRET", "", raising=False)
    assert isinstance(get_billing_provider(), NullProvider)


def test_null_provider_verifies_good_signature(monkeypatch):
    secret = "whsec_test"
    monkeypatch.setattr(settings, "RAZORPAY_WEBHOOK_SECRET", secret, raising=False)
    raw = json.dumps({
        "event": "subscription.charged",
        "payload": {"subscription": {"entity": {"id": "sub_test123"}}},
        "id": "evt_abc",
    }).encode()
    result = NullProvider().verify_and_parse({"X-Razorpay-Signature": _sign(raw, secret)}, raw)
    assert result.event_id == "evt_abc"
    assert result.kind == "activated"
    assert result.provider_subscription_id == "sub_test123"


def test_null_provider_rejects_bad_signature(monkeypatch):
    monkeypatch.setattr(settings, "RAZORPAY_WEBHOOK_SECRET", "whsec_test", raising=False)
    raw = b'{"event":"subscription.charged","id":"evt_x"}'
    import pytest
    with pytest.raises(ValueError):
        NullProvider().verify_and_parse({"X-Razorpay-Signature": "deadbeef"}, raw)
