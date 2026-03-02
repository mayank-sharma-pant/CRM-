"""Check invite status and re-accept if needed."""
import requests
import json

BASE = "http://localhost:8000"

# Login as RTE admin
r = requests.post(f"{BASE}/api/auth/login", data={"username": "admin@rte.com", "password": "Admin@123"})
token = r.json()["access_token"]
h = {"Authorization": f"Bearer {token}"}

# List all invites
r = requests.get(f"{BASE}/api/admin/invites", headers=h)
invites = r.json()
print("=== CURRENT INVITES ===")
for inv in invites.get("invites", []):
    print(f"  {inv['email']} role={inv['role']} status={inv['status']} token={inv.get('token','N/A')}")

# Try to accept each pending invite
print("\n=== ACCEPTING PENDING INVITES ===")
for inv in invites.get("invites", []):
    if inv["status"] == "pending":
        tok = inv.get("token")
        if tok:
            r2 = requests.post(f"{BASE}/api/auth/accept-invite/{tok}", json={"password": "User@1234"})
            print(f"  ACCEPT {inv['email']}: {r2.status_code} - {r2.json()}")
        else:
            print(f"  SKIP {inv['email']}: no token")

# Check users in the system
print("\n=== ALL USERS ===")
r = requests.get(f"{BASE}/api/admin/users", headers=h)
users = r.json()
for u in users.get("users", []):
    print(f"  id={u['id']} name={u['name']} email={u['email']} role={u['role']} status={u['status']}")

# Try logins
print("\n=== LOGIN TESTS ===")
test_users = [
    ("admin@rte.com", "Admin@123"),
    ("sales1@rte.com", "User@1234"),
    ("sales2@rte.com", "User@1234"),
    ("manager1@rte.com", "User@1234"),
    ("md@rte.com", "User@1234"),
    ("purchase@rte.com", "User@1234"),
    ("manager2@rte.com", "User@1234"),
]
for email, pwd in test_users:
    r = requests.post(f"{BASE}/api/auth/login", data={"username": email, "password": pwd})
    if r.status_code == 200:
        user = r.json()["user"]
        print(f"  OK {email}: role={user['role']}, id={user['id']}")
    else:
        print(f"  FAIL {email}: {r.status_code} - {r.json().get('detail', '')}")
