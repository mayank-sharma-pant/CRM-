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
