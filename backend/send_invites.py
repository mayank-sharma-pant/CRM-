"""Send invites for different roles and accept them."""
import requests
import json

BASE = "http://localhost:8000"

# Login as RTE admin
r = requests.post(f"{BASE}/api/auth/login", data={"username": "admin@rte.com", "password": "Admin@123"})
token = r.json()["access_token"]
h = {"Authorization": f"Bearer {token}"}

me = requests.get(f"{BASE}/api/auth/me", headers=h).json()
print(f"Logged in as: {me['full_name']} (id={me['id']}, role={me['role']})")

# Send invites
invites = [
    {"email": "sales1@rte.com", "full_name": "John Sales", "phone": "1111111111", "role": "sales", "team_id": 1},
    {"email": "sales2@rte.com", "full_name": "Jane Sales", "phone": "2222222222", "role": "sales", "team_id": 1},
    {"email": "manager1@rte.com", "full_name": "Mike Manager", "phone": "3333333333", "role": "manager", "team_id": 1},
    {"email": "md@rte.com", "full_name": "David Director", "phone": "4444444444", "role": "md"},
    {"email": "purchase@rte.com", "full_name": "Pat Purchase", "phone": "5555555555", "role": "purchase", "team_id": 3},
    {"email": "manager2@rte.com", "full_name": "Sarah Manager", "phone": "6666666666", "role": "manager", "team_id": 2},
]

tokens = {}
for inv in invites:
    r = requests.post(f"{BASE}/api/admin/invites", json=inv, headers=h)
    data = r.json()
    print(f"  INVITE {inv['email']} ({inv['role']}): {r.status_code}")
    if r.status_code == 200 and "invite_url" in data:
        # Extract token from URL
        url = data["invite_url"]
        tok = url.split("/accept-invite/")[-1] if "/accept-invite/" in url else None
        tokens[inv["email"]] = tok
        print(f"    Token: {tok}")
    else:
        print(f"    Response: {data}")

# List all invites to get tokens if not captured above
r = requests.get(f"{BASE}/api/admin/invites", headers=h)
invite_list = r.json()
print(f"\nTotal invites: {invite_list.get('total', len(invite_list.get('invites', [])))}")
for inv in invite_list.get("invites", []):
    email = inv["email"]
    tok = inv.get("token", "N/A")
    if email not in tokens or tokens[email] is None:
        tokens[email] = tok
    print(f"  {email} - {inv['role']} - status: {inv['status']} - token: {tok}")

# Accept all invites
print("\n=== ACCEPTING INVITES ===")
for email, tok in tokens.items():
    if tok and tok != "N/A":
        r = requests.post(f"{BASE}/api/auth/accept-invite/{tok}", json={"password": "User@1234"})
        print(f"  ACCEPT {email}: {r.status_code} - {r.json().get('message', r.json().get('detail', ''))}")
    else:
        print(f"  SKIP {email}: no token")

# Verify all users can login
print("\n=== VERIFYING LOGINS ===")
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
