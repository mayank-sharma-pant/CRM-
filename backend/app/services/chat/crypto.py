"""Message-body encryption at rest.

Server-side only: anyone holding CHAT_ENCRYPTION_KEY can decrypt. There is
deliberately no fallback key — without a valid key chat is unavailable.
"""
import hashlib
from functools import lru_cache

from cryptography.fernet import Fernet, InvalidToken, MultiFernet

from app.config import settings


class ChatCryptoUnavailable(Exception):
    pass


class ChatDecryptError(Exception):
    """Stored ciphertext can't be decrypted with any configured key."""


def _key_id(raw_key: str) -> str:
    return hashlib.sha256(raw_key.encode("ascii")).hexdigest()[:16]


@lru_cache(maxsize=4)
def _load(raw: str) -> tuple[MultiFernet, str] | None:
    keys = [k.strip() for k in (raw or "").split(",") if k.strip()]
    if not keys:
        return None
    try:
        fernets = [Fernet(k.encode("ascii")) for k in keys]
    except (ValueError, UnicodeEncodeError):
        return None
    return MultiFernet(fernets), _key_id(keys[0])


def chat_crypto_configured() -> bool:
    return _load(settings.CHAT_ENCRYPTION_KEY) is not None


def _require() -> tuple[MultiFernet, str]:
    loaded = _load(settings.CHAT_ENCRYPTION_KEY)
    if loaded is None:
        raise ChatCryptoUnavailable()
    return loaded


def encrypt_body(plain: str) -> tuple[str, str]:
    """Return (ciphertext, key_id of the encrypting key)."""
    multi, key_id = _require()
    return multi.encrypt(plain.encode("utf-8")).decode("ascii"), key_id


def decrypt_body(token: str) -> str:
    multi, _ = _require()
    try:
        return multi.decrypt(token.encode("ascii")).decode("utf-8")
    except InvalidToken as exc:
        raise ChatDecryptError() from exc
