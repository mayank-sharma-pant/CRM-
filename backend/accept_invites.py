"""Extract tokens from DB readonly, then accept via HTTP API only."""
import sys, os, sqlite3
sys.path.insert(0, os.path.dirname(__file__))

import requests

BASE = "http://localhost:8000"

# Read tokens directly from SQLite (read-only, no ORM lock issues)
conn = sqlite3.connect("file:crm.db?mode=ro", uri=True)
cursor = conn.cursor()
cursor.execute("SELECT email, role, token, status FROM invites WHERE status='pending'")
invites = cursor.fetchall()
conn.close()

print(f"Found {len(invites)} pending invites\n")

for email, role, token, status in invites:
    print(f"Accepting: {email} (role={role})")
    r = requests.post(f"{BASE}/api/auth/accept-invite/{token}", json={"password": "User@1234"})
    print(f"  Status: {r.status_code}")
    print(f"  Response: {r.json()}\n")

# Verify logins
print("=== LOGIN VERIFICATION ===")
test_users = [
    ("admin@rte.com", "Admin@123"),
    ("sales1@rte.com", "User@1234"),
    ("sales2@rte.com", "User@1234"),
    ("manager1@rte.com", "User@1234"),
    ("md@rte.com", "User@1234"),
    ("purchase@rte.com", "User@1234"),
    ("manager2@rte.com", "User@1234"),
]
results = []
for email, pwd in test_users:
    r = requests.post(f"{BASE}/api/auth/login", data={"username": email, "password": pwd})
    if r.status_code == 200:
        user = r.json()["user"]
        results.append(f"  OK {email}: role={user['role']}, id={user['id']}")
    else:
        results.append(f"  FAIL {email}: {r.status_code} - {r.json().get('detail', '')}")

output = "\n".join(results)
print(output)
with open("login_results.txt", "w") as f:
    f.write(output)
