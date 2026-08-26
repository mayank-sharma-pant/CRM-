"""Live Tally HTTP-gateway transport (Phase 7.5).

Renders the canonical Tally voucher payload (from payloads.tally_payload) into a
Tally ``ENVELOPE`` and POSTs it to a company's Tally HTTP gateway. No credentials
— Tally's XML gateway is an unauthenticated LAN service. Used only when a company
has configured a ``tally_url``; otherwise the 5.4 stub path runs instead.
"""
from __future__ import annotations

import hashlib
import re
from xml.sax.saxutils import escape

import httpx

_DEFAULT_TIMEOUT = 20.0


class TallyPushError(Exception):
    """Raised when a live Tally push fails (HTTP, transport, or LINEERROR)."""


def _tally_date(iso: str | None) -> str:
    """Tally wants YYYYMMDD; payload dates are ISO ``YYYY-MM-DD``."""
    if not iso:
        return ""
    return iso.replace("-", "")[:8]


def _ledger_xml(ledger: dict) -> str:
    name = escape(str(ledger.get("LedgerName") or ""))
    deemed_positive = bool(ledger.get("IsDeemedPositive"))
    amount = float(ledger.get("Amount") or 0)
    # Tally sign convention: deemed-positive (debit) entries carry a negative
    # AMOUNT; credit entries a positive AMOUNT.
    signed = -amount if deemed_positive else amount
    return (
        "<ALLLEDGERENTRIES.LIST>"
        f"<LEDGERNAME>{name}</LEDGERNAME>"
        f"<ISDEEMEDPOSITIVE>{'Yes' if deemed_positive else 'No'}</ISDEEMEDPOSITIVE>"
        f"<AMOUNT>{signed:.2f}</AMOUNT>"
        "</ALLLEDGERENTRIES.LIST>"
    )


def render_tally_xml(payload: dict, company_name: str | None) -> str:
    """Wrap a tally_payload voucher in an Import-Data ENVELOPE."""
    voucher = payload.get("voucher") or {}
    party = escape(str(voucher.get("PartyLedgerName") or "Unknown"))
    number = escape(str(voucher.get("VoucherNumber") or ""))
    narration = escape(str(voucher.get("Narration") or ""))
    date = _tally_date(voucher.get("Date"))
    ledgers = "".join(_ledger_xml(l) for l in voucher.get("Ledgers") or [])
    company = escape(str(company_name or ""))
    return (
        "<ENVELOPE>"
        "<HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER>"
        "<BODY><IMPORTDATA>"
        "<REQUESTDESC><REPORTNAME>Vouchers</REPORTNAME>"
        f"<STATICVARIABLES><SVCURRENTCOMPANY>{company}</SVCURRENTCOMPANY></STATICVARIABLES>"
        "</REQUESTDESC>"
        "<REQUESTDATA>"
        '<TALLYMESSAGE xmlns:UDF="TallyUDF">'
        '<VOUCHER VCHTYPE="Sales" ACTION="Create" OBJVIEW="Invoice Voucher View">'
        f"<DATE>{date}</DATE>"
        "<VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>"
        f"<VOUCHERNUMBER>{number}</VOUCHERNUMBER>"
        f"<PARTYLEDGERNAME>{party}</PARTYLEDGERNAME>"
        f"<NARRATION>{narration}</NARRATION>"
        f"{ledgers}"
        "</VOUCHER>"
        "</TALLYMESSAGE>"
        "</REQUESTDATA>"
        "</IMPORTDATA></BODY>"
        "</ENVELOPE>"
    )


def _tag(body: str, tag: str) -> str | None:
    m = re.search(rf"<{tag}>(.*?)</{tag}>", body, re.IGNORECASE | re.DOTALL)
    return m.group(1).strip() if m else None


def _fallback_external_id(voucher_number: str | None) -> str:
    digest = hashlib.sha1((voucher_number or "").encode("utf-8")).hexdigest()[:24]
    return f"tally-live-{digest}"


def push_tally(
    url: str,
    xml: str,
    *,
    voucher_number: str | None = None,
    timeout: float = _DEFAULT_TIMEOUT,
) -> dict:
    """POST the voucher XML to Tally. Raise TallyPushError on any failure."""
    try:
        response = httpx.post(
            url,
            content=xml.encode("utf-8"),
            headers={"Content-Type": "text/xml; charset=utf-8"},
            timeout=timeout,
        )
    except httpx.HTTPError as exc:
        raise TallyPushError(f"Tally transport error: {exc}") from exc

    if response.status_code >= 400:
        raise TallyPushError(f"Tally returned HTTP {response.status_code}")

    body = response.text or ""
    line_error = _tag(body, "LINEERROR")
    if line_error:
        raise TallyPushError(f"Tally rejected voucher: {line_error}")

    created = _tag(body, "CREATED")
    altered = _tag(body, "ALTERED")
    last_vch_id = _tag(body, "LASTVCHID")

    def _as_int(value: str | None) -> int:
        try:
            return int(value or 0)
        except (TypeError, ValueError):
            return 0

    n_created = _as_int(created)
    n_altered = _as_int(altered)
    if n_created == 0 and n_altered == 0 and not last_vch_id:
        raise TallyPushError("Tally accepted no voucher (0 created/altered)")

    external_id = last_vch_id or _fallback_external_id(voucher_number)
    return {
        "external_id": external_id[:64],
        "created": n_created,
        "altered": n_altered,
        "raw": body[:2000],
    }
