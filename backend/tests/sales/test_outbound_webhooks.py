import hashlib
import hmac

import pytest

from app.models.core.enums import InvoiceStatus
from app.models.finance.invoice import Invoice
from app.models.sales.webhook_endpoint import WebhookDelivery
from app.services.finance.invoice_pay import mark_invoice_paid
from app.utils.rate_limit import auth_limiter
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_client, create_company


@pytest.fixture(autouse=True)
def _reset_auth():
    auth_limiter._buckets.clear()
    yield


def _admin(client, db, code="WH1"):
    company = create_company(db, name=f"Co {code}", company_code=code)
    admin = create_active_user(
        db, email=f"admin@{code.lower()}.com", role="admin", company_id=company.id
    )
    login_user(client, admin.email)
    return company, admin


def test_create_endpoint_shows_secret_once(client, db):
    _admin(client, db, "WHA")
    resp = client.post("/api/webhooks/endpoints", json={
        "url": "https://hooks.example.com/crm",
        "events": ["lead.created"],
    })
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["url"] == "https://hooks.example.com/crm"
    assert body["secret"].startswith("whsec_")
    listed = client.get("/api/webhooks/endpoints")
    assert listed.status_code == 200
    assert "secret" not in listed.json()["items"][0]


def test_lead_created_posts_signed_payload(client, db, monkeypatch):
    _admin(client, db, "WHB")
    created = client.post("/api/webhooks/endpoints", json={
        "url": "https://hooks.example.com/crm",
        "events": ["lead.created"],
    }).json()
    secret = created["secret"]
    calls = []

    def fake_post(url, headers, content, timeout):
        calls.append({"url": url, "headers": headers, "content": content, "timeout": timeout})

        class R:
            status_code = 200

        return R()

    monkeypatch.setattr("app.services.sales.outbound_webhooks.post_signed", fake_post)
    resp = client.post("/api/leads", json={"name": "Pat", "email": "pat@whb.test"})
    assert resp.status_code == 201, resp.text
    assert len(calls) == 1
    assert calls[0]["url"] == "https://hooks.example.com/crm"
    assert calls[0]["headers"]["X-Perioxia-Event"] == "lead.created"
    digest = hmac.new(secret.encode(), calls[0]["content"], hashlib.sha256).hexdigest()
    assert calls[0]["headers"]["X-Perioxia-Signature"] == f"sha256={digest}"


def test_wrong_event_is_not_delivered(client, db, monkeypatch):
    _admin(client, db, "WHC")
    client.post("/api/webhooks/endpoints", json={
        "url": "https://hooks.example.com/crm",
        "events": ["invoice.paid"],
    })
    calls = []
    monkeypatch.setattr(
        "app.services.sales.outbound_webhooks.post_signed",
        lambda *a, **k: calls.append(1) or type("R", (), {"status_code": 200})(),
    )
    client.post("/api/leads", json={"name": "Skip", "email": "skip@whc.test"})
    assert calls == []


def test_failed_delivery_retries(client, db, monkeypatch):
    _admin(client, db, "WHD")
    client.post("/api/webhooks/endpoints", json={"url": "https://hooks.example.com/crm"})
    states = {"n": 0}

    def flaky(url, headers, content, timeout):
        states["n"] += 1
        if states["n"] == 1:
            raise RuntimeError("down")

        class R:
            status_code = 200

        return R()

    monkeypatch.setattr("app.services.sales.outbound_webhooks.post_signed", flaky)
    client.post("/api/leads", json={"name": "Retry", "email": "retry@whd.test"})
    assert db.query(WebhookDelivery).count() == 1
    row = db.query(WebhookDelivery).one()
    assert row.delivered_at is None
    assert row.attempts == 1
    retry = client.post("/api/webhooks/retry")
    assert retry.status_code == 200, retry.text
    assert retry.json()["retried"] == 1
    db.refresh(row)
    assert row.delivered_at is not None
    assert states["n"] == 2


def test_deal_stage_and_invoice_paid(client, db, monkeypatch):
    company, admin = _admin(client, db, "WHE")
    client.post("/api/webhooks/endpoints", json={"url": "https://hooks.example.com/crm"})
    events = []

    def capture(url, headers, content, timeout):
        events.append(headers["X-Perioxia-Event"])

        class R:
            status_code = 200

        return R()

    monkeypatch.setattr("app.services.sales.outbound_webhooks.post_signed", capture)
    deal = client.post("/api/deals", json={"title": "Move me", "amount": "1"}).json()
    stages = client.get("/api/deals/stages", params={"pipeline_id": deal["pipeline_id"]}).json()["items"]
    other = next(s for s in stages if s["id"] != deal["stage_id"])
    moved = client.patch(f"/api/deals/{deal['id']}/stage", json={"stage_id": other["id"]})
    assert moved.status_code == 200, moved.text
    assert "deal.stage_changed" in events

    buyer = create_client(db, company_id=company.id, name="Payee")
    inv = Invoice(
        company_id=company.id,
        invoice_number="INV-WH",
        client_id=buyer.id,
        subtotal=10,
        tax=0,
        total=10,
        status=InvoiceStatus.PENDING,
        created_by_id=admin.id,
    )
    db.add(inv)
    db.commit()
    db.refresh(inv)
    mark_invoice_paid(db, inv)
    db.commit()
    assert "invoice.paid" in events


def test_foreign_endpoint_is_404(client, db):
    _admin(client, db, "WHF")
    eid = client.post("/api/webhooks/endpoints", json={"url": "https://hooks.example.com/a"}).json()["id"]
    other = create_company(db, name="Other", company_code="WHG")
    spy = create_active_user(db, email="spy@whg.com", role="admin", company_id=other.id)
    login_user(client, spy.email)
    assert client.get(f"/api/webhooks/endpoints/{eid}").status_code == 404
    assert client.delete(f"/api/webhooks/endpoints/{eid}").status_code == 404
