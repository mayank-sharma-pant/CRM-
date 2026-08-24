from app.config import settings
from app.services.billing.base import BillingProvider
from app.services.billing.null_provider import NullProvider
from app.services.billing.razorpay_provider import RazorpayProvider


def get_billing_provider() -> BillingProvider:
    if settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET:
        return RazorpayProvider()
    return NullProvider()
