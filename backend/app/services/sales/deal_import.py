from decimal import Decimal, InvalidOperation
from typing import Optional

from sqlalchemy.orm import Session

from app.models.sales.client import Client
from app.models.sales.deal import Deal
from app.services.sales.csv_import import cell, parse_mapping, read_csv, suggest_mapping
from app.utils.helpers import normalize_email

DEAL_FIELDS = ("title", "amount", "client_email", "client_name", "expected_close", "source")

_ALIASES = {
    "title": {"title", "deal", "deal title", "name", "opportunity"},
    "amount": {"amount", "value", "deal value", "deal amount"},
    "client_email": {"client email", "client_email", "customer email", "email", "contact email"},
    "client_name": {"client name", "client_name", "customer", "account", "company"},
    "expected_close": {"expected close", "expected_close", "close date", "closing date"},
    "source": {"source", "lead source"},
}


def _values(row: dict, mapping: dict) -> dict:
    return {field: cell(row, mapping.get(field)) for field in DEAL_FIELDS}


def _parse_amount(raw: str) -> Optional[Decimal]:
    if not raw:
        return Decimal("0")
    try:
        value = Decimal(str(raw).replace(",", "").strip())
    except (InvalidOperation, ValueError):
        return None
    if value < 0:
        return None
    return value


def _resolve_client(db: Session, company_id: int, email: str, name: str) -> Client | None:
    normalized = normalize_email(email or None)
    if normalized:
        for row in db.query(Client).filter(Client.company_id == company_id).all():
            if normalize_email(row.email) == normalized:
                return row
    if name:
        return (
            db.query(Client)
            .filter(Client.company_id == company_id, Client.name == name)
            .order_by(Client.id.asc())
            .first()
        )
    return None


def classify_rows(db: Session, company_id: int, headers: list[str], raw_rows: list[dict], mapping: dict) -> list[dict]:
    seen_keys = set()
    classified = []
    for index, raw in enumerate(raw_rows, start=1):
        values = _values(raw, mapping)
        title = values["title"]
        amount = _parse_amount(values["amount"])
        client = _resolve_client(db, company_id, values["client_email"], values["client_name"])
        if not title:
            classified.append({
                "index": index,
                "status": "invalid",
                "values": values,
                "matched_id": None,
                "reason": "missing title",
            })
            continue
        if amount is None:
            classified.append({
                "index": index,
                "status": "invalid",
                "values": values,
                "matched_id": None,
                "reason": "invalid amount",
            })
            continue
        if client is None:
            classified.append({
                "index": index,
                "status": "invalid",
                "values": values,
                "matched_id": None,
                "reason": "client not found",
            })
            continue
        key = (title.lower(), client.id)
        existing = (
            db.query(Deal.id)
            .filter(
                Deal.company_id == company_id,
                Deal.client_id == client.id,
                Deal.title == title,
            )
            .first()
        )
        if existing or key in seen_keys:
            classified.append({
                "index": index,
                "status": "duplicate",
                "values": values,
                "matched_id": existing.id if existing else None,
                "reason": "deal already exists for client",
            })
            continue
        seen_keys.add(key)
        enriched = {**values, "client_id": client.id, "amount_decimal": str(amount)}
        classified.append({
            "index": index,
            "status": "new",
            "values": enriched,
            "matched_id": None,
            "reason": None,
        })
    return classified


def preview_import(db: Session, company_id: int, contents: bytes, mapping_raw: Optional[str]) -> dict:
    headers, raw_rows = read_csv(contents)
    suggested = suggest_mapping(headers, _ALIASES)
    mapping = parse_mapping(mapping_raw, DEAL_FIELDS) or suggested
    if "title" not in mapping:
        raise ValueError("CSV mapping must include a title column")
    if "client_email" not in mapping and "client_name" not in mapping:
        raise ValueError("CSV mapping must include client_email or client_name")
    rows = classify_rows(db, company_id, headers, raw_rows, mapping)
    counts = {"new": 0, "duplicate": 0, "invalid": 0, "total": len(rows)}
    for row in rows:
        counts[row["status"]] += 1
    return {
        "headers": headers,
        "suggested_mapping": suggested,
        "mapping": mapping,
        "rows": rows,
        "counts": counts,
    }


def new_deals_from_preview(preview: dict) -> list[dict]:
    return [row["values"] for row in preview["rows"] if row["status"] == "new"]
