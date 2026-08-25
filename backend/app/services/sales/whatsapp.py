import json
from typing import Optional

import httpx

from app.utils.helpers import normalize_phone

GUPSHUP_TEMPLATE_URL = "https://api.gupshup.io/wa/api/v1/template/msg"


def destination_msisdn(value: Optional[str]) -> str:
    digits = normalize_phone(value)
    if not digits:
        raise ValueError("A phone number is required")
    if len(digits) == 10:
        return "91" + digits
    if digits.startswith("0") and len(digits) == 11:
        return "91" + digits[1:]
    if digits.startswith("91") and len(digits) >= 12:
        return digits
    if len(digits) < 10:
        raise ValueError("Phone number is too short")
    return digits


def params_for_record(variable_keys: list[str], record) -> list[str]:
    out = []
    for key in variable_keys or []:
        alias = "name" if key in ("name", "lead_name", "client_name") else key
        value = getattr(record, alias, None)
        if value is None and alias == "name":
            value = getattr(record, "name", None)
        out.append("" if value is None else str(value))
    return out


def post_gupshup_template(*, api_key: str, source: str, destination: str, template_id: str, params: list[str]) -> tuple[bool, str]:
    response = httpx.post(
        GUPSHUP_TEMPLATE_URL,
        headers={"apikey": api_key, "Content-Type": "application/x-www-form-urlencoded"},
        data={
            "source": source,
            "destination": destination,
            "template": json.dumps({"id": template_id, "params": params}),
        },
        timeout=20.0,
    )
    snippet = (response.text or "")[:500]
    if response.status_code >= 400:
        return False, snippet or f"HTTP {response.status_code}"
    return True, snippet
