"""
Test script for Purchase Flow, Leads, and Invoices.
Logs in as existing generic users from setup_test_data.py to populate data.
"""
import sys
import os
import httpx
import json

sys.path.append(os.path.dirname(os.path.dirname(__file__)))

BASE_URL = "http://localhost:8000/api"
ADMIN_EMAIL = "mayanksharmarrk01@gmail.com"
ADMIN_PASSWORD = "Mayank@admin@30"
TEST_PASSWORD = "TestUser@123"

# Emails from setup_test_data.py
SALES_EMAIL = "emp1@perioxia.com"
PURCHASE_EMAIL = "purchase@perioxia.com"

client = httpx.Client(timeout=30.0)

def step(msg):
    print(f"\n{'-' * 50}")
    print(f"  {msg}")
    print(f"{'-' * 50}")


def login(email, password):
    """Login and return token."""
    resp = client.post(f"{BASE_URL}/auth/login", data={
        "username": email,
        "password": password,
    })
    if resp.status_code != 200:
        print(f"[FAIL] Login as {email} failed: {resp.status_code} {resp.text}")
        return None
    data = resp.json()
    token = data["access_token"]
    print(f"[OK] Logged in as: {data['user']['full_name']} (role={data['user']['role']})")
    
    # Return a new client session for this user
    user_client = httpx.Client(timeout=30.0)
    user_client.headers["Authorization"] = f"Bearer {token}"
    user_client.cookies.set("access_token", token)
    return user_client


def invite_and_accept_purchase(admin_client):
    """Create purchase user."""
    payload = {"email": PURCHASE_EMAIL, "full_name": "Peter Purchase", "role": "purchase", "phone": "+1234567890"}
    resp = admin_client.post(f"{BASE_URL}/admin/invites", json=payload)
    if resp.status_code == 400 and "already exists" in resp.text:
        print(f"[SKIP] {PURCHASE_EMAIL} already exists")
    elif resp.status_code not in (200, 201):
        print(f"[FAIL] Invite purchase: {resp.status_code} {resp.text}")
        return None
    
    # Accept via DB trick
    from app.database import SessionLocal
    from app.models.core.invite import Invite, InviteStatus
    db = SessionLocal()
    try:
        invite = db.query(Invite).filter(Invite.email == PURCHASE_EMAIL, Invite.status == InviteStatus.PENDING).first()
        if not invite:
            print(f"[SKIP] No pending invite found for {PURCHASE_EMAIL}")
            return
        token = invite.token
    finally:
        db.close()

    resp2 = httpx.post(f"{BASE_URL}/auth/accept-invite/{token}", json={"password": TEST_PASSWORD})
    if resp2.status_code in (200, 201):
        print(f"[OK] Account created: Peter Purchase")


def create_lead(sales_client, name, company, email):
    """Create a lead as sales."""
    resp = sales_client.post(f"{BASE_URL}/leads", json={
        "name": name,
        "company": company,
        "email": email,
        "phone": "555-0100",
        "status": "New",
        "source": "Website",
        "notes": "Test lead from script"
    })
    if resp.status_code in (200, 201):
        data = resp.json()
        print(f"[OK] Created Lead: {name} ({company}) - id: {data['id']}")
        return data["id"]
    else:
        print(f"[FAIL] Create Lead: {resp.status_code} {resp.text}")
        return None


def convert_lead(sales_client, lead_id):
    """Convert lead to client."""
    resp = sales_client.post(f"{BASE_URL}/leads/{lead_id}/convert")
    if resp.status_code in (200, 201):
        data = resp.json()
        print(f"[OK] Converted lead {lead_id} to client (client_id: {data['client_id']})")
        return data["client_id"]
    else:
        print(f"[FAIL] Convert Lead {lead_id}: {resp.status_code} {resp.text}")
        return None


def create_draft_invoice(sales_client, client_id):
    """Create a draft invoice (order) as sales."""
    resp = sales_client.post(f"{BASE_URL}/invoices", json={
        "client_id": client_id,
        "items": [
            {"description": "Software License", "quantity": 10, "unit_price": 500.0},
            {"description": "Support Contract", "quantity": 1, "unit_price": 2000.0}
        ],
        "tax": 500,
        "discount": 0,
        "due_days": 30
    })
    if resp.status_code in (200, 201):
        data = resp.json()
        print(f"[OK] Created Draft Invoice/Order: {data['id']}")
        return data["id"]
    else:
        print(f"[FAIL] Create Draft Invoice: {resp.status_code} {resp.text}")
        return None


def approve_invoice(purchase_client, invoice_id):
    """Approve invoice as purchase department."""
    resp = purchase_client.post(f"{BASE_URL}/purchase/sales/{invoice_id}/approve")
    if resp.status_code in (200, 201):
        print(f"[OK] Approved Invoice {invoice_id}")
    else:
        print(f"[FAIL] Approve Invoice {invoice_id}: {resp.status_code} {resp.text}")


def main():
    print("=" * 60)
    print("  CRM Purchase & Sales Flow Population")
    print("=" * 60)

    # 1. Login as Admin & Create Purchase User
    step("1. Create Purchase Department")
    admin_client = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    if not admin_client:
        sys.exit(1)
    invite_and_accept_purchase(admin_client)

    # 2. Login as Sales to create leads & clients
    step("2. Login as Sales & Populate Leads/Clients")
    sales_client = login(SALES_EMAIL, TEST_PASSWORD)
    if not sales_client:
        sys.exit(1)
    
    import uuid
    suffix = uuid.uuid4().hex[:4]
    lead_1_id = create_lead(sales_client, f"Bruce Wayne {suffix}", "Wayne Enterprises", f"bruce_{suffix}@wayne.com")
    lead_2_id = create_lead(sales_client, f"Tony Stark {suffix}", "Stark Industries", f"tony_{suffix}@stark.com")
    lead_3_id = create_lead(sales_client, f"Clark Kent {suffix}", "Daily Planet", f"clark_{suffix}@planet.com")
    
    client_1_id = convert_lead(sales_client, lead_1_id)
    client_2_id = convert_lead(sales_client, lead_2_id)
    # Leave lead 3 as a lead

    # 3. Create Draft Invoices ("Orders")
    step("3. Create Orders (Draft Invoices) as Sales")
    inv_1_id = create_draft_invoice(sales_client, client_1_id)
    inv_2_id = create_draft_invoice(sales_client, client_2_id)

    # 4. Login as Purchase to approve them
    step("4. Login as Purchase & Approve Orders")
    purchase_client = login(PURCHASE_EMAIL, TEST_PASSWORD)
    if not purchase_client:
        sys.exit(1)
    
    # Approve the first order, leave the second as draft for testing graphs
    approve_invoice(purchase_client, inv_1_id)

    # Make the approved one "Paid" to get revenue graph data
    # (assuming purchase user has permission to mark paid)
    step("5. Mark one approved invoice as Paid")
    resp = purchase_client.post(f"{BASE_URL}/purchase/invoices/{inv_1_id}/mark-paid?payment_date=2024-03-31")
    if resp.status_code in (200, 201):
        print(f"[OK] Marked Invoice {inv_1_id} as PAID")
    else:
        print(f"[FAIL] Mark Paid Invoice {inv_1_id}: {resp.status_code} {resp.text}")

    print("\n" + "=" * 60)
    print("  [OK] POPULATION COMPLETE")
    print("=" * 60)

if __name__ == "__main__":
    main()
