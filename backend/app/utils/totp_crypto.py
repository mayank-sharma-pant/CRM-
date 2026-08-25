import base64
import hashlib
import secrets
from functools import lru_cache
from cryptography.fernet import Fernet
from app.config import settings

_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"  # no ambiguous 0/O/1/I/L


@lru_cache(maxsize=1)
def _fernet() -> Fernet:
    key = hashlib.sha256(settings.SECRET_KEY.encode("utf-8")).digest()
    return Fernet(base64.urlsafe_b64encode(key))


def encrypt_secret(plain: str) -> str:
    return _fernet().encrypt(plain.encode("utf-8")).decode("ascii")


def decrypt_secret(token: str) -> str:
    return _fernet().decrypt(token.encode("ascii")).decode("utf-8")


def generate_recovery_codes(n: int = 10) -> list[str]:
    codes = set()
    while len(codes) < n:
        codes.add("".join(secrets.choice(_ALPHABET) for _ in range(8)))
    return list(codes)


def hash_recovery_code(code: str) -> str:
    normalized = (code or "").strip().upper()
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()
