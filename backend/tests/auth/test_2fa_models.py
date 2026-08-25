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
