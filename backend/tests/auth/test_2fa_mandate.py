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


def test_admin_gets_current_mandate(client, db):
    auth_limiter._buckets.clear()
    company = create_company(db, name="Get", company_code="GET")
    create_active_user(db, email="getadm@x.co", role="admin", company_id=company.id)
    login_user(client, "getadm@x.co")
    company.require_2fa = True
    db.commit()
    r = client.get("/api/company/security")
    assert r.status_code == 200, r.text
    assert r.json()["require_2fa"] is True


def test_non_admin_cannot_get_mandate(client, db):
    auth_limiter._buckets.clear()
    company = create_company(db, name="GetSal", company_code="GSL")
    create_active_user(db, email="getsales@x.co", role="sales", company_id=company.id)
    login_user(client, "getsales@x.co")
    r = client.get("/api/company/security")
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
