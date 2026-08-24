import hmac, hashlib, json
import pytest
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.config import settings
from app.services.billing.seed import seed_plans
from app.services.billing.null_provider import NullProvider
from app.models.billing import Plan, Subscription, WebhookEvent
from app.models.core.company import Company
from tests.helpers.factories import create_company


def _post_event(client, body: dict, secret: str):
    raw = json.dumps(body).encode()
    sig = hmac.new(secret.encode(), raw, hashlib.sha256).hexdigest()
    return client.post("/api/billing/webhook", content=raw,
                       headers={"X-Razorpay-Signature": sig, "Content-Type": "application/json"})


def test_webhook_activates_subscription_once(db, client, monkeypatch):
    monkeypatch.setattr(settings, "RAZORPAY_WEBHOOK_SECRET", "whsec_test", raising=False)
    seed_plans(db)
    company = create_company(db, name="Payer", company_code="PAY", status="active")
    plan = db.query(Plan).filter(Plan.name == "Starter").one()
    sub = Subscription(company_id=company.id, plan_id=plan.id, provider="razorpay",
                       provider_subscription_id="sub_test123", status="trialing")
    db.add(sub); db.commit()

    body = {"id": "evt_1", "event": "subscription.charged",
            "payload": {"subscription": {"entity": {"id": "sub_test123"}}}}
    r1 = _post_event(client, body, "whsec_test")
    assert r1.status_code == 200
    db.expire_all()
    assert db.query(Subscription).filter(Subscription.id == sub.id).one().status == "active"

    r2 = _post_event(client, body, "whsec_test")  # replay same event id
    assert r2.status_code == 200
    assert db.query(WebhookEvent).filter(WebhookEvent.event_id == "evt_1").count() == 1


def test_webhook_activation_flips_company_from_trial_to_active(db, client, monkeypatch):
    """The transition that matters: a company paying during its trial must not
    get 403'd once trial_ends_at passes, because Company.status itself has to
    flip to active on paid conversion — the subscription flipping alone isn't
    enough, since auth guards check Company.status/trial_ends_at directly.
    """
    monkeypatch.setattr(settings, "RAZORPAY_WEBHOOK_SECRET", "whsec_test", raising=False)
    seed_plans(db)
    company = create_company(db, name="TrialPayer", company_code="TRP", status="trial")
    company.trial_ends_at = datetime.now(timezone.utc) + timedelta(days=3)
    db.commit()
    plan = db.query(Plan).filter(Plan.name == "Starter").one()
    sub = Subscription(company_id=company.id, plan_id=plan.id, provider="razorpay",
                       provider_subscription_id="sub_trialpay", status="trialing")
    db.add(sub); db.commit()

    body = {"id": "evt_trialpay", "event": "subscription.charged",
            "payload": {"subscription": {"entity": {"id": "sub_trialpay"}}}}
    r = _post_event(client, body, "whsec_test")
    assert r.status_code == 200

    db.expire_all()
    assert db.query(Subscription).filter(Subscription.id == sub.id).one().status == "active"
    refreshed = db.query(Company).filter(Company.id == company.id).one()
    assert refreshed.status == "active"
    assert refreshed.trial_ends_at is None


def test_webhook_rejects_bad_signature(db, client, monkeypatch):
    monkeypatch.setattr(settings, "RAZORPAY_WEBHOOK_SECRET", "whsec_test", raising=False)
    r = client.post("/api/billing/webhook", content=b'{"id":"evt_x"}',
                    headers={"X-Razorpay-Signature": "bad"})
    assert r.status_code == 400


def test_webhook_rejects_when_secret_empty(db, client, monkeypatch):
    monkeypatch.setattr(settings, "RAZORPAY_WEBHOOK_SECRET", "", raising=False)
    body = {"id": "evt_2", "event": "subscription.charged",
            "payload": {"subscription": {"entity": {"id": "sub_test123"}}}}
    raw = json.dumps(body).encode()
    # Forge a "valid" empty-key HMAC to prove the guard blocks it regardless of signature correctness.
    forged_sig = hmac.new(b"", raw, hashlib.sha256).hexdigest()
    r = client.post("/api/billing/webhook", content=raw,
                    headers={"X-Razorpay-Signature": forged_sig, "Content-Type": "application/json"})
    assert r.status_code == 400


def test_webhook_duplicate_commit_race_returns_200_not_500(db, client, monkeypatch):
    """Simulates the TOCTOU race: another delivery of the same event_id commits
    its WebhookEvent row between our pre-check SELECT and our own INSERT. We
    force this deterministically by (1) pre-inserting the WebhookEvent row
    directly, bypassing the handler, then (2) monkeypatching Session.query so
    the handler's own pre-check SELECT for WebhookEvent still returns None
    (as it would have, mid-race, before the other delivery's commit lands) —
    forcing the handler into the insert path, where the real unique
    constraint then raises IntegrityError on commit. This proves the except
    branch is hit and returns the same 200 duplicate no-op, without double-
    applying subscription status.
    """
    monkeypatch.setattr(settings, "RAZORPAY_WEBHOOK_SECRET", "whsec_test", raising=False)
    seed_plans(db)
    company = create_company(db, name="Racer", company_code="RACE", status="active")
    plan = db.query(Plan).filter(Plan.name == "Starter").one()
    sub = Subscription(company_id=company.id, plan_id=plan.id, provider="razorpay",
                       provider_subscription_id="sub_race", status="trialing")
    db.add(sub); db.commit()

    # The "other delivery" already recorded this event_id before ours runs.
    db.add(WebhookEvent(event_id="evt_race", provider="razorpay"))
    db.commit()

    original_query = Session.query

    def fake_query(self, *entities, **kwargs):
        if entities and entities[0] is WebhookEvent:
            class _NoneFirst:
                def filter(self_inner, *a, **kw):
                    class _Result:
                        def first(self_inner2):
                            return None  # pretend the row isn't visible yet (mid-race)
                    return _Result()
            return _NoneFirst()
        return original_query(self, *entities, **kwargs)

    monkeypatch.setattr(Session, "query", fake_query)

    body = {"id": "evt_race", "event": "subscription.charged",
            "payload": {"subscription": {"entity": {"id": "sub_race"}}}}
    r = _post_event(client, body, "whsec_test")

    assert r.status_code == 200
    assert r.json()["status"] == "duplicate"

    monkeypatch.undo()  # restore real Session.query before asserting via db fixture
    assert db.query(WebhookEvent).filter(WebhookEvent.event_id == "evt_race").count() == 1
    db.expire_all()
    # Status must NOT have been re-applied by the losing request.
    assert db.query(Subscription).filter(Subscription.id == sub.id).one().status == "trialing"


def test_null_provider_raises_on_empty_secret(monkeypatch):
    monkeypatch.setattr(settings, "RAZORPAY_WEBHOOK_SECRET", "", raising=False)
    raw = b'{"id":"evt_3","event":"subscription.charged"}'
    forged_sig = hmac.new(b"", raw, hashlib.sha256).hexdigest()
    with pytest.raises(ValueError):
        NullProvider().verify_and_parse({"X-Razorpay-Signature": forged_sig}, raw)
