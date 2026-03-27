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


def create_user(db, *, email, role, company_id):
    user = User(
        email=email,
        full_name=email.split("@")[0].title(),
        hashed_password=get_password_hash("pw"),
        role=role,
        company_id=company_id,
        status="active",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


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


def test_inventory_filters_search_and_instock_lowstock(client, db):
    company = Company(name="Filter Co", company_code="FIL", status="active")
    db.add(company)
    db.commit()
    db.refresh(company)

    purchase_user = create_user(db, email="purchase@fil.com", role="purchase", company_id=company.id)
    manager_user = create_user(db, email="manager@fil.com", role="manager", company_id=company.id)

    db.add_all(
        [
            StockItem(
                company_id=company.id,
                name="RAM 8GB",
                sku="RAM-8",
                category="Hardware",
                unit="pcs",
                quantity=5,
                reorder_level=2,
                unit_price=40.0,
                created_by_id=purchase_user.id,
                updated_by_id=purchase_user.id,
            ),
            StockItem(
                company_id=company.id,
                name="RAM 16GB",
                sku="RAM-16",
                category="Hardware",
                unit="pcs",
                quantity=1,
                reorder_level=2,
                unit_price=80.0,
                created_by_id=purchase_user.id,
                updated_by_id=purchase_user.id,
            ),
            StockItem(
                company_id=company.id,
                name="Keyboard",
                sku="KEY-1",
                category="Accessories",
                unit="pcs",
                quantity=0,
                reorder_level=1,
                unit_price=20.0,
                created_by_id=purchase_user.id,
                updated_by_id=purchase_user.id,
            ),
        ]
    )
    db.commit()

    login_user(client, manager_user.email)

    list_all = client.get("/api/inventory")
    assert list_all.status_code == 200
    assert list_all.json()["total"] == 3

    low_only = client.get("/api/inventory?low_stock_only=true")
    assert low_only.status_code == 200
    assert low_only.json()["total"] == 2

    in_stock = client.get("/api/inventory?in_stock_only=true")
    assert in_stock.status_code == 200
    assert in_stock.json()["total"] == 2

    search = client.get("/api/inventory?search=accessories")
    assert search.status_code == 200
    assert search.json()["total"] == 1
    assert search.json()["items"][0]["name"] == "Keyboard"


def test_inventory_adjust_quantity_rules_and_permissions(client, db):
    company = Company(name="Adjust Co", company_code="ADJ", status="active")
    db.add(company)
    db.commit()
    db.refresh(company)

    purchase_user = create_user(db, email="purchase@adj.com", role="purchase", company_id=company.id)
    sales_user = create_user(db, email="sales@adj.com", role="sales", company_id=company.id)

    stock = StockItem(
        company_id=company.id,
        name="Mouse",
        sku="MOU-1",
        category="Accessories",
        unit="pcs",
        quantity=3,
        reorder_level=1,
        unit_price=15.0,
        created_by_id=purchase_user.id,
        updated_by_id=purchase_user.id,
    )
    db.add(stock)
    db.commit()
    db.refresh(stock)

    login_user(client, sales_user.email)
    forbidden = client.post(f"/api/inventory/{stock.id}/adjust", json={"quantity_change": 1})
    assert forbidden.status_code == 403

    login_user(client, purchase_user.email)
    zero = client.post(f"/api/inventory/{stock.id}/adjust", json={"quantity_change": 0})
    assert zero.status_code == 400

    below_zero = client.post(f"/api/inventory/{stock.id}/adjust", json={"quantity_change": -10})
    assert below_zero.status_code == 400

    add_resp = client.post(f"/api/inventory/{stock.id}/adjust", json={"quantity_change": 2})
    assert add_resp.status_code == 200
    assert add_resp.json()["quantity"] == 5

    remove_resp = client.post(f"/api/inventory/{stock.id}/adjust", json={"quantity_change": -3})
    assert remove_resp.status_code == 200
    assert remove_resp.json()["quantity"] == 2


def test_inventory_sku_uniqueness_scoped_per_company(client, db):
    company_a = Company(name="SKU Co A", company_code="SKA", status="active")
    company_b = Company(name="SKU Co B", company_code="SKB", status="active")
    db.add_all([company_a, company_b])
    db.commit()
    db.refresh(company_a)
    db.refresh(company_b)

    purchase_a = create_user(db, email="purchase@ska.com", role="purchase", company_id=company_a.id)
    purchase_b = create_user(db, email="purchase@skb.com", role="purchase", company_id=company_b.id)

    login_user(client, purchase_a.email)
    first = client.post(
        "/api/inventory",
        json={
            "name": "CPU",
            "sku": "CPU-1",
            "category": "Hardware",
            "unit": "pcs",
            "unit_price": 200.0,
            "quantity": 5,
            "reorder_level": 1,
        },
    )
    assert first.status_code == 200

    duplicate_same_company = client.post(
        "/api/inventory",
        json={
            "name": "CPU PRO",
            "sku": "CPU-1",
            "category": "Hardware",
            "unit": "pcs",
            "unit_price": 300.0,
            "quantity": 2,
            "reorder_level": 1,
        },
    )
    assert duplicate_same_company.status_code == 400

    login_user(client, purchase_b.email)
    duplicate_other_company = client.post(
        "/api/inventory",
        json={
            "name": "CPU",
            "sku": "CPU-1",
            "category": "Hardware",
            "unit": "pcs",
            "unit_price": 210.0,
            "quantity": 4,
            "reorder_level": 1,
        },
    )
    assert duplicate_other_company.status_code == 200
