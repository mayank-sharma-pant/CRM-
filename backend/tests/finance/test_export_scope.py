from app.models.finance.invoice import Invoice
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_client, create_company


def test_invoice_export_client_lookup_is_company_scoped(client, db):
    company_a = create_company(db, name="Export Co A", company_code="ECA")
    company_b = create_company(db, name="Export Co B", company_code="ECB")
    admin_a = create_active_user(
        db,
        email="admin@eca.com",
        role="admin",
        company_id=company_a.id,
        full_name="Admin A",
    )
    client_b = create_client(
        db,
        company_id=company_b.id,
        name="Company B Client",
        email="client@ecb.com",
    )

    # Intentionally mismatched foreign key data to verify scoped client resolution.
    leaked_ref_invoice = Invoice(
        company_id=company_a.id,
        invoice_number=f"INV-{company_a.id:03d}-9999",
        client_id=client_b.id,
        subtotal=100,
        tax=0,
        discount=0,
        total=100,
        status="Draft",
        created_by_id=admin_a.id,
    )
    db.add(leaked_ref_invoice)
    db.commit()

    login_user(client, admin_a.email)
    response = client.get("/api/export/invoices")
    assert response.status_code == 200
    text = response.text
    assert leaked_ref_invoice.invoice_number in text
    assert "Company B Client" not in text
