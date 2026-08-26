"""Phase 7.11 — import undo + clients/deals CSV."""
import json

import pytest

from app.models.finance.invoice import Invoice
from app.models.sales.client import Client
from app.models.sales.deal import Deal
from app.models.sales.lead import Lead
from app.utils.rate_limit import auth_limiter
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_client, create_company


@pytest.fixture(autouse=True)
def _reset_auth():
    auth_limiter._buckets.clear()
    yield


def _setup(db, code="IU1"):
    company = create_company(db, name=f"Co {code}", company_code=code)
    admin = create_active_user(db, email=f"admin@{code.lower()}.com", role="admin", company_id=company.id)
    return company, admin


def test_client_import_preview_and_commit(client, db):
    company, admin = _setup(db, "IU2")
    login_user(client, admin.email)
    csv_body = b"Full Name,E-mail,Mobile\nAcme Buyer,buyer@x.com,999\n"
    preview = client.post(
        "/api/import/clients/preview",
        files={"file": ("clients.csv", csv_body, "text/csv")},
    )
    assert preview.status_code == 200, preview.text
    assert preview.json()["counts"]["new"] == 1

    committed = client.post(
        "/api/import/clients/commit",
        files={"file": ("clients.csv", csv_body, "text/csv")},
        data={"mapping": json.dumps({"name": "Full Name", "email": "E-mail", "phone": "Mobile"})},
    )
    assert committed.status_code == 200, committed.text
    assert committed.json()["created"] == 1
    row = db.query(Client).filter(Client.company_id == company.id, Client.email == "buyer@x.com").one()
    assert row.name == "Acme Buyer"


def test_deal_import_requires_client_link(client, db):
    company, admin = _setup(db, "IU3")
    buyer = create_client(db, company_id=company.id, name="Buyer", email="buyer@x.com")
    login_user(client, admin.email)
    csv_body = b"Deal Title,Amount,Client Email\nRoof job,50000,buyer@x.com\n"
    preview = client.post(
        "/api/import/deals/preview",
        files={"file": ("deals.csv", csv_body, "text/csv")},
    )
    assert preview.status_code == 200, preview.text
    assert preview.json()["counts"]["new"] == 1

    committed = client.post(
        "/api/import/deals/commit",
        files={"file": ("deals.csv", csv_body, "text/csv")},
        data={"mapping": json.dumps({
            "title": "Deal Title",
            "amount": "Amount",
            "client_email": "Client Email",
        })},
    )
    assert committed.status_code == 200, committed.text
    deal = db.query(Deal).filter(Deal.company_id == company.id, Deal.client_id == buyer.id).one()
    assert deal.title == "Roof job"
    assert str(deal.amount) == "50000.00"


def test_undo_last_lead_import_soft_deletes(client, db):
    company, admin = _setup(db, "IU4")
    login_user(client, admin.email)
    csv_body = b"Full Name,E-mail\nUndo Me,undo@x.com\n"
    client.post(
        "/api/import/leads/commit",
        files={"file": ("leads.csv", csv_body, "text/csv")},
        data={"mapping": json.dumps({"name": "Full Name", "email": "E-mail"})},
    )
    lead = db.query(Lead).filter(Lead.company_id == company.id, Lead.email == "undo@x.com").one()
    assert lead.deleted_at is None

    undo = client.post("/api/import/undo")
    assert undo.status_code == 200, undo.text
    assert undo.json()["removed"] >= 1
    db.refresh(lead)
    assert lead.deleted_at is not None


def test_undo_client_skips_when_invoiced(client, db):
    company, admin = _setup(db, "IU5")
    login_user(client, admin.email)
    csv_body = b"Full Name,E-mail\nInvoiced Co,inv@x.com\n"
    client.post(
        "/api/import/clients/commit",
        files={"file": ("clients.csv", csv_body, "text/csv")},
        data={"mapping": json.dumps({"name": "Full Name", "email": "E-mail"})},
    )
    row = db.query(Client).filter(Client.company_id == company.id, Client.email == "inv@x.com").one()
    db.add(Invoice(
        company_id=company.id,
        invoice_number="INV-TEST-1",
        client_id=row.id,
        subtotal=100,
        tax=0,
        total=100,
        created_by_id=admin.id,
    ))
    db.commit()

    undo = client.post("/api/import/undo")
    assert undo.status_code == 200, undo.text
    assert undo.json()["skipped"] >= 1
    assert db.query(Client).filter(Client.id == row.id).count() == 1
