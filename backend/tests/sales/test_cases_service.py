import pytest
from fastapi import HTTPException

from app.models.sales.client import Client
from app.services.sales.cases import create_case, ingest_web_case, patch_case
from tests.helpers.factories import create_client, create_company


def test_create_case_links_client(db):
    company = create_company(db, name="Co", company_code="CS1")
    client = create_client(db, company_id=company.id, name="Acme", email="a@x.com")
    row = create_case(
        db, company.id,
        subject="Leak", body="Roof", client_id=client.id,
        requester_name="A", requester_email="a@x.com", source="crm",
    )
    assert row.client_id == client.id
    assert row.status == "open"
    assert row.source == "crm"


def test_foreign_client_rejected(db):
    a = create_company(db, name="A", company_code="CS2A")
    b = create_company(db, name="B", company_code="CS2B")
    other = create_client(db, company_id=b.id, name="X", email="x@x.com")
    with pytest.raises(HTTPException) as ei:
        create_case(
            db, a.id, subject="Hi", body="There", client_id=other.id,
            requester_name=None, requester_email=None, source="crm",
        )
    assert ei.value.status_code == 400


def test_web_ingest_matches_client_email(db):
    company = create_company(db, name="Co", company_code="CS3")
    create_client(db, company_id=company.id, name="Acme", email="Pat@X.com")
    row = ingest_web_case(
        db, company.id,
        name="Pat", email="pat@x.com", subject="Help", body="Please",
    )
    assert row.client_id is not None
    assert row.source == "web"
    assert row.requester_email == "pat@x.com"


def test_web_ingest_unmatched_email(db):
    company = create_company(db, name="Co", company_code="CS4")
    row = ingest_web_case(
        db, company.id,
        name="Pat", email="nobody@x.com", subject="Help", body="Please",
    )
    assert row.client_id is None


def test_invalid_status_rejected(db):
    company = create_company(db, name="Co", company_code="CS5")
    row = create_case(
        db, company.id, subject="Hi", body="There",
        client_id=None, requester_name=None, requester_email="a@x.com",
        source="crm",
    )
    with pytest.raises(HTTPException) as ei:
        patch_case(db, row, status="solved")
    assert ei.value.status_code == 400
