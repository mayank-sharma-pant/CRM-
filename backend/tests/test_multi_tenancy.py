import pytest
from app.models import User, Lead, Company
from app.utils.security import get_password_hash

def login_user(client, email):
    # Utility to log in and set the cookie (and header for fallback) in the client
    response = client.post(
        "/api/auth/login",
        data={"username": email, "password": "pw"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert response.status_code == 200, f"Login failed for {email}: {response.json()}"
    token = response.json()["access_token"]
    client.headers["Authorization"] = f"Bearer {token}"
    return response

def test_multi_tenancy_lead_isolation(client, db):
    # Setup: Create Companies
    c1 = Company(name="Company A", company_code="COA", status="active")
    c2 = Company(name="Company B", company_code="COB", status="active")
    db.add_all([c1, c2])
    db.commit()
    db.refresh(c1)
    db.refresh(c2)

    # Setup: Create Users
    u1 = User(
        email="admin@a.com", full_name="A Admin", 
        hashed_password=get_password_hash("pw"), 
        role="admin", company_id=c1.id, is_active=True, status="active"
    )
    u2 = User(
        email="sales@b.com", full_name="B Sales", 
        hashed_password=get_password_hash("pw"), 
        role="sales", company_id=c2.id, is_active=True, status="active"
    )
    db.add_all([u1, u2])
    db.commit()
    db.refresh(u1)
    db.refresh(u2)
    
    # Setup: Create Lead for Company A
    lead_a = Lead(name="Lead A", email="la@a.com", company="Alpha Corp", company_id=c1.id, status="New")
    db.add(lead_a)
    db.commit()

    # Action: Log in as User B (Company B)
    login_user(client, u2.email)
    
    # Attempt to fetch all leads as User B
    response = client.get("/api/leads/")
    assert response.status_code == 200
    
    # Assert: User B should NOT see Lead A (it belongs to Company A)
    data = response.json()
    leads = data["items"]
    assert not any(l["name"] == "Lead A" for l in leads)
    assert len(leads) == 0

    # Action: Log out and log in as User A (Company A)
    client.headers.pop("Authorization", None)
    login_user(client, u1.email)
    
    # Attempt to fetch all leads as User A
    response = client.get("/api/leads/")
    assert response.status_code == 200
    
    # Assert: User A SHOULD see Lead A
    data = response.json()
    leads = data["items"]
    assert any(l["name"] == "Lead A" for l in leads)
    assert len(leads) == 1

def test_platform_admin_bypass(client, db):
    # Setup: Company A and Lead A
    c1 = Company(name="Company A", company_code="COA", status="active")
    db.add(c1)
    db.commit()
    db.refresh(c1)
    
    lead_a = Lead(name="Lead A", email="la@a.com", company="Alpha Corp", company_id=c1.id, status="New")
    db.add(lead_a)
    db.commit()

    # Setup: Platform Admin (role=admin, company_id=None)
    # Check dependencies.py for exact role requirement
    pa = User(
        email="platform@admin.com", full_name="Platform Admin",
        hashed_password=get_password_hash("pw"),
        role="admin", company_id=None, is_active=True, status="active"
    )
    db.add(pa)
    db.commit()
    db.refresh(pa)

    # Action: Log in as Platform Admin
    login_user(client, pa.email)
    
    # Attempt to fetch all leads
    response = client.get("/api/leads/")
    assert response.status_code == 200
    
    # Assert: Platform admin should see Lead A regardless of company
    data = response.json()
    leads = data["items"]
    assert any(l["name"] == "Lead A" for l in leads)
    assert len(leads) == 1
