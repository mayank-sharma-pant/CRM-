from app.models.core.company_settings import CompanySettings
from app.utils.rate_limit import auth_limiter
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_client, create_company


def _setup(client, db, code="PDF1", buyer_gstin="29AAAAA0000A1Z5"):
    company = create_company(db, name=f"Co {code}", company_code=code)
    admin = create_active_user(
        db, email=f"admin@{code.lower()}.com", role="admin", company_id=company.id
    )
    db.add(CompanySettings(
        company_id=company.id, company_name="Perioxia Demo", gst_number="27AABCU9603R1ZM", tax_rate=18.0,
    ))
    customer = create_client(db, company_id=company.id, name="Buyer Co", email=f"b@{code.lower()}.com")
    customer.gstin = buyer_gstin
    db.commit()
    login_user(client, admin.email)
    created = client.post("/api/invoices", json={
        "client_id": customer.id,
        "items": [{"description": "Site visit", "quantity": 1, "unit_price": 1000, "hsn": "9983"}],
    })
    assert created.status_code == 201, created.text
    return company, created.json()


def test_pdf_is_pdf_and_lists_gstin_hsn(client, db):
    _, inv = _setup(client, db, "PDA")
    resp = client.get(f"/api/invoices/{inv['id']}/pdf")
    assert resp.status_code == 200, resp.text
    assert resp.headers["content-type"].startswith("application/pdf")
    body = resp.content
    assert body.startswith(b"%PDF")
    assert inv["invoice_number"].encode() in body
    assert b"27AABCU9603R1ZM" in body
    assert b"9983" in body


def test_einvoice_requires_gstin_then_sets_irn(client, db):
    company = create_company(db, name="NoGst", company_code="PDB")
    admin = create_active_user(db, email="admin@pdb.com", role="admin", company_id=company.id)
    customer = create_client(db, company_id=company.id, name="Cash")
    db.commit()
    login_user(client, admin.email)
    created = client.post("/api/invoices", json={
        "client_id": customer.id,
        "items": [{"description": "Job", "quantity": 1, "unit_price": 100}],
    })
    assert created.status_code == 201, created.text
    denied = client.post(f"/api/invoices/{created.json()['id']}/einvoice")
    assert denied.status_code == 400

    _, inv = _setup(client, db, "PDC")
    first = client.post(f"/api/invoices/{inv['id']}/einvoice")
    assert first.status_code == 200, first.text
    irn = first.json()["irn"]
    assert len(irn) == 64
    again = client.post(f"/api/invoices/{inv['id']}/einvoice")
    assert again.json()["irn"] == irn
    detail = client.get(f"/api/invoices/{inv['id']}").json()
    assert detail["irn"] == irn
    pdf = client.get(f"/api/invoices/{inv['id']}/pdf").content
    assert irn.encode() in pdf


def test_foreign_invoice_pdf_is_404(client, db):
    _, inv = _setup(client, db, "PDD")
    other = create_company(db, name="Else", company_code="PDE")
    spy = create_active_user(db, email="spy@pde.com", role="admin", company_id=other.id)
    login_user(client, spy.email)
    assert client.get(f"/api/invoices/{inv['id']}/pdf").status_code == 404
    assert client.post(f"/api/invoices/{inv['id']}/einvoice").status_code == 404
