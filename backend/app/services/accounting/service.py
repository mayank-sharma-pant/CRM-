"""Connect a company and push invoices through the stub accounting providers."""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.core.enums import InvoiceStatus
from app.models.finance.accounting import AccountingConnection, AccountingSyncItem
from app.models.finance.invoice import Invoice, InvoiceItem
from app.models.sales.client import Client
from app.services.accounting.payloads import (
    payload_hash,
    quickbooks_payload,
    stub_external_id,
    tally_payload,
)
from app.services.accounting.tally_transport import (
    TallyPushError,
    push_tally,
    render_tally_xml,
)

PROVIDERS = frozenset({"tally", "quickbooks"})
_ALLOWED_URL_SCHEMES = ("http://", "https://")
SKIP_STATUSES = {InvoiceStatus.DRAFT.value, InvoiceStatus.CANCELLED.value}


class AccountingNotConnected(Exception):
    pass


def _now():
    return datetime.now(timezone.utc)


def _status_value(invoice: Invoice) -> str:
    s = invoice.status
    return s.value if hasattr(s, "value") else str(s)


def _require_provider(provider: str) -> str:
    if provider not in PROVIDERS:
        raise ValueError("Unknown accounting provider")
    return provider


def get_connection(db: Session, company_id: int) -> AccountingConnection | None:
    return (
        db.query(AccountingConnection)
        .filter(AccountingConnection.company_id == company_id)
        .first()
    )


def _clean_url(value: str | None) -> str | None:
    if value is None:
        return None
    value = value.strip()
    if not value:
        return None
    if not value.startswith(_ALLOWED_URL_SCHEMES):
        raise ValueError("Tally URL must start with http:// or https://")
    return value


def connect(
    db: Session,
    company_id: int,
    provider: str,
    *,
    tally_url: str | None = None,
    tally_company_name: str | None = None,
) -> AccountingConnection:
    provider = _require_provider(provider)
    tally_url = _clean_url(tally_url)
    company_name = (tally_company_name or "").strip() or None
    row = get_connection(db, company_id)
    if row is None:
        row = AccountingConnection(company_id=company_id)
        db.add(row)
    row.provider = provider
    row.status = "connected"
    row.connected_at = _now()
    row.last_error = None
    row.tally_url = tally_url
    row.tally_company_name = company_name
    db.commit()
    db.refresh(row)
    return row


def disconnect(db: Session, company_id: int) -> AccountingConnection:
    row = get_connection(db, company_id)
    if row is None:
        row = AccountingConnection(company_id=company_id, provider=None)
        db.add(row)
    row.status = "disconnected"
    row.last_error = None
    db.commit()
    db.refresh(row)
    return row


def _connected(db: Session, company_id: int) -> AccountingConnection:
    row = get_connection(db, company_id)
    if row is None or row.status != "connected" or not row.provider:
        raise AccountingNotConnected("Accounting is not connected")
    return row


def _build_payload(provider: str, invoice: Invoice, items: list[InvoiceItem], client: Client | None) -> dict:
    if provider == "quickbooks":
        return quickbooks_payload(invoice, items, client)
    return tally_payload(invoice, items, client)


def _item_result(row: AccountingSyncItem, *, unchanged: bool, mode: str | None = None, error: str | None = None) -> dict:
    result = {
        "invoice_id": row.entity_id,
        "provider": row.provider,
        "external_id": row.external_id,
        "status": row.status,
        "unchanged": unchanged,
        "mode": mode,
        "last_synced_at": row.last_synced_at.isoformat() if row.last_synced_at else None,
    }
    if error is not None:
        result["error"] = error
    return result


def _is_live(conn: AccountingConnection) -> bool:
    return conn.provider == "tally" and bool(conn.tally_url)


def sync_invoice(db: Session, company_id: int, invoice: Invoice) -> dict:
    conn = _connected(db, company_id)
    items = db.query(InvoiceItem).filter(InvoiceItem.invoice_id == invoice.id).all()
    client = db.query(Client).filter(Client.id == invoice.client_id).first()
    skip = _status_value(invoice) in SKIP_STATUSES
    row = (
        db.query(AccountingSyncItem)
        .filter(
            AccountingSyncItem.company_id == company_id,
            AccountingSyncItem.entity_type == "invoice",
            AccountingSyncItem.entity_id == invoice.id,
        )
        .first()
    )
    if skip:
        if row is None:
            row = AccountingSyncItem(
                company_id=company_id,
                entity_type="invoice",
                entity_id=invoice.id,
                provider=conn.provider,
                status="skipped",
            )
            db.add(row)
        row.provider = conn.provider
        row.status = "skipped"
        row.external_id = None
        row.payload_hash = None
        row.last_synced_at = _now()
        db.commit()
        db.refresh(row)
        return _item_result(row, unchanged=False)

    payload = _build_payload(conn.provider, invoice, items, client)
    digest = payload_hash(payload)
    mode = "live" if _is_live(conn) else "stub"

    # Idempotent: an unchanged, already-synced row for the same provider does not
    # re-push (live or stub), so a live re-sync never re-hits Tally.
    if (
        row is not None
        and row.payload_hash == digest
        and row.provider == conn.provider
        and row.status == "synced"
    ):
        return _item_result(row, unchanged=True, mode=mode)

    if mode == "live":
        xml = render_tally_xml(payload, conn.tally_company_name)
        try:
            pushed = push_tally(conn.tally_url, xml, voucher_number=invoice.invoice_number)
        except TallyPushError as exc:
            return _record_failure(db, row, conn, company_id, invoice, str(exc))
        external_id = pushed["external_id"]
    else:
        external_id = stub_external_id(conn.provider, company_id, invoice.invoice_number)

    if row is None:
        row = AccountingSyncItem(
            company_id=company_id,
            entity_type="invoice",
            entity_id=invoice.id,
            provider=conn.provider,
        )
        db.add(row)
    row.provider = conn.provider
    row.status = "synced"
    row.external_id = external_id
    row.payload_hash = digest
    row.last_synced_at = _now()
    db.commit()
    db.refresh(row)
    return _item_result(row, unchanged=False, mode=mode)


def _record_failure(db, row, conn, company_id, invoice, error: str) -> dict:
    """Live push failed: mark the item failed (retryable), surface the real error."""
    if row is None:
        row = AccountingSyncItem(
            company_id=company_id,
            entity_type="invoice",
            entity_id=invoice.id,
            provider=conn.provider,
        )
        db.add(row)
    row.provider = conn.provider
    row.status = "failed"
    row.external_id = None
    row.payload_hash = None
    row.last_synced_at = _now()
    conn.last_error = error
    db.commit()
    db.refresh(row)
    return _item_result(row, unchanged=False, mode="live", error=error)


def sync_all(db: Session, company_id: int) -> dict:
    _connected(db, company_id)
    invoices = db.query(Invoice).filter(Invoice.company_id == company_id).all()
    pushed = skipped = unchanged = failed = 0
    items = []
    for inv in invoices:
        try:
            result = sync_invoice(db, company_id, inv)
        except Exception as exc:
            failed += 1
            items.append({"invoice_id": inv.id, "status": "failed", "error": str(exc)})
            continue
        items.append(result)
        if result["status"] == "skipped":
            skipped += 1
        elif result["status"] == "failed":
            failed += 1
        elif result["unchanged"]:
            unchanged += 1
        else:
            pushed += 1
    conn = get_connection(db, company_id)
    conn.last_sync_at = _now()
    conn.last_error = None if failed == 0 else f"{failed} failed"
    db.commit()
    return {
        "pushed": pushed,
        "skipped": skipped,
        "unchanged": unchanged,
        "failed": failed,
        "items": items,
    }
