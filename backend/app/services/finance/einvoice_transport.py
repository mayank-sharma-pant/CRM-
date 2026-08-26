"""Live NIC/IRP-shaped e-invoice transport (Phase 7.6).

Auth + GenerateIRN over HTTP. Used only when a company has configured
e-invoice credentials; otherwise the 6.16 stub path runs instead.
"""
from __future__ import annotations

import httpx

_DEFAULT_TIMEOUT = 20.0


class EinvoicePushError(Exception):
    """Raised when live NIC/IRP auth or IRN generation fails."""


def _normalize_base(url: str) -> str:
    return (url or "").rstrip("/")


def auth_token(
    base_url: str,
    *,
    gstin: str,
    username: str,
    password: str,
    client_id: str,
    client_secret: str,
    timeout: float = _DEFAULT_TIMEOUT,
) -> str:
    """POST NIC-shaped auth; return AuthToken string."""
    url = f"{_normalize_base(base_url)}/eivital/v1.04/auth"
    try:
        response = httpx.post(
            url,
            json={
                "UserName": username,
                "Password": password,
                "Gstin": gstin,
                "ForceRefreshAccessToken": True,
            },
            headers={
                "client_id": client_id,
                "client_secret": client_secret,
                "Content-Type": "application/json",
            },
            timeout=timeout,
        )
    except httpx.HTTPError as exc:
        raise EinvoicePushError(f"E-invoice auth transport error: {exc}") from exc

    if response.status_code >= 400:
        raise EinvoicePushError(f"E-invoice auth returned HTTP {response.status_code}")

    try:
        body = response.json()
    except ValueError as exc:
        raise EinvoicePushError("E-invoice auth returned non-JSON") from exc

    if isinstance(body.get("Status"), int) and body["Status"] == 0:
        err = body.get("ErrorDetails") or body.get("error") or body.get("message") or "auth rejected"
        raise EinvoicePushError(f"E-invoice auth rejected: {err}")

    data = body.get("Data") if isinstance(body.get("Data"), dict) else body
    token = (data or {}).get("AuthToken") or body.get("AuthToken")
    if not token:
        raise EinvoicePushError("E-invoice auth response missing AuthToken")
    return str(token)


def generate_live_irn(
    base_url: str,
    *,
    token: str,
    payload: dict,
    timeout: float = _DEFAULT_TIMEOUT,
) -> dict:
    """POST IRP invoice payload; return irn/ack_no/ack_date/signed_qr."""
    url = f"{_normalize_base(base_url)}/eicore/v1.03/Invoice"
    try:
        response = httpx.post(
            url,
            json=payload,
            headers={
                "Authorization": token,
                "Content-Type": "application/json",
            },
            timeout=timeout,
        )
    except httpx.HTTPError as exc:
        raise EinvoicePushError(f"E-invoice generate transport error: {exc}") from exc

    if response.status_code >= 400:
        raise EinvoicePushError(f"E-invoice generate returned HTTP {response.status_code}")

    try:
        body = response.json()
    except ValueError as exc:
        raise EinvoicePushError("E-invoice generate returned non-JSON") from exc

    if isinstance(body.get("Status"), int) and body["Status"] == 0:
        err = body.get("ErrorDetails") or body.get("error") or body.get("message") or "generate rejected"
        raise EinvoicePushError(f"E-invoice generate rejected: {err}")

    data = body.get("Data") if isinstance(body.get("Data"), dict) else body
    data = data or {}
    irn = data.get("Irn") or data.get("irn") or body.get("Irn")
    if not irn:
        raise EinvoicePushError("E-invoice generate response missing Irn")

    ack_no = data.get("AckNo") or data.get("ack_no") or body.get("AckNo")
    ack_dt = data.get("AckDt") or data.get("ack_date") or body.get("AckDt")
    signed_qr = data.get("SignedQRCode") or data.get("signed_qr") or body.get("SignedQRCode")

    return {
        "irn": str(irn)[:64],
        "ack_no": str(ack_no)[:32] if ack_no is not None else None,
        "ack_date": str(ack_dt) if ack_dt is not None else None,
        "signed_qr": str(signed_qr) if signed_qr is not None else str(irn),
    }
