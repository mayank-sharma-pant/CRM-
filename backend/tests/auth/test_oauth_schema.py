"""OAuth identity schema."""

from sqlalchemy import inspect
from sqlalchemy.exc import IntegrityError
import pytest

from app.models.core.oauth_identity import OAuthIdentity
from tests.helpers.auth import create_active_user
from tests.helpers.factories import create_company


def test_oauth_identities_table_exists(db_engine):
    assert "oauth_identities" in inspect(db_engine).get_table_names()
    cols = {c["name"] for c in inspect(db_engine).get_columns("oauth_identities")}
    assert {"user_id", "provider", "subject", "email"} <= cols


def test_unique_provider_subject(db):
    company = create_company(db, name="O Co", company_code="OC1")
    user = create_active_user(db, email="u@oc1.com", role="sales", company_id=company.id)
    db.add(OAuthIdentity(user_id=user.id, provider="google", subject="sub-1", email="u@oc1.com"))
    db.commit()
    db.add(OAuthIdentity(user_id=user.id, provider="google", subject="sub-1", email="u@oc1.com"))
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()
