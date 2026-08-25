"""OAuth resolve_user + provider flags."""

import pytest

from app.models.core.oauth_identity import OAuthIdentity
from app.services.auth.oauth import OAuthError, OAuthProfile, providers_status, resolve_user
from tests.helpers.auth import create_active_user
from tests.helpers.factories import create_company


def test_providers_off_by_default():
    status = providers_status()
    assert status["google"] is False
    assert status["microsoft"] is False


def test_resolve_by_email_creates_identity(db):
    company = create_company(db, name="R Co", company_code="RC1")
    user = create_active_user(db, email="a@rc1.com", role="admin", company_id=company.id)
    profile = OAuthProfile(provider="google", subject="g-1", email="a@rc1.com")
    resolved = resolve_user(db, profile)
    assert resolved.id == user.id
    row = db.query(OAuthIdentity).filter(OAuthIdentity.subject == "g-1").one()
    assert row.user_id == user.id


def test_resolve_by_identity(db):
    company = create_company(db, name="R Co", company_code="RC2")
    user = create_active_user(db, email="b@rc2.com", role="admin", company_id=company.id)
    db.add(OAuthIdentity(user_id=user.id, provider="microsoft", subject="m-1", email="b@rc2.com"))
    db.commit()
    profile = OAuthProfile(provider="microsoft", subject="m-1", email="other@rc2.com")
    resolved = resolve_user(db, profile)
    assert resolved.id == user.id


def test_resolve_no_account(db):
    profile = OAuthProfile(provider="google", subject="g-x", email="nobody@example.com")
    with pytest.raises(OAuthError) as exc:
        resolve_user(db, profile)
    assert exc.value.code == "no_account"
