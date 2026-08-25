"""Open-pixel and click-redirect tracking for outbound CRM mail (Phase 7.1).

Tokens are opaque and random; only their SHA-256 hash is persisted. The raw
token exists in the sent message and nowhere else. Click targets are HMAC-signed
so a token holder cannot turn the redirect into an open redirect.
"""
from __future__ import annotations

import base64
import binascii
import hashlib
import hmac
import html
import re
import secrets
from typing import Optional

from app.config import settings

TRACK_PREFIX = "/api/public/track"
TRAILING_PUNCTUATION = ".,;:!?)]}'\"" + "\u201d\u2019"

# 42-byte 1x1 transparent GIF89a.
TRANSPARENT_GIF = base64.b64decode(
    "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
)

_URL_RE = re.compile(r"(https?://[^\s<>\"']+)")


def hash_token(raw: str) -> str:
    return hashlib.sha256((raw or "").encode("utf-8")).hexdigest()


def mint_token() -> tuple[str, str]:
    raw = secrets.token_urlsafe(32)
    return raw, hash_token(raw)


def tracking_base() -> Optional[str]:
    """Public origin for tracking URLs, or None when tracking must stay off."""
    base = (settings.PUBLIC_API_URL or "").strip().rstrip("/")
    return base or None


def open_pixel_url(base: str, raw_token: str) -> str:
    return f"{base}{TRACK_PREFIX}/o/{raw_token}.gif"


def sign_target(token_hash: str, url: str) -> str:
    digest = hmac.new(
        settings.SECRET_KEY.encode("utf-8"),
        f"{token_hash}:{url}".encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return digest[:32]


def verify_target(token_hash: str, url: str, signature: str) -> bool:
    return hmac.compare_digest(sign_target(token_hash, url), signature or "")


def encode_target(url: str) -> str:
    return base64.urlsafe_b64encode(url.encode("utf-8")).decode("ascii").rstrip("=")


def decode_target(encoded: Optional[str]) -> Optional[str]:
    """Decode a base64url target. None when undecodable or not http(s)."""
    if not encoded:
        return None
    padded = encoded + "=" * (-len(encoded) % 4)
    try:
        url = base64.urlsafe_b64decode(padded.encode("ascii")).decode("utf-8")
    except (binascii.Error, UnicodeDecodeError, ValueError):
        return None
    if not url.startswith("http://") and not url.startswith("https://"):
        return None
    return url


def click_url(base: str, raw_token: str, token_hash: str, target: str) -> str:
    return (
        f"{base}{TRACK_PREFIX}/c/{raw_token}"
        f"?u={encode_target(target)}&s={sign_target(token_hash, target)}"
    )


def _linkify(line: str, wrap) -> str:
    """Escape a plain-text line, routing bare http(s) URLs through `wrap`."""
    out = []
    for part in _URL_RE.split(line):
        if not part:
            continue
        if not _URL_RE.fullmatch(part):
            out.append(html.escape(part))
            continue
        url = part.rstrip(TRAILING_PUNCTUATION)
        tail = part[len(url):]
        out.append(f'<a href="{html.escape(wrap(url), quote=True)}">{html.escape(url)}</a>')
        if tail:
            out.append(html.escape(tail))
    return "".join(out)


def build_outbound_html(
    body: str,
    *,
    base: Optional[str] = None,
    open_raw: Optional[str] = None,
    click_raw: Optional[str] = None,
    click_hash: Optional[str] = None,
) -> str:
    """Render the plain-text CRM body as the HTML actually sent.

    Without `base` this is the untracked escaped body: no pixel, no rewritten
    links. The caller keeps storing the original plain text on the log row.
    """
    track_links = bool(base and click_raw and click_hash)
    if track_links:
        def wrap(url: str) -> str:
            return click_url(base, click_raw, click_hash, url)
    else:
        def wrap(url: str) -> str:
            return url

    lines = (body or "").splitlines() or [body or ""]
    rendered = "<br>".join(
        _linkify(line, wrap) if track_links else html.escape(line) for line in lines
    )
    pixel = ""
    if base and open_raw:
        src = html.escape(open_pixel_url(base, open_raw), quote=True)
        pixel = (
            f'<img src="{src}" width="1" height="1" alt="" '
            'style="display:none;border:0" />'
        )
    return f"<div>{rendered}</div>{pixel}"
