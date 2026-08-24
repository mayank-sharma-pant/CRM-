from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime


@dataclass
class WebhookResult:
    event_id: str
    kind: str  # "activated" | "cancelled" | "past_due" | "ignored"
    provider_subscription_id: str | None = None
    period_end: datetime | None = None


class BillingProvider(ABC):
    @abstractmethod
    def create_checkout(self, company, plan) -> dict: ...
    @abstractmethod
    def verify_and_parse(self, headers: dict, raw_body: bytes) -> WebhookResult: ...
    @abstractmethod
    def cancel(self, subscription) -> None: ...
    @abstractmethod
    def list_invoices(self, company) -> list: ...


_EVENT_KIND = {
    "subscription.charged": "activated",
    "subscription.activated": "activated",
    "subscription.cancelled": "cancelled",
    "subscription.halted": "past_due",
}


def classify(event_name: str) -> str:
    return _EVENT_KIND.get(event_name, "ignored")
