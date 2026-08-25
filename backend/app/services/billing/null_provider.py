import hmac, hashlib, json
from app.config import settings
from app.services.billing.base import BillingProvider, WebhookResult, classify, crm_invoice_id_from_payload


class NullProvider(BillingProvider):
    """No-network provider for local/dev/test. Signs webhooks with the configured
    test secret so signature + idempotency paths are exercised offline."""

    def create_checkout(self, company, plan) -> dict:
        return {"provider": "null", "checkout_url": None, "subscription_id": f"null_sub_{company.id}"}

    def verify_and_parse(self, headers: dict, raw_body: bytes) -> WebhookResult:
        secret = settings.RAZORPAY_WEBHOOK_SECRET
        if not secret or not secret.strip():
            raise ValueError("Webhook secret not configured")
        sig = headers.get("X-Razorpay-Signature") or headers.get("x-razorpay-signature")
        expected = hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
        if not sig or not hmac.compare_digest(sig, expected):
            raise ValueError("Invalid webhook signature")
        body = json.loads(raw_body)
        sub_id = (body.get("payload", {}).get("subscription", {}).get("entity", {}).get("id"))
        return WebhookResult(
            event_id=body["id"],
            kind=classify(body.get("event", "")),
            provider_subscription_id=sub_id,
            crm_invoice_id=crm_invoice_id_from_payload(body),
        )

    def cancel(self, subscription) -> None:
        return None

    def list_invoices(self, company) -> list:
        return []
