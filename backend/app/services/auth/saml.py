"""SAML 2.0 SP-initiated login helpers (stdlib + cryptography)."""
from __future__ import annotations

import base64
import secrets
import uuid
import zlib
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Optional
from urllib.parse import urlencode
from xml.etree import ElementTree as ET

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.x509 import load_pem_x509_certificate
from sqlalchemy import func as sa_func
from sqlalchemy.orm import Session

from app.config import settings
from app.models.core.company import Company
from app.models.core.oauth_identity import OAuthIdentity
from app.models.core.saml_config import SamlConfig
from app.models.core.user import User
from app.utils.security import create_access_token, decode_access_token

NS_SAMLP = "urn:oasis:names:tc:SAML:2.0:protocol"
NS_SAML = "urn:oasis:names:tc:SAML:2.0:assertion"
NS_DS = "http://www.w3.org/2000/09/xmldsig#"
SAML_PROVIDER = "saml"


class SAMLError(Exception):
    def __init__(self, code: str):
        self.code = code
        super().__init__(code)


def sp_entity_id(company_code: str) -> str:
    base = (settings.PUBLIC_API_URL or "").rstrip("/")
    return f"{base}/api/auth/saml/{company_code}"


def acs_url(company_code: str) -> str:
    return f"{sp_entity_id(company_code)}/acs"


def load_enabled_config(db: Session, company_code: str) -> tuple[Company, SamlConfig]:
    code = (company_code or "").strip().upper()
    company = db.query(Company).filter(sa_func.upper(Company.company_code) == code).first()
    if company is None:
        raise SAMLError("missing")
    row = (
        db.query(SamlConfig)
        .filter(SamlConfig.company_id == company.id, SamlConfig.enabled.is_(True))
        .first()
    )
    if row is None or not (row.idp_sso_url and row.idp_certificate_pem):
        raise SAMLError("missing")
    return company, row


def _deflate_b64(raw: bytes) -> str:
    compressor = zlib.compressobj(wbits=-15)
    return base64.b64encode(compressor.compress(raw) + compressor.flush()).decode("ascii")


def _inflate_b64(token: str) -> bytes:
    data = base64.b64decode(token)
    return zlib.decompress(data, -15)


def decode_saml_request(token: str) -> str:
    return _inflate_b64(token).decode("utf-8")


def claims_payload(name_id: str, email: str) -> bytes:
    return f"{(name_id or '').strip()}\n{(email or '').strip().lower()}".encode("utf-8")


def sign_claims(private_key, name_id: str, email: str) -> str:
    sig = private_key.sign(claims_payload(name_id, email), padding.PKCS1v15(), hashes.SHA256())
    return base64.b64encode(sig).decode("ascii")


def verify_claims(cert_pem: str, name_id: str, email: str, signature_b64: str) -> None:
    try:
        cert = load_pem_x509_certificate(cert_pem.encode("utf-8"))
        sig = base64.b64decode(signature_b64 or "")
        cert.public_key().verify(sig, claims_payload(name_id, email), padding.PKCS1v15(), hashes.SHA256())
    except (ValueError, InvalidSignature, TypeError) as exc:
        raise SAMLError("denied") from exc


def make_relay_state(company_code: str, request_id: str) -> str:
    return create_access_token(
        data={"company_code": company_code.upper(), "req_id": request_id, "nonce": secrets.token_urlsafe(12)},
        expires_delta=timedelta(minutes=10),
        audience="saml_state",
    )


def parse_relay_state(token: str, company_code: str) -> str:
    payload = decode_access_token(token, audience="saml_state")
    if payload is None:
        raise SAMLError("denied")
    if (payload.get("company_code") or "").upper() != (company_code or "").upper():
        raise SAMLError("denied")
    req_id = payload.get("req_id")
    if not req_id:
        raise SAMLError("denied")
    return req_id


def build_authn_request_xml(company_code: str, destination: str, request_id: str) -> str:
    instant = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    ET.register_namespace("samlp", NS_SAMLP)
    ET.register_namespace("saml", NS_SAML)
    root = ET.Element(
        f"{{{NS_SAMLP}}}AuthnRequest",
        {
            "ID": request_id,
            "Version": "2.0",
            "IssueInstant": instant,
            "Destination": destination,
            "AssertionConsumerServiceURL": acs_url(company_code),
            "ProtocolBinding": "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST",
        },
    )
    issuer = ET.SubElement(root, f"{{{NS_SAML}}}Issuer")
    issuer.text = sp_entity_id(company_code)
    return ET.tostring(root, encoding="unicode")


def authorization_url(company_code: str, sso_url: str) -> str:
    request_id = "_" + uuid.uuid4().hex
    xml = build_authn_request_xml(company_code, sso_url, request_id)
    params = {
        "SAMLRequest": _deflate_b64(xml.encode("utf-8")),
        "RelayState": make_relay_state(company_code, request_id),
    }
    join = "&" if "?" in sso_url else "?"
    return f"{sso_url}{join}{urlencode(params)}"


def encode_saml_response(
    *,
    name_id: str,
    email: str,
    in_response_to: str,
    signature_b64: str,
    destination: str,
    issuer: str,
) -> str:
    instant = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    ET.register_namespace("samlp", NS_SAMLP)
    ET.register_namespace("saml", NS_SAML)
    ET.register_namespace("ds", NS_DS)
    root = ET.Element(
        f"{{{NS_SAMLP}}}Response",
        {
            "ID": "_" + uuid.uuid4().hex,
            "Version": "2.0",
            "IssueInstant": instant,
            "Destination": destination,
            "InResponseTo": in_response_to,
        },
    )
    iss = ET.SubElement(root, f"{{{NS_SAML}}}Issuer")
    iss.text = issuer
    status = ET.SubElement(root, f"{{{NS_SAMLP}}}Status")
    ET.SubElement(status, f"{{{NS_SAMLP}}}StatusCode", {"Value": "urn:oasis:names:tc:SAML:2.0:status:Success"})
    assertion = ET.SubElement(
        root,
        f"{{{NS_SAML}}}Assertion",
        {"ID": "_" + uuid.uuid4().hex, "Version": "2.0", "IssueInstant": instant},
    )
    a_iss = ET.SubElement(assertion, f"{{{NS_SAML}}}Issuer")
    a_iss.text = issuer
    sig = ET.SubElement(assertion, f"{{{NS_DS}}}Signature")
    val = ET.SubElement(sig, f"{{{NS_DS}}}SignatureValue")
    val.text = signature_b64
    subject = ET.SubElement(assertion, f"{{{NS_SAML}}}Subject")
    nid = ET.SubElement(
        subject,
        f"{{{NS_SAML}}}NameID",
        {"Format": "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress"},
    )
    nid.text = name_id
    stmt = ET.SubElement(assertion, f"{{{NS_SAML}}}AttributeStatement")
    attr = ET.SubElement(stmt, f"{{{NS_SAML}}}Attribute", {"Name": "email"})
    aval = ET.SubElement(attr, f"{{{NS_SAML}}}AttributeValue")
    aval.text = email
    xml = ET.tostring(root, encoding="utf-8")
    return base64.b64encode(xml).decode("ascii")


def _local(tag: str) -> str:
    return tag.split("}", 1)[-1]


def _text(el: Optional[ET.Element]) -> str:
    if el is None or el.text is None:
        return ""
    return el.text.strip()


@dataclass(frozen=True)
class SAMLAssertion:
    name_id: str
    email: str
    in_response_to: str
    signature_b64: str
    issuer: str


def parse_saml_response(b64: str) -> SAMLAssertion:
    try:
        xml = base64.b64decode(b64)
        root = ET.fromstring(xml)
    except Exception as exc:
        raise SAMLError("denied") from exc
    in_response_to = root.attrib.get("InResponseTo") or ""
    issuer = ""
    name_id = ""
    email = ""
    signature_b64 = ""
    for el in root.iter():
        name = _local(el.tag)
        if name == "Issuer" and not issuer:
            issuer = _text(el)
        elif name == "NameID":
            name_id = _text(el)
        elif name == "SignatureValue":
            signature_b64 = _text(el)
        elif name == "Attribute" and (el.attrib.get("Name") or "").lower() in (
            "email",
            "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
        ):
            val = el.find(f".//{{{NS_SAML}}}AttributeValue")
            if val is None:
                for child in el:
                    if _local(child.tag) == "AttributeValue":
                        val = child
                        break
            email = _text(val)
    if not email and "@" in name_id:
        email = name_id
    email = email.strip().lower()
    if not email or not signature_b64:
        raise SAMLError("denied")
    return SAMLAssertion(
        name_id=name_id or email,
        email=email,
        in_response_to=in_response_to,
        signature_b64=signature_b64,
        issuer=issuer,
    )


def resolve_saml_user(db: Session, company_id: int, assertion: SAMLAssertion) -> User:
    subject = f"{company_id}:{assertion.name_id}"
    identity = (
        db.query(OAuthIdentity)
        .filter(OAuthIdentity.provider == SAML_PROVIDER, OAuthIdentity.subject == subject)
        .first()
    )
    if identity is not None:
        user = db.query(User).filter(User.id == identity.user_id).first()
        if user is None or user.company_id != company_id:
            raise SAMLError("no_account")
        if identity.email != assertion.email:
            identity.email = assertion.email
            db.commit()
        return user

    user = (
        db.query(User)
        .filter(sa_func.lower(User.email) == assertion.email, User.company_id == company_id)
        .first()
    )
    if user is None:
        raise SAMLError("no_account")
    db.add(OAuthIdentity(
        user_id=user.id,
        provider=SAML_PROVIDER,
        subject=subject,
        email=assertion.email,
    ))
    db.commit()
    return user
