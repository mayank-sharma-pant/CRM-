import base64
import hashlib
import hmac
import secrets
import struct
import time
from urllib.parse import quote, urlencode


def generate_secret() -> str:
    """Return a fresh Base32 TOTP secret (160 bits)."""
    return base64.b32encode(secrets.token_bytes(20)).decode("ascii")


def _hotp(secret: str, counter: int, digits: int = 6) -> str:
    key = base64.b32decode(_pad(secret))
    msg = struct.pack(">Q", counter)
    digest = hmac.new(key, msg, hashlib.sha1).digest()
    offset = digest[-1] & 0x0F
    binary = struct.unpack(">I", digest[offset:offset + 4])[0] & 0x7FFFFFFF
    return str(binary % (10 ** digits)).zfill(digits)


def _pad(secret: str) -> str:
    # Base32 requires the length to be a multiple of 8.
    return secret + "=" * (-len(secret) % 8)


def totp_now(secret: str, at: int | None = None, digits: int = 6, step: int = 30) -> str:
    now = int(at if at is not None else time.time())
    return _hotp(secret, now // step, digits)


def verify_totp(secret: str, code: str, window: int = 1, at: int | None = None,
                digits: int = 6, step: int = 30) -> bool:
    code = (code or "").strip()
    if len(code) != digits or not code.isdigit():
        return False
    now = int(at if at is not None else time.time())
    counter = now // step
    for offset in range(-window, window + 1):
        candidate = _hotp(secret, counter + offset, digits)
        if hmac.compare_digest(candidate, code):
            return True
    return False


def provisioning_uri(secret: str, account_email: str, issuer: str = "Perioxia CRM") -> str:
    label = quote(f"{issuer}:{account_email}", safe=":@")
    params = urlencode({"secret": secret, "issuer": issuer, "digits": 6, "period": 30})
    return f"otpauth://totp/{label}?{params}"
