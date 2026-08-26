import csv
import io
import json
from typing import Optional

MAX_IMPORT_ROWS = 500


def norm_header(value: str) -> str:
    return " ".join(str(value).strip().lower().replace("_", " ").split())


def read_csv(contents: bytes) -> tuple[list[str], list[dict]]:
    text = contents.decode("utf-8")
    reader = csv.DictReader(io.StringIO(text))
    headers = [str(h) for h in (reader.fieldnames or [])]
    rows = []
    for row in reader:
        rows.append({k: (v if v is not None else "") for k, v in row.items() if k is not None})
        if len(rows) >= MAX_IMPORT_ROWS:
            break
    return headers, rows


def parse_mapping(raw: Optional[str], fields: tuple[str, ...]) -> Optional[dict]:
    if raw is None or str(raw).strip() == "":
        return None
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ValueError("mapping must be JSON") from exc
    if not isinstance(data, dict):
        raise ValueError("mapping must be a JSON object")
    out = {}
    for field in fields:
        col = data.get(field)
        if col is None or str(col).strip() == "" or str(col) == "__none__":
            continue
        out[field] = str(col)
    return out


def suggest_mapping(headers: list[str], aliases: dict[str, set[str]]) -> dict[str, str]:
    mapping = {}
    used = set()
    for field, field_aliases in aliases.items():
        for header in headers:
            if header in used:
                continue
            if norm_header(header) in field_aliases:
                mapping[field] = header
                used.add(header)
                break
    return mapping


def cell(row: dict, header: Optional[str]) -> str:
    if not header:
        return ""
    return str(row.get(header, "") or "").strip()
