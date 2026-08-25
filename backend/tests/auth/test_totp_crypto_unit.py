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
