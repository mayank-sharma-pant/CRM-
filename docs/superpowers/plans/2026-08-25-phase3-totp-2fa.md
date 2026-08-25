# TOTP Two-Factor Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add opt-in TOTP two-factor auth with recovery codes and a company-admin mandate, gating every session-minting login path, full stack.

**Architecture:** New stdlib TOTP + Fernet-encrypted secret utilities feed a new `/api/auth/2fa` router (enroll/confirm/status/disable/regenerate/verify). `/login` and `/login-otp` grow a single branch that returns a short-lived MFA challenge instead of tokens when 2FA is enabled or mandated; a `/2fa/verify` endpoint exchanges the challenge + code for the real tokens. A company `require_2fa` flag forces enrollment at login. Frontend adds a login challenge step, a security settings page, and an admin toggle.

**Tech Stack:** FastAPI, SQLAlchemy, Pydantic, `cryptography.Fernet`, Python stdlib (`hmac`/`hashlib`/`struct`/`base64`/`secrets`), Next.js (React, App Router), axios, Tailwind. Tests: pytest + FastAPI `TestClient` (in-memory SQLite).

**Spec:** [docs/superpowers/specs/2026-08-25-phase3-totp-2fa-design.md](../specs/2026-08-25-phase3-totp-2fa-design.md)

## Global Constraints

- **No new pip dependency.** Do not add `pyotp`, `qrcode`, or anything to `requirements.txt`. `cryptography` (Fernet) is already installed.
- **No Alembic.** New columns go in `_MISSING_COLUMNS` in `backend/create_missing_tables.py`; new tables come from `Base.metadata.create_all`. Two pre-existing Alembic heads — do not touch migrations (Phase 0/1 decision).
- **Non-2FA logins must stay byte-for-byte unchanged** — existing `LoginResponse` token payload identical when 2FA is off.
- **Secrets never leave the server after enrollment** — `totp_secret` is Fernet-encrypted at rest and never returned by any endpoint except the one-time `/setup` provisioning response.
- **Recovery codes are one-way hashed** (SHA-256), plaintext shown once, single-use.
- **IDOR-safe:** never accept `company_id`/`user_id` from a request body for authorization; derive from `get_current_user`.
- **Constant-time comparisons** for all code/secret checks (`hmac.compare_digest`).
- Test password for helper-created users is `"pw"`. Reset `auth_limiter._buckets.clear()` at the start of any test that logs in repeatedly.

---

### Task 1: TOTP core (stdlib, RFC 6238)

**Files:**
- Create: `backend/app/utils/totp.py`
- Test: `backend/tests/auth/test_totp_unit.py`

**Interfaces:**
- Consumes: nothing (pure stdlib).
- Produces:
  - `generate_secret() -> str` (Base32, no padding stripped issues)
  - `totp_now(secret: str, at: int | None = None, digits: int = 6, step: int = 30) -> str`
  - `verify_totp(secret: str, code: str, window: int = 1, at: int | None = None) -> bool`
  - `provisioning_uri(secret: str, account_email: str, issuer: str = "Perioxia CRM") -> str`

- [ ] **Step 1: Write the failing test (RFC 6238 vectors)**

The RFC 6238 Appendix B test vectors use the ASCII secret `"12345678901234567890"`. Base32 of those bytes is `GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ`. At Unix time 59 the 8-digit TOTP is `94287082`; the 6-digit truncation is its last 6 digits `287082`. At time 1111111109 → 8-digit `07081804` → 6-digit `081804`.

```python
# backend/tests/auth/test_totp_unit.py
import base64
from app.utils import totp

SECRET_B32 = base64.b32encode(b"12345678901234567890").decode()  # GEZDGNBVGY3TQOJQ...

def test_rfc6238_vector_t59():
    assert totp.totp_now(SECRET_B32, at=59) == "287082"

def test_rfc6238_vector_t1111111109():
    assert totp.totp_now(SECRET_B32, at=1111111109) == "081804"

def test_verify_accepts_current_code():
    code = totp.totp_now(SECRET_B32, at=59)
    assert totp.verify_totp(SECRET_B32, code, at=59) is True

def test_verify_rejects_wrong_code():
    assert totp.verify_totp(SECRET_B32, "000000", at=59) is False

def test_verify_tolerates_one_step_skew():
    # code from the previous 30s window still verifies with window=1
    prev = totp.totp_now(SECRET_B32, at=59 - 30)
    assert totp.verify_totp(SECRET_B32, prev, at=59, window=1) is True

def test_generate_secret_is_base32_and_random():
    s1, s2 = totp.generate_secret(), totp.generate_secret()
    assert s1 != s2
    base64.b32decode(s1)  # must not raise

def test_provisioning_uri_shape():
    uri = totp.provisioning_uri(SECRET_B32, "a@b.com", issuer="Acme")
    assert uri.startswith("otpauth://totp/Acme:a@b.com?")
    assert "secret=" in uri and "issuer=Acme" in uri
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/auth/test_totp_unit.py -v`
Expected: FAIL — `ModuleNotFoundError` / attribute errors (`totp` has no `totp_now`).

- [ ] **Step 3: Write minimal implementation**

```python
# backend/app/utils/totp.py
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
    label = quote(f"{issuer}:{account_email}")
    params = urlencode({"secret": secret, "issuer": issuer, "digits": 6, "period": 30})
    return f"otpauth://totp/{label}?{params}"
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/auth/test_totp_unit.py -v`
Expected: PASS (all 7).

- [ ] **Step 5: Commit**

```bash
git add backend/app/utils/totp.py backend/tests/auth/test_totp_unit.py
git commit -m "feat(2fa): stdlib RFC 6238 TOTP with vector tests"
```

---

### Task 2: Secret encryption + recovery-code helpers

**Files:**
- Create: `backend/app/utils/totp_crypto.py`
- Test: `backend/tests/auth/test_totp_crypto_unit.py`

**Interfaces:**
- Consumes: `settings.SECRET_KEY`.
- Produces:
  - `encrypt_secret(plain: str) -> str`
  - `decrypt_secret(token: str) -> str`
  - `generate_recovery_codes(n: int = 10) -> list[str]` (plaintext, 8-char)
  - `hash_recovery_code(code: str) -> str` (SHA-256 hex; normalizes case/spacing)

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/auth/test_totp_crypto_unit.py
from app.utils import totp_crypto as tc

def test_encrypt_roundtrip():
    secret = "GEZDGNBVGY3TQOJQ"
    token = tc.encrypt_secret(secret)
    assert token != secret
    assert tc.decrypt_secret(token) == secret

def test_encrypt_is_nondeterministic():
    a = tc.encrypt_secret("SAME")
    b = tc.encrypt_secret("SAME")
    assert a != b  # Fernet embeds a random IV/timestamp
    assert tc.decrypt_secret(a) == tc.decrypt_secret(b) == "SAME"

def test_recovery_codes_generation():
    codes = tc.generate_recovery_codes()
    assert len(codes) == 10
    assert len(set(codes)) == 10
    assert all(len(c) == 8 for c in codes)

def test_recovery_hash_is_case_and_space_insensitive():
    code = "ABCD2345"
    assert tc.hash_recovery_code(code) == tc.hash_recovery_code(" abcd2345 ")
    assert tc.hash_recovery_code(code) != tc.hash_recovery_code("ABCD2346")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/auth/test_totp_crypto_unit.py -v`
Expected: FAIL — module missing.

- [ ] **Step 3: Write minimal implementation**

```python
# backend/app/utils/totp_crypto.py
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/auth/test_totp_crypto_unit.py -v`
Expected: PASS (4).

- [ ] **Step 5: Commit**

```bash
git add backend/app/utils/totp_crypto.py backend/tests/auth/test_totp_crypto_unit.py
git commit -m "feat(2fa): Fernet secret encryption + recovery-code helpers"
```

---

### Task 3: Models + migration wiring

**Files:**
- Modify: `backend/app/models/core/user.py` (add 3 columns)
- Modify: `backend/app/models/core/company.py` (add `require_2fa`)
- Create: `backend/app/models/core/mfa_recovery_code.py`
- Modify: `backend/app/models/core/__init__.py` (export the new model)
- Modify: `backend/create_missing_tables.py` (append to `_MISSING_COLUMNS`)
- Test: `backend/tests/auth/test_2fa_models.py`

**Interfaces:**
- Produces:
  - `User.totp_secret: str | None`, `User.totp_enabled: bool`, `User.totp_confirmed_at`
  - `Company.require_2fa: bool`
  - `MfaRecoveryCode(id, user_id, code_hash, used_at, created_at)`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/auth/test_2fa_models.py
from app.models.core.user import User
from app.models.core.company import Company
from app.models.core.mfa_recovery_code import MfaRecoveryCode

def test_user_has_2fa_columns():
    for col in ("totp_secret", "totp_enabled", "totp_confirmed_at"):
        assert col in User.__table__.columns

def test_company_has_require_2fa():
    assert "require_2fa" in Company.__table__.columns

def test_recovery_code_table():
    for col in ("id", "user_id", "code_hash", "used_at", "created_at"):
        assert col in MfaRecoveryCode.__table__.columns
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/auth/test_2fa_models.py -v`
Expected: FAIL — import error / missing columns.

- [ ] **Step 3: Write minimal implementation**

In `backend/app/models/core/user.py`, add to the `User` class (near the other columns):

```python
    totp_secret = Column(String(255), nullable=True)
    totp_enabled = Column(Boolean, default=False, nullable=False)
    totp_confirmed_at = Column(DateTime(timezone=True), nullable=True)
```

In `backend/app/models/core/company.py`, add to the `Company` class:

```python
    require_2fa = Column(Boolean, default=False, nullable=False)
```
(add `Boolean` to the existing `from sqlalchemy import ...` line if absent)

Create `backend/app/models/core/mfa_recovery_code.py`:

```python
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.database import Base


class MfaRecoveryCode(Base):
    __tablename__ = "mfa_recovery_codes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    code_hash = Column(String(64), nullable=False)
    used_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
```

In `backend/app/models/core/__init__.py`, add an import so `create_all` sees it (mirror the existing per-model imports — e.g. `from app.models.core.mfa_recovery_code import MfaRecoveryCode`).

In `backend/create_missing_tables.py`, append to `_MISSING_COLUMNS`:

```python
    ("users", "totp_secret", "VARCHAR(255)"),
    ("users", "totp_enabled", "BOOLEAN DEFAULT FALSE"),
    ("users", "totp_confirmed_at", "TIMESTAMP WITH TIME ZONE"),
    ("companies", "require_2fa", "BOOLEAN DEFAULT FALSE"),
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/auth/test_2fa_models.py -v`
Expected: PASS (3). Also run `python -m pytest tests/auth/ -q` to confirm nothing else broke.

- [ ] **Step 5: Commit**

```bash
git add backend/app/models/core/ backend/create_missing_tables.py backend/tests/auth/test_2fa_models.py
git commit -m "feat(2fa): user/company columns + mfa_recovery_codes table"
```

---

### Task 4: Enrollment endpoints (setup / confirm / status / disable / regenerate)

**Files:**
- Create: `backend/app/routers/auth/mfa.py`
- Modify: `backend/app/main.py` (register the router) — find where `auth` router is `include_router`-ed and add the mfa router with the same `/api/auth` prefix + tags.
- Test: `backend/tests/auth/test_2fa_enroll.py`

**Interfaces:**
- Consumes: Task 1 (`totp`), Task 2 (`totp_crypto`), Task 3 models, `get_current_user`, `verify_password`, `log_activity`.
- Produces (endpoints, all prefixed `/api/auth/2fa`):
  - `POST /setup` → `{otpauth_uri, secret}`
  - `POST /confirm` `{code}` → `{recovery_codes: [...]}`
  - `GET /status` → `{enabled, confirmed_at, recovery_codes_remaining}`
  - `POST /disable` `{password}` → `{message}`
  - `POST /recovery-codes/regenerate` `{password}` → `{recovery_codes: [...]}`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/auth/test_2fa_enroll.py
from app.utils.rate_limit import auth_limiter
from app.utils import totp
from app.utils.totp_crypto import decrypt_secret
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


def _enrolled_login(client, db, email="u@x.co", require_2fa=False):
    auth_limiter._buckets.clear()
    company = create_company(db, name="X Co", company_code="XCO")
    if require_2fa:
        company.require_2fa = True
        db.commit()
    create_active_user(db, email=email, role="admin", company_id=company.id)
    login_user(client, email)  # sets Bearer header
    return company


def test_setup_returns_uri_and_stores_encrypted_secret(client, db):
    _enrolled_login(client, db)
    r = client.post("/api/auth/2fa/setup")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["otpauth_uri"].startswith("otpauth://totp/")
    assert body["secret"]
    # stored secret is encrypted, not the plaintext
    from app.models.core.user import User
    user = db.query(User).filter(User.email == "u@x.co").first()
    assert user.totp_secret and user.totp_secret != body["secret"]
    assert decrypt_secret(user.totp_secret) == body["secret"]
    assert user.totp_enabled is False


def test_confirm_enables_and_returns_recovery_codes(client, db):
    _enrolled_login(client, db)
    secret = client.post("/api/auth/2fa/setup").json()["secret"]
    code = totp.totp_now(secret)
    r = client.post("/api/auth/2fa/confirm", json={"code": code})
    assert r.status_code == 200, r.text
    codes = r.json()["recovery_codes"]
    assert len(codes) == 10
    status = client.get("/api/auth/2fa/status").json()
    assert status["enabled"] is True and status["recovery_codes_remaining"] == 10


def test_confirm_rejects_bad_code(client, db):
    _enrolled_login(client, db)
    client.post("/api/auth/2fa/setup")
    r = client.post("/api/auth/2fa/confirm", json={"code": "000000"})
    assert r.status_code == 400


def test_disable_requires_password_and_clears(client, db):
    _enrolled_login(client, db)
    secret = client.post("/api/auth/2fa/setup").json()["secret"]
    client.post("/api/auth/2fa/confirm", json={"code": totp.totp_now(secret)})
    r = client.post("/api/auth/2fa/disable", json={"password": "pw"})
    assert r.status_code == 200, r.text
    assert client.get("/api/auth/2fa/status").json()["enabled"] is False


def test_disable_blocked_under_mandate(client, db):
    _enrolled_login(client, db, require_2fa=True)
    secret = client.post("/api/auth/2fa/setup").json()["secret"]
    client.post("/api/auth/2fa/confirm", json={"code": totp.totp_now(secret)})
    r = client.post("/api/auth/2fa/disable", json={"password": "pw"})
    assert r.status_code == 403
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/auth/test_2fa_enroll.py -v`
Expected: FAIL — 404s (router not mounted).

- [ ] **Step 3: Write minimal implementation**

```python
# backend/app/routers/auth/mfa.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.database import get_db
from app.models.core.user import User
from app.models.core.company import Company
from app.models.core.mfa_recovery_code import MfaRecoveryCode
from app.utils.dependencies import get_current_user
from app.utils.security import verify_password
from app.utils import totp
from app.utils.totp_crypto import (
    encrypt_secret, decrypt_secret, generate_recovery_codes, hash_recovery_code,
)
from app.utils.audit import log_activity

router = APIRouter(prefix="/2fa", tags=["2fa"])


class CodeBody(BaseModel):
    code: str


class PasswordBody(BaseModel):
    password: str


def _company_requires_2fa(db: Session, user: User) -> bool:
    if user.company_id is None:
        return False
    company = db.query(Company).filter(Company.id == user.company_id).first()
    return bool(company and company.require_2fa)


def _issue_recovery_codes(db: Session, user: User) -> list[str]:
    db.query(MfaRecoveryCode).filter(MfaRecoveryCode.user_id == user.id).delete()
    codes = generate_recovery_codes()
    for c in codes:
        db.add(MfaRecoveryCode(user_id=user.id, code_hash=hash_recovery_code(c)))
    return codes


@router.post("/setup")
def setup(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.totp_enabled:
        raise HTTPException(status_code=400, detail="2FA is already enabled")
    secret = totp.generate_secret()
    user.totp_secret = encrypt_secret(secret)
    db.commit()
    return {
        "secret": secret,
        "otpauth_uri": totp.provisioning_uri(secret, user.email),
    }


@router.post("/confirm")
def confirm(body: CodeBody, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.totp_enabled:
        raise HTTPException(status_code=400, detail="2FA is already enabled")
    if not user.totp_secret:
        raise HTTPException(status_code=400, detail="Start setup first")
    secret = decrypt_secret(user.totp_secret)
    if not totp.verify_totp(secret, body.code):
        raise HTTPException(status_code=400, detail="Invalid code")
    user.totp_enabled = True
    user.totp_confirmed_at = datetime.now(timezone.utc)
    codes = _issue_recovery_codes(db, user)
    log_activity(db, action="2fa:enabled", entity_type="user", entity_id=user.id,
                 user_id=user.id, company_id=user.company_id)
    db.commit()
    return {"recovery_codes": codes}


@router.get("/status")
def status(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    remaining = db.query(MfaRecoveryCode).filter(
        MfaRecoveryCode.user_id == user.id, MfaRecoveryCode.used_at.is_(None)
    ).count()
    return {
        "enabled": bool(user.totp_enabled),
        "confirmed_at": user.totp_confirmed_at.isoformat() if user.totp_confirmed_at else None,
        "recovery_codes_remaining": remaining,
    }


@router.post("/disable")
def disable(body: PasswordBody, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Password is incorrect")
    if _company_requires_2fa(db, user):
        raise HTTPException(status_code=403, detail="Your company requires 2FA; it cannot be disabled")
    user.totp_enabled = False
    user.totp_secret = None
    user.totp_confirmed_at = None
    db.query(MfaRecoveryCode).filter(MfaRecoveryCode.user_id == user.id).delete()
    log_activity(db, action="2fa:disabled", entity_type="user", entity_id=user.id,
                 user_id=user.id, company_id=user.company_id)
    db.commit()
    return {"message": "2FA disabled"}


@router.post("/recovery-codes/regenerate")
def regenerate(body: PasswordBody, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Password is incorrect")
    if not user.totp_enabled:
        raise HTTPException(status_code=400, detail="2FA is not enabled")
    codes = _issue_recovery_codes(db, user)
    db.commit()
    return {"recovery_codes": codes}
```

Register in `backend/app/main.py` next to the existing auth include (match its prefix — the auth router is mounted at `/api/auth`, so this router's own `/2fa` prefix yields `/api/auth/2fa`):

```python
from app.routers.auth import mfa as auth_mfa
app.include_router(auth_mfa.router, prefix="/api/auth")
```

**Note:** verify `log_activity`'s real signature in `backend/app/utils/audit.py` before wiring — match its parameter names exactly (the call above assumes `action`, `entity_type`, `entity_id`, `user_id`, `company_id`; adjust to the actual signature if it differs, e.g. `actor_id`).

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/auth/test_2fa_enroll.py -v`
Expected: PASS (5).

- [ ] **Step 5: Commit**

```bash
git add backend/app/routers/auth/mfa.py backend/app/main.py backend/tests/auth/test_2fa_enroll.py
git commit -m "feat(2fa): enrollment endpoints (setup/confirm/status/disable/regenerate)"
```

---

### Task 5: Login challenge branch + `/2fa/verify` + LoginResponse schema

**Files:**
- Modify: `backend/app/schemas/admin.py` (`LoginResponse` — make token fields optional, add MFA fields)
- Modify: `backend/app/routers/auth/auth.py` (`/login`, `/login-otp` branch; add helper)
- Modify: `backend/app/routers/auth/mfa.py` (add `POST /verify`)
- Modify: `backend/app/routers/auth/__init__.py` if it re-exports (only if needed)
- Test: `backend/tests/auth/test_2fa_login.py`

**Interfaces:**
- Consumes: Task 1/2/3/4, `create_access_token`, `decode_access_token`, `_issue_refresh_token`, `_set_auth_cookie`, `_set_refresh_cookie`, `auth_limiter`.
- Produces:
  - `/login` and `/login-otp` return `{mfa_required: true, mfa_token}` or `{mfa_setup_required: true, setup_token}` when applicable, else the unchanged token payload.
  - `POST /api/auth/2fa/verify` `{mfa_token, code}` → standard token payload.
  - Helper `mfa_challenge_or_none(db, user, response) -> dict | None` in `auth.py`.

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/auth/test_2fa_login.py
from app.utils.rate_limit import auth_limiter
from app.utils import totp
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


def _password_login(client, email="v@x.co", password="pw"):
    auth_limiter._buckets.clear()
    return client.post(
        "/api/auth/login",
        data={"username": email, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )


def _make_enrolled(client, db, email="v@x.co"):
    company = create_company(db, name="V Co", company_code="VCO")
    create_active_user(db, email=email, role="admin", company_id=company.id)
    login_user(client, email)
    secret = client.post("/api/auth/2fa/setup").json()["secret"]
    codes = client.post("/api/auth/2fa/confirm", json={"code": totp.totp_now(secret)}).json()["recovery_codes"]
    client.headers.pop("Authorization", None)
    return company, secret, codes


def test_non_2fa_login_unchanged(client, db):
    company = create_company(db, name="Plain", company_code="PLN")
    create_active_user(db, email="plain@x.co", role="admin", company_id=company.id)
    body = _password_login(client, "plain@x.co").json()
    assert body["access_token"] and body["refresh_token"]
    assert "mfa_required" not in body or body["mfa_required"] in (None, False)


def test_enrolled_login_returns_challenge_not_tokens(client, db):
    _make_enrolled(client, db)
    body = _password_login(client).json()
    assert body["mfa_required"] is True
    assert body["mfa_token"]
    assert body.get("access_token") in (None, "")


def test_verify_with_totp_issues_tokens(client, db):
    _, secret, _ = _make_enrolled(client, db)
    mfa_token = _password_login(client).json()["mfa_token"]
    r = client.post("/api/auth/2fa/verify", json={"mfa_token": mfa_token, "code": totp.totp_now(secret)})
    assert r.status_code == 200, r.text
    assert r.json()["access_token"] and r.json()["refresh_token"]


def test_verify_with_wrong_code_401(client, db):
    _make_enrolled(client, db)
    mfa_token = _password_login(client).json()["mfa_token"]
    r = client.post("/api/auth/2fa/verify", json={"mfa_token": mfa_token, "code": "000000"})
    assert r.status_code == 401


def test_recovery_code_single_use(client, db):
    _, _, codes = _make_enrolled(client, db)
    mfa_token = _password_login(client).json()["mfa_token"]
    r1 = client.post("/api/auth/2fa/verify", json={"mfa_token": mfa_token, "code": codes[0]})
    assert r1.status_code == 200, r1.text
    mfa_token2 = _password_login(client).json()["mfa_token"]
    r2 = client.post("/api/auth/2fa/verify", json={"mfa_token": mfa_token2, "code": codes[0]})
    assert r2.status_code == 401


def test_mandate_forces_setup(client, db):
    company = create_company(db, name="Mand", company_code="MND", status="active")
    company.require_2fa = True
    db.commit()
    create_active_user(db, email="mand@x.co", role="admin", company_id=company.id)
    body = _password_login(client, "mand@x.co").json()
    assert body["mfa_setup_required"] is True
    assert body["setup_token"]
    assert body.get("access_token") in (None, "")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/auth/test_2fa_login.py -v`
Expected: FAIL — enrolled login still returns tokens; `/2fa/verify` 404.

- [ ] **Step 3: Write minimal implementation**

In `backend/app/schemas/admin.py`, change `LoginResponse` so token fields are optional and MFA fields exist (keep existing `user`/`token_type`):

```python
class LoginResponse(BaseModel):
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    user: Optional[dict] = None
    mfa_required: Optional[bool] = None
    mfa_token: Optional[str] = None
    mfa_setup_required: Optional[bool] = None
    setup_token: Optional[str] = None
```
(ensure `from typing import Optional` is imported; keep any existing fields.)

In `backend/app/routers/auth/auth.py`, add a helper and call it in both login endpoints **before** issuing tokens. Add imports at top: `from app.models.core.mfa_recovery_code import MfaRecoveryCode`, `from app.utils import totp`, `from app.utils.totp_crypto import decrypt_secret, hash_recovery_code`, `from app.utils.dependencies import is_platform_admin`.

```python
def _mfa_challenge_or_none(db: Session, user: User) -> Optional[dict]:
    """Return a challenge dict if this login must not mint a session yet, else None."""
    if is_platform_admin(user):
        return None
    if user.totp_enabled:
        token = create_access_token(
            data={"sub": user.email}, expires_delta=timedelta(minutes=5), audience="mfa"
        )
        return {"mfa_required": True, "mfa_token": token}
    company = db.query(Company).filter(Company.id == user.company_id).first() if user.company_id else None
    if company and company.require_2fa:
        token = create_access_token(
            data={"sub": user.email}, expires_delta=timedelta(minutes=15), audience="mfa_setup"
        )
        return {"mfa_setup_required": True, "setup_token": token}
    return None
```

In `/login`, replace the block that issues tokens (after `_check_company_status` and `user.last_active_at` update) with:

```python
    user.last_active_at = datetime.now(timezone.utc)
    db.commit()

    challenge = _mfa_challenge_or_none(db, user)
    if challenge is not None:
        return challenge

    access_token = create_access_token(data={"sub": user.email, "role": user.role})
    _set_auth_cookie(response, access_token)
    refresh_token = _issue_refresh_token(db, user)
    db.commit()
    _set_refresh_cookie(response, refresh_token)
    return { ... existing token payload ... }
```
Apply the same `challenge = _mfa_challenge_or_none(...)` guard in `/login-otp` right before it mints tokens (after it deletes the OTP row and commits).

In `backend/app/routers/auth/mfa.py`, add the verify endpoint (imports: `Request`, `Response`, `decode_access_token`, `create_access_token`, `_issue_refresh_token`, `_set_auth_cookie`, `_set_refresh_cookie` — import the cookie/refresh helpers from `app.routers.auth.auth`, and `auth_limiter`):

```python
class VerifyBody(BaseModel):
    mfa_token: str
    code: str


@router.post("/verify")
def verify(body: VerifyBody, request: Request, response: Response, db: Session = Depends(get_db)):
    from app.routers.auth.auth import _issue_refresh_token, _set_auth_cookie, _set_refresh_cookie
    from app.utils.security import decode_access_token, create_access_token
    from app.utils.rate_limit import auth_limiter

    payload = decode_access_token(body.mfa_token, audience="mfa")
    if not payload or not payload.get("sub"):
        raise HTTPException(status_code=401, detail="Invalid or expired challenge")
    email = payload["sub"].lower()
    auth_limiter.check(request, f"verify_2fa:{email}", max_attempts=10, window_seconds=600)

    user = db.query(User).filter(User.email == email).first()
    if not user or not user.totp_enabled or not user.totp_secret:
        raise HTTPException(status_code=401, detail="Invalid or expired challenge")

    ok = totp.verify_totp(decrypt_secret(user.totp_secret), body.code)
    if not ok:
        row = db.query(MfaRecoveryCode).filter(
            MfaRecoveryCode.user_id == user.id,
            MfaRecoveryCode.code_hash == hash_recovery_code(body.code),
            MfaRecoveryCode.used_at.is_(None),
        ).first()
        if row:
            row.used_at = datetime.now(timezone.utc)
            ok = True
    if not ok:
        db.commit()
        raise HTTPException(status_code=401, detail="Invalid code")

    user.last_active_at = datetime.now(timezone.utc)
    access_token = create_access_token(data={"sub": user.email, "role": user.role})
    _set_auth_cookie(response, access_token)
    refresh_token = _issue_refresh_token(db, user)
    db.commit()
    _set_refresh_cookie(response, refresh_token)
    return {
        "access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer",
        "user": {"id": user.id, "email": user.email, "full_name": user.full_name,
                 "role": user.role, "company_id": user.company_id},
    }
```

**Import-cycle note:** import the `auth.py` helpers **inside** the `verify` function (as shown) to avoid a circular import between `auth.py` and `mfa.py`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/auth/test_2fa_login.py -v`
Then the whole auth suite: `python -m pytest tests/auth/ -q` — confirm the pre-existing refresh/login tests still pass (non-2FA path unchanged).
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/schemas/admin.py backend/app/routers/auth/auth.py backend/app/routers/auth/mfa.py backend/tests/auth/test_2fa_login.py
git commit -m "feat(2fa): login challenge branch + /2fa/verify"
```

---

### Task 6: Company mandate endpoint + setup-token acceptance for forced enrollment

**Files:**
- Create: `backend/app/routers/admin/company_security.py` (or extend an existing company-admin router if one already owns `/api/company` — check first)
- Modify: `backend/app/main.py` (register if new)
- Modify: `backend/app/routers/auth/mfa.py` (`/setup` + `/confirm` accept a valid `mfa_setup` token as an alternative to a session)
- Test: `backend/tests/auth/test_2fa_mandate.py`

**Interfaces:**
- Consumes: Task 5 (`setup_token` with `aud="mfa_setup"`), `get_current_user`, `log_activity`.
- Produces:
  - `PATCH /api/company/security` `{require_2fa: bool}` → `{require_2fa}`
  - `/setup` and `/confirm` additionally accept `X-Setup-Token` header (or `setup_token` body field) identifying the user when there is no session.

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/auth/test_2fa_mandate.py
from app.utils.rate_limit import auth_limiter
from app.utils import totp
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


def test_admin_sets_mandate(client, db):
    auth_limiter._buckets.clear()
    company = create_company(db, name="Adm", company_code="ADM")
    create_active_user(db, email="adm@x.co", role="admin", company_id=company.id)
    login_user(client, "adm@x.co")
    r = client.patch("/api/company/security", json={"require_2fa": True})
    assert r.status_code == 200, r.text
    assert r.json()["require_2fa"] is True


def test_non_admin_cannot_set_mandate(client, db):
    auth_limiter._buckets.clear()
    company = create_company(db, name="Sal", company_code="SAL")
    create_active_user(db, email="sales@x.co", role="sales", company_id=company.id)
    login_user(client, "sales@x.co")
    r = client.patch("/api/company/security", json={"require_2fa": True})
    assert r.status_code in (401, 403)


def test_forced_enrollment_with_setup_token(client, db):
    auth_limiter._buckets.clear()
    company = create_company(db, name="Force", company_code="FRC", status="active")
    company.require_2fa = True
    db.commit()
    create_active_user(db, email="force@x.co", role="admin", company_id=company.id)
    login = client.post(
        "/api/auth/login",
        data={"username": "force@x.co", "password": "pw"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    ).json()
    setup_token = login["setup_token"]
    # no Authorization header; enroll using the setup token
    s = client.post("/api/auth/2fa/setup", headers={"X-Setup-Token": setup_token})
    assert s.status_code == 200, s.text
    secret = s.json()["secret"]
    c = client.post("/api/auth/2fa/confirm",
                    json={"code": totp.totp_now(secret)},
                    headers={"X-Setup-Token": setup_token})
    assert c.status_code == 200, c.text
    assert len(c.json()["recovery_codes"]) == 10
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/auth/test_2fa_mandate.py -v`
Expected: FAIL — `/api/company/security` 404; setup requires a session.

- [ ] **Step 3: Write minimal implementation**

Create `backend/app/routers/admin/company_security.py`:

```python
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.core.user import User
from app.models.core.company import Company
from app.utils.dependencies import get_current_user
from app.utils.audit import log_activity

router = APIRouter(prefix="/company", tags=["company-security"])


class SecurityBody(BaseModel):
    require_2fa: bool


@router.patch("/security")
def set_security(body: SecurityBody, db: Session = Depends(get_db),
                 user: User = Depends(get_current_user)):
    if user.role != "admin" or user.company_id is None:
        raise HTTPException(status_code=403, detail="Only company admins can change this")
    company = db.query(Company).filter(Company.id == user.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    company.require_2fa = body.require_2fa
    log_activity(db, action="company:require_2fa_changed", entity_type="company",
                 entity_id=company.id, user_id=user.id, company_id=company.id)
    db.commit()
    return {"require_2fa": company.require_2fa}
```

Register in `main.py`: `app.include_router(company_security.router, prefix="/api")`.

In `mfa.py`, add a resolver that accepts either a session **or** a valid `mfa_setup` token, and use it in `/setup` and `/confirm` in place of `Depends(get_current_user)`:

```python
from fastapi import Header
from typing import Optional
from app.utils.security import decode_access_token


def get_enrolling_user(
    x_setup_token: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
    request: "Request" = None,
) -> User:
    # Prefer a normal session if present.
    from app.utils.dependencies import _extract_bearer_or_cookie  # if such a helper exists
    # Simpler: try get_current_user via a soft attempt, else fall back to setup token.
    if x_setup_token:
        payload = decode_access_token(x_setup_token, audience="mfa_setup")
        if payload and payload.get("sub"):
            user = db.query(User).filter(User.email == payload["sub"].lower()).first()
            if user:
                return user
    raise HTTPException(status_code=401, detail="Not authenticated")
```

**Simpler, recommended shape:** keep `/setup` and `/confirm` on `get_current_user`, and add a tiny dependency that returns the current user when a Bearer/cookie session exists, otherwise resolves the `X-Setup-Token`. Implement it by calling the existing `get_current_user` logic in a try/except; if it raises 401 and a valid `mfa_setup` token is present, return that user. Wire both `/setup` and `/confirm` to this `get_enrolling_user` dependency. (Verify the exact token-extraction helper names in `app/utils/dependencies.py` before writing — do not invent a helper that isn't there; if none is exported, decode the `X-Setup-Token` header directly as above and fall back to `get_current_user` via `Depends`.)

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python -m pytest tests/auth/test_2fa_mandate.py -v`
Expected: PASS (3).

- [ ] **Step 5: Commit**

```bash
git add backend/app/routers/admin/company_security.py backend/app/main.py backend/app/routers/auth/mfa.py backend/tests/auth/test_2fa_mandate.py
git commit -m "feat(2fa): company mandate endpoint + forced-enrollment via setup token"
```

---

### Task 7: Cross-tenant isolation test

**Files:**
- Test: `backend/tests/tenancy/test_2fa_cross_tenant.py`

**Interfaces:**
- Consumes: all prior backend tasks.
- Produces: proof that company B cannot read/alter company A's 2FA state or set A's mandate.

- [ ] **Step 1: Write the failing test (should PASS once backend is correct — this is a guardrail)**

```python
# backend/tests/tenancy/test_2fa_cross_tenant.py
from app.utils.rate_limit import auth_limiter
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


def test_mandate_is_scoped_to_own_company(client, db):
    auth_limiter._buckets.clear()
    a = create_company(db, name="A Co", company_code="ACO")
    b = create_company(db, name="B Co", company_code="BCO")
    create_active_user(db, email="a-admin@x.co", role="admin", company_id=a.id)
    create_active_user(db, email="b-admin@x.co", role="admin", company_id=b.id)

    # B's admin sets a mandate — must affect only B, never A.
    login_user(client, "b-admin@x.co")
    r = client.patch("/api/company/security", json={"require_2fa": True})
    assert r.status_code == 200
    db.expire_all()
    from app.models.core.company import Company
    assert db.query(Company).filter(Company.id == a.id).first().require_2fa is False
    assert db.query(Company).filter(Company.id == b.id).first().require_2fa is True


def test_status_is_per_user(client, db):
    auth_limiter._buckets.clear()
    a = create_company(db, name="A2", company_code="AC2")
    create_active_user(db, email="a1@x.co", role="admin", company_id=a.id)
    create_active_user(db, email="a2@x.co", role="sales", company_id=a.id)
    login_user(client, "a2@x.co")
    # A2 (never enrolled) sees their own disabled status — not A1's.
    assert client.get("/api/auth/2fa/status").json()["enabled"] is False
```

- [ ] **Step 2: Run test**

Run: `cd backend && python -m pytest tests/tenancy/test_2fa_cross_tenant.py -v`
Expected: PASS (2). If either fails, the mandate/status endpoint is leaking scope — fix the endpoint, not the test.

- [ ] **Step 3: Run the full backend suite**

Run: `cd backend && python -m pytest -q`
Expected: all green (prior 162+ plus the new 2FA tests). Investigate any regression before committing.

- [ ] **Step 4: Commit**

```bash
git add backend/tests/tenancy/test_2fa_cross_tenant.py
git commit -m "test(2fa): cross-tenant isolation for mandate + status"
```

---

### Task 8: Frontend API client + AuthContext challenge handling

**Files:**
- Modify: `frontend/services/api.js` (add 2FA methods)
- Modify: `frontend/contexts/AuthContext.jsx` (`login`/`loginOTP` surface the challenge; add `verify2FA`)
- Test: manual (no frontend test harness in this repo — verified in Task 11 smoke test)

**Interfaces:**
- Consumes: Task 4/5/6 endpoints.
- Produces: `api` methods `setup2FA()`, `confirm2FA(code, setupToken?)`, `get2FAStatus()`, `disable2FA(password)`, `regenerateRecoveryCodes(password)`, `verify2FA(mfaToken, code)`, `setCompanyRequire2FA(value)`; AuthContext returns raw login response and exposes `verify2FA`.

- [ ] **Step 1: Add API methods**

In `frontend/services/api.js`, export helpers (match the file's existing export style — the file exports the `api` axios instance; add named functions alongside `setActiveTeamId`/`getActiveTeamId`):

```javascript
export const twoFactor = {
  status: () => api.get('/auth/2fa/status').then(r => r.data),
  setup: (setupToken) => api.post('/auth/2fa/setup', {}, setupToken ? { headers: { 'X-Setup-Token': setupToken } } : {}).then(r => r.data),
  confirm: (code, setupToken) => api.post('/auth/2fa/confirm', { code }, setupToken ? { headers: { 'X-Setup-Token': setupToken } } : {}).then(r => r.data),
  disable: (password) => api.post('/auth/2fa/disable', { password }).then(r => r.data),
  regenerate: (password) => api.post('/auth/2fa/recovery-codes/regenerate', { password }).then(r => r.data),
  verify: (mfa_token, code) => api.post('/auth/2fa/verify', { mfa_token, code }).then(r => r.data),
};

export const companySecurity = {
  setRequire2FA: (require_2fa) => api.patch('/company/security', { require_2fa }).then(r => r.data),
};
```

- [ ] **Step 2: Update AuthContext**

In `frontend/contexts/AuthContext.jsx`, ensure `login` and `loginOTP` return `response.data` unchanged (they already do), and add:

```javascript
  const verify2FA = async (mfa_token, code) => {
    const response = await api.post('/auth/2fa/verify', { mfa_token, code });
    await fetchUser();          // hydrate the user after the session cookie is set
    return response.data;
  };
```
Add `verify2FA` to the context `value={{ ... }}`.

- [ ] **Step 3: Commit**

```bash
git add frontend/services/api.js frontend/contexts/AuthContext.jsx
git commit -m "feat(2fa): frontend api client + auth context challenge handling"
```

---

### Task 9: Login page — challenge + forced-setup steps

**Files:**
- Modify: `frontend/app/login/page.jsx`

**Interfaces:**
- Consumes: Task 8 (`verify2FA`, `twoFactor`), the login response fields `mfa_required`/`mfa_token`/`mfa_setup_required`/`setup_token`.

- [ ] **Step 1: Add challenge state + handling**

After a successful `login()`/`loginOTP()` call in `handleSubmit`, branch on the result before `handleRedirect`:
- If `result.mfa_required`: store `mfaToken = result.mfa_token`, switch the form into a `stage = '2fa'` mode showing a 6-digit input and a "Use a recovery code" toggle (switches to an 8-char text input). Submit calls `verify2FA(mfaToken, code)`; on success `handleRedirect(res.user)`.
- If `result.mfa_setup_required`: redirect to `/settings/security?setup_token=<result.setup_token>&forced=1`.
- Else: `handleRedirect(result.user)` as today.

Requirements: labeled inputs, visible focus states, an error region reusing the existing error banner markup, a loading state on the verify button, and all four data states. Keep the existing Tailwind token classes (`bg-surface`, `text-primary`, `border-border`, `bg-accent`, etc.) for visual consistency.

- [ ] **Step 2: Manual verification is deferred to Task 11.** Commit.

```bash
git add frontend/app/login/page.jsx
git commit -m "feat(2fa): login page challenge and forced-setup steps"
```

---

### Task 10: Security settings page + admin mandate toggle

**Files:**
- Create: `frontend/app/settings/security/page.jsx`
- Modify: `frontend/app/settings/page.jsx` (add a link/card to the security page)
- Modify: an admin settings surface (`frontend/app/admin/settings/page.jsx`) to add the "Require 2FA for all members" toggle

**Interfaces:**
- Consumes: Task 8 (`twoFactor`, `companySecurity`), `useAuth` (for `user.role`).

- [ ] **Step 1: Build the security page**

`frontend/app/settings/security/page.jsx` (`'use client'`), reading `?setup_token=` and `?forced=` from `useSearchParams()`:
- On mount, `twoFactor.status()` → render one of:
  - **Not enabled:** "Enable 2FA" button → `twoFactor.setup(setupToken)` → show the `otpauth_uri` as a QR (render client-side; use a small inline QR via a canvas draw or a tiny bundled helper — do **not** call any external image host, CSP forbids it) plus the secret text, and a 6-digit verify field → `twoFactor.confirm(code, setupToken)` → show the 10 recovery codes with copy + "download as .txt" (client-side Blob) and a "I've saved these" confirmation.
  - **Enabled:** show status, `recovery_codes_remaining`, a password-gated "Regenerate recovery codes", and a password-gated "Disable 2FA" (hide/disable Disable when the company mandate is on — surface the 403 message if attempted).
- Handle loading / error / empty / success states. Semantic markup, labeled inputs, keyboard reachable, visible focus. Match existing settings-page Tailwind classes.

- [ ] **Step 2: Link from settings home**

In `frontend/app/settings/page.jsx`, add a card linking to `/settings/security` (mirror the existing card markup — icon tile + title + description, e.g. a `Shield` lucide icon).

- [ ] **Step 3: Admin mandate toggle**

In the admin settings page, add a toggle (only rendered when `user.role === 'admin'`) reading current state and calling `companySecurity.setRequire2FA(value)`; optimistic UI with error rollback. Mirror the existing theme-toggle switch markup in `settings/page.jsx` for visual consistency.

- [ ] **Step 4: Commit**

```bash
git add frontend/app/settings/security/page.jsx frontend/app/settings/page.jsx frontend/app/admin/settings/page.jsx
git commit -m "feat(2fa): security settings page + admin mandate toggle"
```

---

### Task 11: End-to-end smoke test + docs

**Files:**
- Modify: `docs/IMPLEMENTATION_PLAN.md` (append a Phase 3.1 progress-log entry)

- [ ] **Step 1: Run backend suite**

Run: `cd backend && python -m pytest -q`. Confirm all green. Record the count.

- [ ] **Step 2: Manual full-stack smoke**

Per the repo's run convention (start backend + `frontend` dev server). As a signed-in admin:
1. `/settings/security` → Enable 2FA → scan QR in an authenticator (or read the secret) → confirm code → save recovery codes.
2. Log out → log in with password → confirm the 2FA code step appears → enter the code → land on the dashboard.
3. Log out → log in → on the code step, use a recovery code → confirm it works and `recovery_codes_remaining` drops.
4. As admin, toggle "Require 2FA for all members" on. Create/have a second non-enrolled user; log in as them → confirm forced-setup redirect.
5. Confirm no console errors and all four data states render on the security page.

Record results in the progress log. If any step fails, fix before the final commit (systematic-debugging).

- [ ] **Step 3: Update the implementation plan doc**

Append a "Phase 3.1 — TOTP 2FA — DONE" progress entry to `docs/IMPLEMENTATION_PLAN.md` (mirror the Phase 1 entry style): endpoints added, migration note (`create_missing_tables.py` adds the 4 columns + `mfa_recovery_codes`; no new pip dep), test count, and the documented residual (stateless access token ≤30 min → mandate/disable takes up to one token lifetime to fully bite).

- [ ] **Step 4: Commit**

```bash
git add docs/IMPLEMENTATION_PLAN.md
git commit -m "docs(2fa): Phase 3.1 progress log + deploy notes"
```

---

## Self-Review

**Spec coverage:**
- §1 data model → Task 3. ✅
- §2 stdlib TOTP + Fernet, no deps → Tasks 1, 2 (RFC vectors pinned). ✅
- §3 enrollment endpoints → Task 4. ✅
- §4 login challenge + `/2fa/verify` + optional LoginResponse fields → Task 5. ✅
- §5 admin mandate + setup-token forced enrollment → Task 6. ✅
- §6 frontend (api, context, login, security page, admin toggle) → Tasks 8, 9, 10. ✅
- §7 migration (`_MISSING_COLUMNS` + `create_all`, no Alembic, no new dep) → Task 3; tests → Tasks 1–7; cross-tenant → Task 7; residual documented → Task 11. ✅

**Placeholder scan:** No "TBD"/"add error handling"/"similar to Task N". Two explicit *verify-before-writing* notes carry concrete invariants (Task 4: confirm `log_activity` signature; Task 6: confirm token-extraction helper names) — these are anti-hallucination checks against real files, not placeholders. Frontend steps describe component behavior + exact endpoints/classes rather than full JSX by deliberate choice (the repo has no frontend test harness; JSX is verified by the Task 11 smoke test), but each names the file, the data source, the states, and the styling convention.

**Type consistency:** `generate_secret`/`totp_now`/`verify_totp`/`provisioning_uri` (Task 1) used identically in Tasks 4–5. `encrypt_secret`/`decrypt_secret`/`generate_recovery_codes`/`hash_recovery_code` (Task 2) used identically in Tasks 4–5. `MfaRecoveryCode(user_id, code_hash, used_at)` consistent across Tasks 3–5, 7. Challenge fields `mfa_required`/`mfa_token`/`mfa_setup_required`/`setup_token` consistent across Tasks 5, 6, 8, 9. `audience="mfa"` (5-min) vs `audience="mfa_setup"` (15-min) used consistently. Frontend `twoFactor.*` / `companySecurity.*` / `verify2FA` names consistent across Tasks 8–10.

**Carried risks:** (1) `log_activity` exact signature — Task 4 says verify against `app/utils/audit.py` before wiring. (2) The forced-enrollment `get_enrolling_user` dependency must not invent a non-existent token helper — Task 6 says decode the `X-Setup-Token` directly and fall back to `get_current_user`, verified against `dependencies.py`. (3) No frontend unit tests — mitigated by the Task 11 manual smoke covering all four flows.
