import csv
import io
import json
from typing import Optional

from sqlalchemy.orm import Session

from app.models.sales.lead import Lead
from app.utils.helpers import normalize_email, normalize_phone

LEAD_FIELDS = ("name", "email", "phone", "company", "source", "service_type")

_ALIASES = {
    "name": {"name", "full name", "full_name", "lead name", "contact"},
    "email": {"email", "e-mail", "email address", "e_mail"},
    "phone": {"phone", "mobile", "telephone", "cell", "phone number"},
    "company": {"company", "organisation", "organization", "account"},
    "source": {"source"},
    "service_type": {"service_type", "service type", "service"},
}


def _norm_header(value: str) -> str:
    return " ".join(str(value).strip().lower().replace("_", " ").split())


def suggest_mapping(headers: list[str]) -> dict[str, str]:
    mapping = {}
    used = set()
    for field in LEAD_FIELDS:
        aliases = _ALIASES[field]
        for header in headers:
            if header in used:
                continue
            if _norm_header(header) in aliases:
                mapping[field] = header
                used.add(header)
                break
    return mapping


def parse_mapping(raw: Optional[str]) -> Optional[dict]:
    if raw is None or str(raw).strip() == "":
        return None
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ValueError("mapping must be JSON") from exc
    if not isinstance(data, dict):
        raise ValueError("mapping must be a JSON object")
    out = {}
    for field in LEAD_FIELDS:
        col = data.get(field)
        if col is None or str(col).strip() == "" or str(col) == "__none__":
            continue
        out[field] = str(col)
    return out


def _read_csv(contents: bytes) -> tuple[list[str], list[dict]]:
    text = contents.decode("utf-8")
    reader = csv.DictReader(io.StringIO(text))
    headers = [str(h) for h in (reader.fieldnames or [])]
    rows = []
    for row in reader:
        rows.append({k: (v if v is not None else "") for k, v in row.items() if k is not None})
        if len(rows) >= 500:
            break
    return headers, rows


def _cell(row: dict, header: Optional[str]) -> str:
    if not header:
        return ""
    return str(row.get(header, "") or "").strip()


def _values(row: dict, mapping: dict) -> dict:
    return {field: _cell(row, mapping.get(field)) for field in LEAD_FIELDS}


def _load_existing(db: Session, company_id: int) -> tuple[dict, dict]:
    leads = db.query(Lead).filter(Lead.company_id == company_id, Lead.deleted_at.is_(None)).all()
    by_email = {}
    by_phone = {}
    for lead in leads:
        email = normalize_email(lead.email)
        if email:
            by_email[email] = lead
        phone = normalize_phone(lead.phone)
        if phone:
            by_phone[phone] = lead
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
                "matched_lead_id": None,
                "reason": "missing name",
            })
            continue
        matched = None
        reason = None
        if email and email in by_email:
            matched = by_email[email]
            reason = "email matches existing lead"
        elif phone and phone in by_phone:
            matched = by_phone[phone]
            reason = "phone matches existing lead"
        elif email and email in seen_emails:
            reason = "duplicate email in this file"
        elif phone and phone in seen_phones:
            reason = "duplicate phone in this file"
        if matched or reason:
            classified.append({
                "index": index,
                "status": "duplicate",
                "values": values,
                "matched_lead_id": matched.id if matched else None,
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
            "matched_lead_id": None,
            "reason": None,
        })
    return classified


def preview_import(db: Session, company_id: int, contents: bytes, mapping_raw: Optional[str]) -> dict:
    headers, raw_rows = _read_csv(contents)
    suggested = suggest_mapping(headers)
    mapping = parse_mapping(mapping_raw) or suggested
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


def new_leads_from_preview(preview: dict) -> list[dict]:
    return [row["values"] for row in preview["rows"] if row["status"] == "new"]
