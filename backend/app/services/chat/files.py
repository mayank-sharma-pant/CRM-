"""Chat file storage on local disk, plus the short-lived tokens used to reach it.

Uploads and downloads go straight to the API host (not through the Vercel
proxy), where the CRM's host-only session cookie is not sent. They are
authorised with purpose-specific JWTs instead; get_current_user only accepts
aud="crm", so these tokens can never be used to log in.
"""
from __future__ import annotations

import base64
import logging
import os
import re
import shutil
import time
import uuid
from urllib.parse import urlsplit

from jose import JWTError, jwt

from app.config import settings
from app.services.chat.crypto import chat_crypto_configured

logger = logging.getLogger("app.chat.files")

UPLOAD_AUDIENCE = "chat_upload"
FILE_AUDIENCE = "chat_file"
UPLOAD_TOKEN_TTL = 600
# Download links are identical within a window (so browsers can cache) and die
# GRACE seconds after it ends: a leaked link is useless after at most ~20 minutes.
LINK_WINDOW = 900
LINK_GRACE = 300

UPLOADS_PER_USER = 2
UPLOADS_PER_SERVER = 8
UPLOAD_SLOT_TTL = 600
UPLOADS_PER_10_MIN = 30
DAILY_BYTES_PER_USER = 500 * 1024 * 1024

MAX_FILENAME_CHARS = 255
MAX_CAPTION_CHARS = 1000
TMP_MAX_AGE = 3600

_STORED_NAME = re.compile(r"^[0-9a-f]{32}$")
_UNSAFE_FILENAME = re.compile(r"[\x00-\x1f\x7f/\\]")


def files_ready() -> bool:
    return bool(
        settings.CHAT_ENABLED
        and settings.CHAT_FILES_ENABLED
        and settings.CHAT_FILES_DIR
        and os.path.isabs(settings.CHAT_FILES_DIR)
        and chat_crypto_configured()
    )


def public_api_base() -> str:
    """https://api.example.com derived from CHAT_WS_PUBLIC_URL; empty ⇒ same origin."""
    parts = urlsplit(settings.CHAT_WS_PUBLIC_URL or "")
    if not parts.netloc:
        return ""
    scheme = {"wss": "https", "ws": "http"}.get(parts.scheme, parts.scheme)
    return f"{scheme}://{parts.netloc}"


# ---- disk ------------------------------------------------------------------


def files_dir() -> str:
    return settings.CHAT_FILES_DIR


def tmp_dir() -> str:
    return os.path.join(files_dir(), "tmp")


def orphans_dir() -> str:
    return os.path.join(files_dir(), "orphans")


def ensure_dirs() -> None:
    for path in (files_dir(), tmp_dir(), orphans_dir()):
        os.makedirs(path, mode=0o700, exist_ok=True)


def new_stored_name() -> str:
    return uuid.uuid4().hex


def final_path(stored_name: str) -> str:
    if not _STORED_NAME.match(stored_name or ""):
        raise ValueError("invalid stored name")
    return os.path.join(files_dir(), stored_name)


def disk_free_bytes() -> int:
    return shutil.disk_usage(files_dir()).free


def upload_headroom_ok(extra_bytes: int = 0) -> bool:
    """Free space must stay above the reserve even if every upload slot is filled."""
    worst_in_flight = UPLOADS_PER_SERVER * settings.CHAT_MAX_MEDIA_BYTES
    return disk_free_bytes() - worst_in_flight - extra_bytes >= settings.CHAT_FILES_MIN_FREE_BYTES


def discard(path: str | None) -> None:
    if not path:
        return
    try:
        os.unlink(path)
    except FileNotFoundError:
        pass
    except OSError:
        logger.exception("Could not delete chat file %s", os.path.basename(path))


def sweep_tmp(max_age: int = TMP_MAX_AGE) -> int:
    """Delete abandoned temp uploads. Never raises."""
    if not settings.CHAT_FILES_DIR:
        return 0
    removed = 0
    cutoff = time.time() - max_age
    try:
        with os.scandir(tmp_dir()) as entries:
            for entry in entries:
                if entry.is_file(follow_symlinks=False) and entry.stat().st_mtime < cutoff:
                    discard(entry.path)
                    removed += 1
    except FileNotFoundError:
        return 0
    except OSError:
        logger.exception("Chat temp sweep failed")
    return removed


# ---- header text -------------------------------------------------------------


def decode_header_text(value: str | None, max_chars: int) -> str | None:
    """Headers carry UTF-8 text as unpadded base64url. Returns None when absent or invalid."""
    if not value:
        return None
    if len(value) > (max_chars * 4 * 4) // 3 + 4:
        return None
    try:
        raw = base64.b64decode(value + "=" * (-len(value) % 4), altchars=b"-_", validate=True)
        text = raw.decode("utf-8")
    except (ValueError, UnicodeDecodeError):
        return None
    if len(text) > max_chars:
        return None
    return text


def sanitize_filename(name: str | None) -> str | None:
    if not name:
        return None
    cleaned = _UNSAFE_FILENAME.sub("_", name).strip().strip(".")
    if not cleaned:
        return None
    return cleaned[-MAX_FILENAME_CHARS:]


# ---- tokens -------------------------------------------------------------------


def _encode(claims: dict) -> str:
    return jwt.encode(claims, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def _decode(token: str, audience: str) -> dict | None:
    if not token or len(token) > 2048:
        return None
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM], audience=audience)
    except JWTError:
        return None


def issue_upload_token(user_id: int, token_version: int) -> str:
    return _encode({
        "sub": str(int(user_id)),
        "tv": int(token_version or 0),
        "aud": UPLOAD_AUDIENCE,
        "exp": int(time.time()) + UPLOAD_TOKEN_TTL,
    })


def read_upload_token(token: str | None) -> tuple[int, int] | None:
    claims = _decode(token or "", UPLOAD_AUDIENCE)
    try:
        return int(claims["sub"]), int(claims["tv"])
    except (TypeError, KeyError, ValueError):
        return None


def link_expiry(now: float | None = None) -> int:
    now = time.time() if now is None else now
    return (int(now) // LINK_WINDOW + 1) * LINK_WINDOW + LINK_GRACE


def file_token(user_id: int, token_version: int, attachment_id: int, now: float | None = None) -> tuple[str, int]:
    exp = link_expiry(now)
    token = _encode({
        "sub": str(int(user_id)),
        "tv": int(token_version or 0),
        "att": int(attachment_id),
        "aud": FILE_AUDIENCE,
        "exp": exp,
    })
    return token, exp


def read_file_token(token: str | None) -> tuple[int, int, int, int] | None:
    """(user_id, token_version, attachment_id, exp) or None."""
    claims = _decode(token or "", FILE_AUDIENCE)
    try:
        return int(claims["sub"]), int(claims["tv"]), int(claims["att"]), int(claims["exp"])
    except (TypeError, KeyError, ValueError):
        return None


def file_link(user_id: int, token_version: int, attachment_id: int) -> dict:
    token, exp = file_token(user_id, token_version, attachment_id)
    return {
        "url": f"{public_api_base()}/api/chat/files/{int(attachment_id)}?t={token}",
        "url_expires_at": exp,
    }
