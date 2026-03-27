from app.models.ops.stock_item import StockItem
from app.models.sales.notification import Notification
from app.utils.notify import send_notification
from tests.helpers.auth import create_active_user, login_user
from tests.helpers.factories import create_client, create_company


def test_notifications_list_and_mark_read_flow(client, db):
    company = create_company(db, name="Notif Co", company_code="NTF")

    user_a = create_active_user(db, email="usera@ntf.com", role="sales", company_id=company.id)
    user_b = create_active_user(db, email="userb@ntf.com", role="sales", company_id=company.id)

    db.add_all(
        [
            Notification(user_id=user_a.id, title="A-1", message="first", type="info", is_read=False),
            Notification(user_id=user_a.id, title="A-2", message="second", type="warning", is_read=False),
            Notification(user_id=user_a.id, title="A-3", message="third", type="success", is_read=True),
            Notification(user_id=user_b.id, title="B-1", message="other user", type="info", is_read=False),
        ]
    )
    db.commit()

    login_user(client, user_a.email)
    initial = client.get("/api/notifications")
    assert initial.status_code == 200
    data = initial.json()
    assert data["total"] == 3
    assert data["unread_count"] == 2

    unread_only = client.get("/api/notifications?unread_only=true")
    assert unread_only.status_code == 200
    assert unread_only.json()["total"] == 2
    unread_id = unread_only.json()["notifications"][0]["id"]

    mark_one = client.post(f"/api/notifications/{unread_id}/read")
    assert mark_one.status_code == 200

    after_one = client.get("/api/notifications")
    assert after_one.status_code == 200
    assert after_one.json()["unread_count"] == 1

    mark_all = client.post("/api/notifications/read-all")
    assert mark_all.status_code == 200

    after_all = client.get("/api/notifications")
    assert after_all.status_code == 200
    assert after_all.json()["unread_count"] == 0
    assert all(n["is_read"] for n in after_all.json()["notifications"])

    # User A cannot mutate User B's notification
    user_b_notif = db.query(Notification).filter(Notification.user_id == user_b.id).first()
    assert user_b_notif is not None
    forbidden = client.post(f"/api/notifications/{user_b_notif.id}/read")
    assert forbidden.status_code == 404


def test_low_stock_invoice_creates_purchase_notifications(client, db):
    company = create_company(db, name="LowNotif Co", company_code="LNF")

    purchase_1 = create_active_user(
        db, email="purchase1@lnf.com", role="purchase", company_id=company.id
    )
    purchase_2 = create_active_user(
        db, email="purchase2@lnf.com", role="purchase", company_id=company.id
    )
    sales_user = create_active_user(db, email="sales@lnf.com", role="sales", company_id=company.id)

    customer = create_client(
        db,
        company_id=company.id,
        name="Notif Customer",
        assigned_to_id=sales_user.id,
    )

    login_user(client, purchase_1.email)
    create_stock = client.post(
        "/api/inventory",
        json={
            "name": "GPU 12GB",
            "sku": "GPU-12-01",
            "category": "Hardware",
            "unit": "pcs",
            "unit_price": 300.0,
            "quantity": 3,
            "reorder_level": 2,
        },
    )
    assert create_stock.status_code == 200, create_stock.text
    stock_id = create_stock.json()["id"]

    login_user(client, sales_user.email)
    # Same stock item appears twice in one invoice to validate dedupe logic.
    create_invoice = client.post(
        "/api/invoices",
        json={
            "client_id": customer.id,
            "items": [
                {
                    "description": "GPU line 1",
                    "quantity": 1,
                    "unit_price": 300.0,
                    "stock_item_id": stock_id,
                },
                {
                    "description": "GPU line 2",
                    "quantity": 1,
                    "unit_price": 300.0,
                    "stock_item_id": stock_id,
                },
            ],
            "tax": 0,
            "discount": 0,
        },
    )
    assert create_invoice.status_code == 201, create_invoice.text

    # Stock should go from 3 -> 1 (below reorder level 2)
    stock = db.query(StockItem).filter(StockItem.id == stock_id).first()
    assert stock is not None
    assert stock.quantity == 1

    notif_p1 = db.query(Notification).filter(Notification.user_id == purchase_1.id).all()
    notif_p2 = db.query(Notification).filter(Notification.user_id == purchase_2.id).all()
    assert len(notif_p1) == 1
    assert len(notif_p2) == 1
    assert notif_p1[0].title.startswith("Low Stock:")
    assert notif_p1[0].type == "warning"
    assert notif_p1[0].link == "/purchase/stock"
    assert "Only 1" in (notif_p1[0].message or "")


def test_send_notification_dedup_window_blocks_duplicate(db):
    company = create_company(db, name="Dedupe Co", company_code="DDP")
    user = create_active_user(db, email="user@ddp.com", role="sales", company_id=company.id)

    created_1 = send_notification(
        db,
        user.id,
        title="Stock Alert",
        message="Low stock for RAM",
        type="warning",
        link="/purchase/stock",
        dedupe_window_seconds=300,
    )
    created_2 = send_notification(
        db,
        user.id,
        title="Stock Alert",
        message="Low stock for RAM",
        type="warning",
        link="/purchase/stock",
        dedupe_window_seconds=300,
    )
    db.commit()

    assert created_1 is True
    assert created_2 is False
    notifications = db.query(Notification).filter(Notification.user_id == user.id).all()
    assert len(notifications) == 1


def test_low_stock_notifications_are_throttled_for_duplicate_alerts(client, db):
    company = create_company(db, name="LowThrottle Co", company_code="LTH")
    purchase_user = create_active_user(
        db, email="purchase@lth.com", role="purchase", company_id=company.id
    )
    sales_user = create_active_user(db, email="sales@lth.com", role="sales", company_id=company.id)
    customer = create_client(
        db,
        company_id=company.id,
        name="Throttle Customer",
        assigned_to_id=sales_user.id,
    )

    login_user(client, purchase_user.email)
    create_stock = client.post(
        "/api/inventory",
        json={
            "name": "Server RAM 64GB",
            "sku": "RAM-64-THR",
            "category": "Hardware",
            "unit": "pcs",
            "unit_price": 200.0,
            "quantity": 5,
            "reorder_level": 4,
        },
    )
    assert create_stock.status_code == 200, create_stock.text
    stock_id = create_stock.json()["id"]

    login_user(client, sales_user.email)
    invoice_1 = client.post(
        "/api/invoices",
        json={
            "client_id": customer.id,
            "items": [
                {
                    "description": "RAM shipment 1",
                    "quantity": 1,
                    "unit_price": 200.0,
                    "stock_item_id": stock_id,
                }
            ],
            "tax": 0,
            "discount": 0,
        },
    )
    assert invoice_1.status_code == 201, invoice_1.text

    invoice_2 = client.post(
        "/api/invoices",
        json={
            "client_id": customer.id,
            "items": [
                {
                    "description": "RAM shipment 2",
                    "quantity": 1,
                    "unit_price": 200.0,
                    "stock_item_id": stock_id,
                }
            ],
            "tax": 0,
            "discount": 0,
        },
    )
    assert invoice_2.status_code == 201, invoice_2.text

    purchase_notifications = db.query(Notification).filter(Notification.user_id == purchase_user.id).all()
    assert len(purchase_notifications) == 1
    assert purchase_notifications[0].title == "Low Stock: Server RAM 64GB"


def test_notification_preferences_api_and_category_mute(client, db):
    company = create_company(db, name="Pref Co", company_code="PRF")
    user = create_active_user(db, email="pref@prf.com", role="sales", company_id=company.id)

    login_user(client, user.email)
    initial = client.get("/api/notifications/preferences")
    assert initial.status_code == 200, initial.text
    initial_payload = initial.json()
    assert "tasks" in initial_payload["available_categories"]
    assert initial_payload["muted_categories"] == []

    updated = client.put(
        "/api/notifications/preferences",
        json={"muted_categories": ["tasks", "inventory", "invalid-value", "general"]},
    )
    assert updated.status_code == 200, updated.text
    updated_payload = updated.json()
    assert "tasks" in updated_payload["muted_categories"]
    assert "inventory" in updated_payload["muted_categories"]
    assert "general" not in updated_payload["muted_categories"]

    blocked = send_notification(
        db,
        user.id,
        title="Task Assignment",
        message="You got a new task",
        type="info",
        link="/sales/tasks",
        category="tasks",
    )
    allowed = send_notification(
        db,
        user.id,
        title="General Notice",
        message="Welcome back",
        type="info",
        link="/profile",
        category="general",
    )
    db.commit()

    assert blocked is False
    assert allowed is True
    rows = db.query(Notification).filter(Notification.user_id == user.id).all()
    assert len(rows) == 1
    assert rows[0].title == "General Notice"
