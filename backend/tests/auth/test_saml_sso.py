import base64
from datetime import datetime, timedelta, timezone
from urllib.parse import parse_qs, urlparse
from xml.etree import ElementTree as ET

import pytest
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import NameOID

from app.config import settings
from app.models.core.saml_config import SamlConfig
from app.services.auth.saml import (
    decode_saml_request,
    encode_saml_response,
    sign_claims,
)
from app.utils.rate_limit import auth_limiter
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_company


@pytest.fixture(autouse=True)
def _reset():
    auth_limiter._buckets.clear()
    yield
    auth_limiter._buckets.clear()


def _idp_pair():
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "test-idp")])
    now = datetime.now(timezone.utc)
    cert = (
        x509.CertificateBuilder()
        .subject_name(name)
        .issuer_name(name)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - timedelta(days=1))
        .not_valid_after(now + timedelta(days=365))
        .sign(key, hashes.SHA256())
    )
    pem = cert.public_bytes(serialization.Encoding.PEM).decode()
    return key, pem


def _enable_saml(db, company, pem, *, enabled=True):
    row = SamlConfig(
        company_id=company.id,
        idp_entity_id="https://idp.example/entity",
        idp_sso_url="https://idp.example/sso",
        idp_certificate_pem=pem,
        enabled=enabled,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def test_start_unknown_company_is_404(client):
    assert client.get("/api/auth/saml/ZZZ/start", follow_redirects=False).status_code == 404


def test_start_redirects_with_samlrequest(client, db):
    key, pem = _idp_pair()
    company = create_company(db, name="Saml Co", company_code="SM1")
    _enable_saml(db, company, pem)
    res = client.get("/api/auth/saml/SM1/start", follow_redirects=False)
    assert res.status_code == 302, res.text
    loc = urlparse(res.headers["location"])
    assert loc.scheme == "https"
    assert loc.netloc == "idp.example"
    q = parse_qs(loc.query)
    assert "SAMLRequest" in q
    assert "RelayState" in q
    xml = decode_saml_request(q["SAMLRequest"][0])
    assert "AuthnRequest" in xml
    assert "SM1" in xml


def test_acs_sets_session_for_company_user(client, db):
    settings.FRONTEND_URL = "http://frontend.test"
    key, pem = _idp_pair()
    company = create_company(db, name="Saml Co", company_code="SM2")
    _enable_saml(db, company, pem)
    user = create_active_user(db, email="saml@sm2.com", role="admin", company_id=company.id)
    start = client.get("/api/auth/saml/SM2/start", follow_redirects=False)
    q = parse_qs(urlparse(start.headers["location"]).query)
    req_xml = decode_saml_request(q["SAMLRequest"][0])
    req_id = ET.fromstring(req_xml).attrib["ID"]
    sig = sign_claims(key, "saml@sm2.com", "saml@sm2.com")
    b64 = encode_saml_response(
        name_id="saml@sm2.com",
        email="saml@sm2.com",
        in_response_to=req_id,
        signature_b64=sig,
        destination="http://testserver/api/auth/saml/SM2/acs",
        issuer="https://idp.example/entity",
    )
    res = client.post(
        "/api/auth/saml/SM2/acs",
        data={"SAMLResponse": b64, "RelayState": q["RelayState"][0]},
        follow_redirects=False,
    )
    assert res.status_code == 302, res.text
    assert res.headers["location"] == "http://frontend.test/login?oauth=success"
    assert "access_token" in res.headers.get("set-cookie", "")
    client.cookies.set("access_token", res.cookies["access_token"])
    me = client.get("/api/auth/me")
    assert me.status_code == 200
    assert me.json()["email"] == user.email


def test_acs_wrong_company_email_is_error(client, db):
    settings.FRONTEND_URL = "http://frontend.test"
    key, pem = _idp_pair()
    a = create_company(db, name="A", company_code="SM3")
    b = create_company(db, name="B", company_code="SM4")
    _enable_saml(db, a, pem)
    create_active_user(db, email="other@sm4.com", role="admin", company_id=b.id)
    start = client.get("/api/auth/saml/SM3/start", follow_redirects=False)
    q = parse_qs(urlparse(start.headers["location"]).query)
    req_id = ET.fromstring(decode_saml_request(q["SAMLRequest"][0])).attrib["ID"]
    sig = sign_claims(key, "other@sm4.com", "other@sm4.com")
    b64 = encode_saml_response(
        name_id="other@sm4.com",
        email="other@sm4.com",
        in_response_to=req_id,
        signature_b64=sig,
        destination="http://testserver/api/auth/saml/SM3/acs",
        issuer="https://idp.example/entity",
    )
    res = client.post(
        "/api/auth/saml/SM3/acs",
        data={"SAMLResponse": b64, "RelayState": q["RelayState"][0]},
        follow_redirects=False,
    )
    assert res.status_code == 302
    assert "oauth_error=" in res.headers["location"]


def test_saml_config_is_company_scoped(client, db):
    key, pem = _idp_pair()
    a = create_company(db, name="A", company_code="SM5")
    b = create_company(db, name="B", company_code="SM6")
    admin_a = create_active_user(db, email="a@sm5.com", role="admin", company_id=a.id)
    admin_b = create_active_user(db, email="b@sm6.com", role="admin", company_id=b.id)
    login_user(client, admin_a.email)
    put = client.put("/api/saml/config", json={
        "idp_entity_id": "https://idp.a/entity",
        "idp_sso_url": "https://idp.a/sso",
        "idp_certificate_pem": pem,
        "enabled": True,
    })
    assert put.status_code == 200, put.text
    got = client.get("/api/saml/config")
    assert got.status_code == 200
    body = got.json()
    assert body["idp_entity_id"] == "https://idp.a/entity"
    assert body["certificate_set"] is True
    assert "/api/auth/saml/SM5/acs" in body["acs_url"]
    login_user(client, admin_b.email)
    other = client.get("/api/saml/config")
    assert other.status_code == 200
    assert other.json()["idp_entity_id"] is None
    sales = create_active_user(db, email="s@sm5.com", role="sales", company_id=a.id)
    login_user(client, sales.email)
    assert client.get("/api/saml/config").status_code == 403
