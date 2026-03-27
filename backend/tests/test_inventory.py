from app.models import Company, User, Client
from app.models.ops.stock_item import StockItem
from app.utils.security import get_password_hash


def login_user(client, email):
    response = client.post(
        "/api/auth/login",
        data={"username": email, "password": "pw"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert response.status_code == 200, f"Login failed for {email}: {response.text}"
    token = response.json()["access_token"]
    client.headers["Authorization"] = f"Bearer {token}"
    return response


def test_sales_invoice_decreases_stock_when_stock_item_linked(client, db):
    company = Company(name="Inventory Co", company_code="INV", status="active")
    db.add(company)
    db.commit()
    db.refresh(company)

    purchase_user = User(
        email="purchase@inv.com",
        full_name="Purchase",
        hashed_password=get_password_hash("pw"),
        role="purchase",
        company_id=company.id,
        status="active",
        is_active=True,
    )
    sales_user = User(
        email="sales@inv.com",
        full_name="Sales",
        hashed_password=get_password_hash("pw"),
        role="sales",
        company_id=company.id,
        status="active",
        is_active=True,
    )
    db.add_all([purchase_user, sales_user])
    db.commit()
    db.refresh(purchase_user)
    db.refresh(sales_user)

    client_row = Client(
        company_id=company.id,
        name="Customer A",
        assigned_to_id=sales_user.id,
    )
    db.add(client_row)
    db.commit()
    db.refresh(client_row)

    login_user(client, purchase_user.email)
    create_stock = client.post(
        "/api/inventory",
        json={
            "name": "RAM 16GB",
            "sku": "RAM-16-001",
            "category": "Hardware",
            "unit": "pcs",
            "unit_price": 120.0,
            "quantity": 10,
            "reorder_level": 2,
        },
    )
    assert create_stock.status_code == 200, create_stock.text
    stock_id = create_stock.json()["id"]

    login_user(client, sales_user.email)
    create_invoice = client.post(
        "/api/invoices",
        json={
            "client_id": client_row.id,
            "items": [
                {
                    "description": "RAM 16GB",
                    "quantity": 3,
                    "unit_price": 120.0,
                    "stock_item_id": stock_id,
                }
            ],
            "tax": 0,
            "discount": 0,
            "due_days": 15,
        },
    )
    assert create_invoice.status_code == 201, create_invoice.text

    stock = db.query(StockItem).filter(StockItem.id == stock_id).first()
    assert stock is not None
    assert stock.quantity == 7


def test_manager_can_view_but_not_modify_inventory(client, db):
    company = Company(name="View Co", company_code="VCO", status="active")
    db.add(company)
    db.commit()
    db.refresh(company)

    manager = User(
        email="manager@view.com",
        full_name="Manager",
        hashed_password=get_password_hash("pw"),
        role="manager",
        company_id=company.id,
        status="active",
        is_active=True,
    )
    purchase_user = User(
        email="purchase@view.com",
        full_name="Purchase",
        hashed_password=get_password_hash("pw"),
        role="purchase",
        company_id=company.id,
        status="active",
        is_active=True,
    )
    db.add_all([manager, purchase_user])
    db.commit()
    db.refresh(manager)
    db.refresh(purchase_user)

    db.add(
        StockItem(
            company_id=company.id,
            name="SSD 1TB",
            sku="SSD-1TB-01",
            category="Hardware",
            unit="pcs",
            quantity=4,
            unit_price=90.0,
            reorder_level=1,
            created_by_id=purchase_user.id,
            updated_by_id=purchase_user.id,
        )
    )
    db.commit()

    login_user(client, manager.email)
    list_resp = client.get("/api/inventory")
    assert list_resp.status_code == 200
    assert list_resp.json()["total"] == 1

    create_resp = client.post(
        "/api/inventory",
        json={
            "name": "GPU",
            "sku": "GPU-001",
            "category": "Hardware",
            "unit": "pcs",
            "unit_price": 500.0,
            "quantity": 2,
            "reorder_level": 1,
        },
    )
    assert create_resp.status_code == 403


def test_invoice_rejects_when_requested_quantity_exceeds_stock(client, db):
    company = Company(name="Low Stock Co", company_code="LSC", status="active")
    db.add(company)
    db.commit()
    db.refresh(company)

    purchase_user = User(
        email="purchase@lsc.com",
        full_name="Purchase",
        hashed_password=get_password_hash("pw"),
        role="purchase",
        company_id=company.id,
        status="active",
        is_active=True,
    )
    sales_user = User(
        email="sales@lsc.com",
        full_name="Sales",
        hashed_password=get_password_hash("pw"),
        role="sales",
        company_id=company.id,
        status="active",
        is_active=True,
    )
    db.add_all([purchase_user, sales_user])
    db.commit()
    db.refresh(purchase_user)
    db.refresh(sales_user)

    customer = Client(
        company_id=company.id,
        name="Customer B",
        assigned_to_id=sales_user.id,
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)

    login_user(client, purchase_user.email)
    create_stock = client.post(
        "/api/inventory",
        json={
            "name": "SSD 2TB",
            "sku": "SSD-2TB-01",
            "category": "Hardware",
            "unit": "pcs",
            "unit_price": 180.0,
            "quantity": 2,
            "reorder_level": 1,
        },
    )
    assert create_stock.status_code == 200, create_stock.text
    stock_id = create_stock.json()["id"]

    login_user(client, sales_user.email)
    create_invoice = client.post(
        "/api/invoices",
        json={
            "client_id": customer.id,
            "items": [
                {
                    "description": "SSD 2TB",
                    "quantity": 3,
                    "unit_price": 180.0,
                    "stock_item_id": stock_id,
                }
            ],
            "tax": 0,
            "discount": 0,
        },
    )
    assert create_invoice.status_code == 400
    assert "Insufficient stock" in create_invoice.text

    stock = db.query(StockItem).filter(StockItem.id == stock_id).first()
    assert stock is not None
    assert stock.quantity == 2
