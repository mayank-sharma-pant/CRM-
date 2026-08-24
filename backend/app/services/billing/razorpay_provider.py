import hmac, hashlib, json
from app.config import settings
from app.services.billing.base import BillingProvider, WebhookResult, classify


class RazorpayProvider(BillingProvider):
    """Live Razorpay adapter. Network calls only fire when keys are configured."""

    def _client(self):
        import razorpay  # imported lazily so the SDK is optional in dev/test
        return razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

    def create_checkout(self, company, plan) -> dict:
        client = self._client()
        sub = client.subscription.create({
            "plan_id": plan.razorpay_plan_id,
            "total_count": 12,
            "notes": {"company_id": str(company.id)},
        })
        return {"provider": "razorpay", "subscription_id": sub["id"], "short_url": sub.get("short_url")}

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
        return WebhookResult(event_id=body["id"], kind=classify(body.get("event", "")),
                             provider_subscription_id=sub_id)

    def cancel(self, subscription) -> None:
        if subscription.provider_subscription_id:
            self._client().subscription.cancel(subscription.provider_subscription_id)

    def list_invoices(self, company) -> list:
        return []
