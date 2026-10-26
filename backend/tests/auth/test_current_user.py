"""get_current_user: its database work must not block the event loop, every account check must
keep its status code, and the tenant it binds must reach sync and async endpoints."""
import asyncio
import os
import secrets
import time

import httpx
import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Query, Session, sessionmaker
from starlette.concurrency import run_in_threadpool

from app.database import get_db
from app.main import app, rls_request_context
from app.models.core.company import Company
from app.models.core.user import User
from app.tenancy import current_bypass, current_company_id
from app.utils.dependencies import get_current_user
from app.utils.security import create_access_token, crm_access_token
from tests.chat.safety import disposable_pg_url
from tests.helpers.auth import create_active_user
from tests.helpers.factories import create_company


def _bearer(user: User) -> dict:
    return {"Authorization": f"Bearer {crm_access_token(user)}"}


@pytest.fixture
def member(db):
    company = create_company(db, name="Auth Co", company_code="AUC")
    user = create_active_user(db, email="member@auth.test", role="sales", company_id=company.id)
    return company, user


# ---- the event loop stays free while the account is loaded --------------------------------


def test_auth_database_work_does_not_block_the_event_loop(client, member, monkeypatch):
    """Every query is made slow (as with a remote database). The request must still leave the
    event loop free for other work, e.g. the chat sockets' Redis calls."""
    _, user = member
    headers = _bearer(user)
    real_first = Query.first

    def slow_first(self):
        time.sleep(0.3)
        return real_first(self)

    monkeypatch.setattr(Query, "first", slow_first)

    async def scenario():
        gaps = []
        done = asyncio.Event()

        async def ticker():
            last = time.perf_counter()
            while not done.is_set():
                await asyncio.sleep(0.01)
                now = time.perf_counter()
                gaps.append(now - last)
                last = now

        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as ac:
            tick = asyncio.create_task(ticker())
            resp = await ac.get("/api/auth/me", headers=headers)
            done.set()
            await tick
        return resp, max(gaps)

    resp, worst_gap = asyncio.run(scenario())
    assert resp.status_code == 200, resp.text
    assert worst_gap < 0.2, f"event loop was blocked for {worst_gap:.2f} s"


# ---- every account check keeps its result -------------------------------------------------


def test_active_member_is_let_in(client, member):
    _, user = member
    assert client.get("/api/auth/me", headers=_bearer(user)).status_code == 200


def test_missing_and_garbage_tokens_are_401(client):
    assert client.get("/api/auth/me").status_code == 401
    assert client.get("/api/auth/me", headers={"Authorization": "Bearer not-a-token"}).status_code == 401


def test_token_for_unknown_account_is_401(client):
    token = create_access_token(data={"sub": "nobody@auth.test", "role": "sales", "ver": 0})
    resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 401
    assert resp.json()["detail"] == "Could not validate credentials"


def test_token_from_before_a_version_bump_is_401(client, db, member):
    _, user = member
    headers = _bearer(user)
    user.token_version = (user.token_version or 0) + 1
    db.commit()
    assert client.get("/api/auth/me", headers=headers).status_code == 401


@pytest.mark.parametrize("change", ["inactive", "disabled"])
def test_deactivated_user_is_403(client, db, member, change):
    _, user = member
    headers = _bearer(user)
    if change == "inactive":
        user.is_active = False
    else:
        user.status = "disabled"
    db.commit()
    resp = client.get("/api/auth/me", headers=headers)
    assert resp.status_code == 403
    assert resp.json()["detail"] == "User account is disabled"


def test_suspended_company_is_403(client, db, member):
    company, user = member
    headers = _bearer(user)
    company.status = "suspended"
    db.commit()
    resp = client.get("/api/auth/me", headers=headers)
    assert resp.status_code == 403
    assert resp.json()["detail"].startswith("Company account is")


# ---- the tenant bound by get_current_user reaches the endpoint ----------------------------


def _tenant_app(session_dependency) -> FastAPI:
    """A small app with the real request middleware and dependency, reporting the bound tenant."""
    mini = FastAPI()
    mini.middleware("http")(rls_request_context)

    def seen():
        return {"company_id": current_company_id(), "bypass": current_bypass()}

    @mini.get("/tenant/sync")
    def tenant_sync(_: User = Depends(get_current_user)):
        return seen()

    @mini.get("/tenant/async")
    async def tenant_async(_: User = Depends(get_current_user)):
        return seen()

    @mini.get("/tenant/async-threadpool")
    async def tenant_async_threadpool(_: User = Depends(get_current_user)):
        return await run_in_threadpool(seen)

    @mini.get("/tenant/db-setting")
    def tenant_db_setting(_: User = Depends(get_current_user), db: Session = Depends(get_db)):
        query = text("SELECT current_setting('app.company_id', true)")
        before = db.execute(query).scalar()
        db.commit()  # the next statement starts a new transaction: the after_begin hook re-applies the tenant
        after = db.execute(query).scalar()
        return {"before_commit": before, "after_commit": after}

    mini.dependency_overrides[get_db] = session_dependency
    return mini


def _override(db):
    def dependency():
        yield db
    return dependency


@pytest.mark.parametrize("path", ["/tenant/sync", "/tenant/async", "/tenant/async-threadpool"])
def test_company_user_tenant_reaches_sync_and_async_endpoints(db, member, path):
    company, user = member
    with TestClient(_tenant_app(_override(db))) as c:
        assert c.get(path, headers=_bearer(user)).json() == {"company_id": company.id, "bypass": False}


@pytest.mark.parametrize("path", ["/tenant/sync", "/tenant/async", "/tenant/async-threadpool"])
def test_platform_admin_gets_the_bypass(db, path):
    admin = create_active_user(db, email="platform@auth.test", role="admin", company_id=None)
    with TestClient(_tenant_app(_override(db))) as c:
        assert c.get(path, headers=_bearer(admin)).json() == {"company_id": None, "bypass": True}


def test_tenant_does_not_leak_between_requests(db, member):
    company, user = member
    admin = create_active_user(db, email="platform2@auth.test", role="admin", company_id=None)
    with TestClient(_tenant_app(_override(db))) as c:
        assert c.get("/tenant/async", headers=_bearer(user)).json()["company_id"] == company.id
        assert c.get("/tenant/async", headers=_bearer(admin)).json() == {"company_id": None, "bypass": True}
        assert c.get("/tenant/async").status_code == 401
        assert c.get("/tenant/sync", headers=_bearer(user)).json() == {"company_id": company.id, "bypass": False}


# ---- on PostgreSQL the session setting follows the tenant, also after a commit ------------

PG_URL = os.environ.get("CHAT_PG_TEST_URL", "")


@pytest.mark.skipif(not disposable_pg_url(PG_URL), reason="CHAT_PG_TEST_URL not set to a local PostgreSQL *_test database")
def test_postgres_session_carries_the_tenant_before_and_after_commit():
    url = PG_URL.replace("postgresql://", "postgresql+psycopg://", 1) if PG_URL.startswith("postgresql://") else PG_URL
    engine = create_engine(url)
    PgSession = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    tag = secrets.token_hex(3)
    with PgSession() as setup:
        company = Company(name=f"Auth PG {tag}", company_code=tag[:3].upper(), status="active")
        setup.add(company)
        setup.flush()
        user = User(email=f"pg-{tag}@auth.test", full_name="PG Auth", hashed_password="x", role="sales",
                    company_id=company.id, status="active", is_active=True)
        setup.add(user)
        setup.commit()
        company_id, user_id, headers = company.id, user.id, _bearer(user)

    def pg_session():
        session = PgSession()
        try:
            yield session
        finally:
            session.close()

    try:
        with TestClient(_tenant_app(pg_session)) as c:
            assert c.get("/tenant/db-setting", headers=headers).json() == {
                "before_commit": str(company_id),
                "after_commit": str(company_id),
            }
            assert c.get("/tenant/async", headers=headers).json() == {"company_id": company_id, "bypass": False}
    finally:
        with PgSession() as cleanup:
            cleanup.execute(text("DELETE FROM users WHERE id = :u"), {"u": user_id})
            cleanup.execute(text("DELETE FROM companies WHERE id = :c"), {"c": company_id})
            cleanup.commit()
        engine.dispose()
