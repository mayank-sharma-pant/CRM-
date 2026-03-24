import pytest
from app.models.user import User
from app.models.lead import Lead
from app.models.company import Company
from app.utils.security import get_password_hash

@pytest.fixture
def companies(db):
    c1 = Company(name="Company A", company_code="COA", status="active")
    c2 = Company(name="Company B", company_code="COB", status="active")
    db.add_all([c1, c2])
    db.commit()
    db.refresh(c1)
    db.refresh(c2)
    return c1, c2

@pytest.fixture
def users(db, companies):
    c1, c2 = companies
    u1 = User(
        email="admin@a.com", full_name="A Admin", 
        hashed_password=get_password_hash("pw"), 
        role="admin", company_id=c1.id, status="active"
    )
    u2 = User(
        email="sales@b.com", full_name="B Sales", 
        hashed_password=get_password_hash("pw"), 
        role="sales", company_id=c2.id, status="active"
    )
    db.add_all([u1, u2])
    db.commit()
    return u1, u2

def login_user(client, email):
    # Utility to log in and set the cookie in the client
    response = client.post(
        "/api/auth/login",
        data={"username": email, "password": "pw"},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert response.status_code == 200, f"Login failed for {email}: {response.json()}"
    return response

def test_multi_tenancy_lead_isolation(client, db, users, companies):
    u1, u2 = users
    c1, c2 = companies
    
    # Setup: Create a lead for Company A
    lead_a = Lead(name="Lead A", company_id=c1.id, status="New")
    db.add(lead_a)
    db.commit()

    # Action: Log in as User B (Company B)
    login_user(client, u2.email)
    
    # Attempt to fetch all leads as User B
    response = client.get("/api/leads/")
    assert response.status_code == 200
    
    # Assert: User B should NOT see Lead A
    leads = response.json()
    assert len(leads) == 0
    
    # Action: Log out and log in as User A
    client.post("/api/auth/logout")
    login_user(client, u1.email)
    
    # Attempt to fetch all leads as User A
    response = client.get("/api/leads/")
    assert response.status_code == 200
    
    # Assert: User A SHOULD see Lead A
    leads = response.json()
    assert len(leads) == 1
    assert leads[0]["name"] == "Lead A"

def test_platform_admin_bypass(client, db, users, companies):
    # Setup: Platform admin (no company_id)
    pa = User(
        email="platform@admin.com", full_name="Platform Admin",
        hashed_password=get_password_hash("pw"),
        role="platform_admin", company_id=None, status="active"
    )
    db.add(pa)
    
    c1, c2 = companies
    lead_a = Lead(name="Lead A", company_id=c1.id, status="New")
    lead_b = Lead(name="Lead B", company_id=c2.id, status="New")
    db.add_all([lead_a, lead_b])
    db.commit()

    # Action: Log in as Platform Admin
    login_user(client, pa.email)
    
    # Attempt to fetch all leads
    response = client.get("/api/leads/")
    assert response.status_code == 200
    
    # Assert: Platform admin should see BOTH leads
    leads = response.json()
    assert len(leads) == 2
