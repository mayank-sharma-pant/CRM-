"""Company e-invoice (NIC/IRP) connection settings."""
from __future__ import annotations

from typing import Optional
from urllib.parse import urlparse

from app.models.core.company_settings import CompanySettings
from app.utils.totp_crypto import decrypt_secret, encrypt_secret


def live_configured(row: Optional[CompanySettings]) -> bool:
    if row is None:
        return False
    return bool(
        (row.einvoice_base_url or "").strip()
        and (row.einvoice_username or "").strip()
        and (row.einvoice_password_encrypted or "").strip()
        and (row.einvoice_client_id or "").strip()
        and (row.einvoice_client_secret_encrypted or "").strip()
    )


def serialize_connection(row: Optional[CompanySettings]) -> dict:
    live = live_configured(row)
    return {
        "configured": live,
        "live": live,
        "base_url": (row.einvoice_base_url if row else None) or None,
        "username": (row.einvoice_username if row else None) or None,
        "client_id": (row.einvoice_client_id if row else None) or None,
        "password_set": bool(row and (row.einvoice_password_encrypted or "").strip()),
        "client_secret_set": bool(row and (row.einvoice_client_secret_encrypted or "").strip()),
        "gst_number": (row.gst_number if row else None) or None,
    }


def validate_base_url(url: str) -> str:
    cleaned = (url or "").strip().rstrip("/")
    if not cleaned:
        return ""
    parsed = urlparse(cleaned)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        raise ValueError("einvoice_base_url must be an http(s) URL")
    return cleaned


def apply_connection_update(
    row: CompanySettings,
    *,
    base_url: Optional[str] = None,
    username: Optional[str] = None,
    password: Optional[str] = None,
    client_id: Optional[str] = None,
    client_secret: Optional[str] = None,
) -> None:
    if base_url is not None:
        cleaned = validate_base_url(base_url)
        row.einvoice_base_url = cleaned or None
    if username is not None:
        row.einvoice_username = username.strip() or None
    if client_id is not None:
        row.einvoice_client_id = client_id.strip() or None
    if password is not None:
        cleaned = password.strip()
        row.einvoice_password_encrypted = encrypt_secret(cleaned) if cleaned else None
    if client_secret is not None:
        cleaned = client_secret.strip()
        row.einvoice_client_secret_encrypted = encrypt_secret(cleaned) if cleaned else None


def decrypt_creds(row: CompanySettings) -> dict:
    return {
        "base_url": (row.einvoice_base_url or "").strip(),
        "username": (row.einvoice_username or "").strip(),
        "password": decrypt_secret(row.einvoice_password_encrypted),
        "client_id": (row.einvoice_client_id or "").strip(),
        "client_secret": decrypt_secret(row.einvoice_client_secret_encrypted),
    }
