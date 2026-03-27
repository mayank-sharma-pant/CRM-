from app.models.finance.invoice import Invoice
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_client, create_company


def test_purchase_invoice_rejects_negative_financial_fields(client, db):
    company = create_company(db, name="Purchase Validation Co", company_code="PVC")
    purchase_user = create_active_user(
        db,
        email="purchase@pvc.com",
        role="purchase",
        company_id=company.id,
        full_name="Purchase User",
    )
    customer = create_client(
        db,
        company_id=company.id,
        name="Purchase Customer",
        email="purchase-customer@pvc.com",
    )
    login_user(client, purchase_user.email)

    invalid_payloads = [
        ({"tax": -1}, "tax"),
        ({"discount": -1}, "discount"),
        ({"due_days": -1}, "due_days"),
    ]
    before_count = db.query(Invoice).filter(Invoice.company_id == company.id).count()

    for extra, field_name in invalid_payloads:
        response = client.post(
            "/api/purchase/invoices",
            json={
                "client_id": customer.id,
                "items": [{"description": "Service", "quantity": 1, "unit_price": 100.0}],
                "tax": 0,
                "discount": 0,
                "due_days": 30,
                **extra,
            },
        )
        assert response.status_code == 400
        assert field_name in response.json()["detail"].lower()
        after_count = db.query(Invoice).filter(Invoice.company_id == company.id).count()
        assert after_count == before_count


def test_purchase_invoice_rejects_invalid_line_items(client, db):
    company = create_company(db, name="Purchase Line Co", company_code="PLC")
    purchase_user = create_active_user(
        db,
        email="purchase@plc.com",
        role="purchase",
        company_id=company.id,
        full_name="Purchase User",
    )
    customer = create_client(
        db,
        company_id=company.id,
        name="Line Customer",
        email="line-customer@plc.com",
    )
    login_user(client, purchase_user.email)

    bad_item_payloads = [
        (
            [{"description": "Bad Qty", "quantity": 0, "unit_price": 100.0}],
            "quantity",
        ),
        (
            [{"description": "Bad Price", "quantity": 1, "unit_price": -5.0}],
            "unit price",
        ),
    ]

    for items, expected in bad_item_payloads:
        response = client.post(
            "/api/purchase/invoices",
            json={
                "client_id": customer.id,
                "items": items,
                "tax": 0,
                "discount": 0,
                "due_days": 30,
            },
        )
        assert response.status_code == 400
        assert expected in response.json()["detail"].lower()
