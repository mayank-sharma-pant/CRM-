import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.config import settings

# Password hashing - using pbkdf2_sha256 (works without native bcrypt library issues)
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)

def create_access_token(
    data: dict,
    expires_delta: Optional[timedelta] = None,
    audience: str = "crm",
) -> str:
    """Create JWT access token with audience claim."""
    to_encode = data.copy()
    now_utc = datetime.now(timezone.utc)
    expire = now_utc + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "aud": audience})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def crm_access_token(user) -> str:
    role = user.role.value if hasattr(user.role, "value") else user.role
    return create_access_token(
        data={
            "sub": user.email,
            "role": role,
            "ver": int(getattr(user, "token_version", 0) or 0),
        }
    )


def generate_refresh_token() -> tuple[str, str]:
    """Return (raw_token, token_hash). The raw token is given to the client;
    only the hash is persisted."""
    raw = secrets.token_urlsafe(32)
    return raw, hash_refresh_token(raw)


def hash_refresh_token(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def decode_access_token(token: str, audience: Optional[str] = None) -> Optional[dict]:
    """Decode and verify JWT token.  Pass *audience* to enforce the ``aud`` claim."""
    try:
        options = {} if audience else {"verify_aud": False}
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
            audience=audience,
            options=options,
        )
        return payload
    except JWTError:
        return None
