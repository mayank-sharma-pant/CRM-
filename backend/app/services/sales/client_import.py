from decimal import Decimal, InvalidOperation
from typing import Optional

from sqlalchemy.orm import Session

from app.models.sales.client import Client
from app.services.sales.csv_import import cell, parse_mapping, read_csv, suggest_mapping
from app.utils.helpers import normalize_email, normalize_phone

CLIENT_FIELDS = ("name", "email", "phone", "company", "address", "gstin")

_ALIASES = {
    "name": {"name", "full name", "full_name", "contact", "client name"},
    "email": {"email", "e-mail", "email address", "e_mail"},
    "phone": {"phone", "mobile", "telephone", "cell", "phone number"},
    "company": {"company", "organisation", "organization", "account"},
    "address": {"address", "billing address", "street"},
    "gstin": {"gstin", "gst", "gst number", "gst no"},
}


def _values(row: dict, mapping: dict) -> dict:
    return {field: cell(row, mapping.get(field)) for field in CLIENT_FIELDS}


def _load_existing(db: Session, company_id: int) -> tuple[dict, dict]:
    rows = db.query(Client).filter(Client.company_id == company_id).all()
    by_email = {}
    by_phone = {}
    for row in rows:
        email = normalize_email(row.email)
        if email:
            by_email[email] = row
        phone = normalize_phone(row.phone)
        if phone:
            by_phone[phone] = row
    return by_email, by_phone


def classify_rows(db: Session, company_id: int, headers: list[str], raw_rows: list[dict], mapping: dict) -> list[dict]:
    by_email, by_phone = _load_existing(db, company_id)
    seen_emails = set()
    seen_phones = set()
    classified = []
    for index, raw in enumerate(raw_rows, start=1):
        values = _values(raw, mapping)
        name = values["name"]
        email = normalize_email(values["email"] or None)
        phone = normalize_phone(values["phone"] or None)
        if not name:
            classified.append({
                "index": index,
                "status": "invalid",
                "values": values,
                "matched_id": None,
                "reason": "missing name",
            })
            continue
        matched = None
        reason = None
        if email and email in by_email:
            matched = by_email[email]
            reason = "email matches existing client"
        elif phone and phone in by_phone:
            matched = by_phone[phone]
            reason = "phone matches existing client"
        elif email and email in seen_emails:
            reason = "duplicate email in this file"
        elif phone and phone in seen_phones:
            reason = "duplicate phone in this file"
        if matched or reason:
            classified.append({
                "index": index,
                "status": "duplicate",
                "values": values,
                "matched_id": matched.id if matched else None,
                "reason": reason,
            })
            continue
        if email:
            seen_emails.add(email)
        if phone:
            seen_phones.add(phone)
        classified.append({
            "index": index,
            "status": "new",
            "values": values,
            "matched_id": None,
            "reason": None,
        })
    return classified


def preview_import(db: Session, company_id: int, contents: bytes, mapping_raw: Optional[str]) -> dict:
    headers, raw_rows = read_csv(contents)
    suggested = suggest_mapping(headers, _ALIASES)
    mapping = parse_mapping(mapping_raw, CLIENT_FIELDS) or suggested
    if "name" not in mapping:
        raise ValueError("CSV mapping must include a name column")
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


def new_clients_from_preview(preview: dict) -> list[dict]:
    return [row["values"] for row in preview["rows"] if row["status"] == "new"]
