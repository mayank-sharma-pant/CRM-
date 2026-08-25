from app.models.core.company_settings import CompanySettings
from app.models.sales.client import Client
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_client, create_company


def test_invoice_create_and_get_include_gst_breakup(client, db):
    company = create_company(db, name="GST Co", company_code="GST")
    admin = create_active_user(db, email="admin@gst.com", role="admin", company_id=company.id)
    db.add(CompanySettings(
        company_id=company.id, company_name="GST Co", gst_number="27AABCU9603R1ZM", tax_rate=18.0,
    ))
    customer = create_client(db, company_id=company.id, name="Buyer", email="b@b.com")
    customer.gstin = "29AAAAA0000A1Z5"
    db.commit()
    login_user(client, admin.email)
    created = client.post("/api/invoices", json={
        "client_id": customer.id,
        "items": [{"description": "Job", "quantity": 1, "unit_price": 200, "hsn": "9983"}],
    })
    assert created.status_code == 201, created.text
    body = created.json()
    assert body["tax"] == 36.0
    assert body["igst"] == 36.0
    assert body["cgst"] == 0
    assert body["tax_mode"] == "inter"
    got = client.get(f"/api/invoices/{body['id']}")
    assert got.status_code == 200, got.text
    detail = got.json()
    assert detail["seller_gstin"] == "27AABCU9603R1ZM"
    assert detail["buyer_gstin"] == "29AAAAA0000A1Z5"
    assert detail["place_of_supply"] == "29"
    assert detail["items"][0]["hsn"] == "9983"


def test_client_rejects_invalid_gstin(client, db):
    company = create_company(db, name="GST2", company_code="GS2")
    admin = create_active_user(db, email="admin@gs2.com", role="admin", company_id=company.id)
    customer = create_client(db, company_id=company.id, name="Buyer")
    login_user(client, admin.email)
    resp = client.put(f"/api/clients/{customer.id}", json={"gstin": "bad"})
    assert resp.status_code == 400
