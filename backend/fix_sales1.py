"""Fix sales1 user and verify all CRM access."""
import sqlite3, requests

BASE = "http://localhost:8000"

# Check if sales1 exists in DB
conn = sqlite3.connect("file:crm.db?mode=ro", uri=True)
cursor = conn.cursor()
cursor.execute("SELECT id, email, status, role FROM users WHERE email='sales1@rte.com'")
user = cursor.fetchone()
cursor.execute("SELECT id, email, status, token FROM invites WHERE email='sales1@rte.com'")
invite = cursor.fetchone()
conn.close()

print(f"User sales1: {user}")
print(f"Invite sales1: {invite}")

if invite and invite[2] == "pending":
    print(f"\nRe-accepting invite with token: {invite[3]}")
    r = requests.post(f"{BASE}/api/auth/accept-invite/{invite[3]}", json={"password": "User@1234"})
    print(f"  Status: {r.status_code} - {r.json()}")
elif user:
    print("User exists, testing login...")
    r = requests.post(f"{BASE}/api/auth/login", data={"username": "sales1@rte.com", "password": "User@1234"})
    print(f"  Login: {r.status_code} - {r.json()}")
else:
    print("Neither user nor invite found. Need to re-send invite.")
    # Login as admin and resend
    r = requests.post(f"{BASE}/api/auth/login", data={"username": "admin@rte.com", "password": "Admin@123"})
    token = r.json()["access_token"]
    h = {"Authorization": f"Bearer {token}"}
    
    # Get invite id
    r = requests.get(f"{BASE}/api/admin/invites", headers=h)
    for inv in r.json().get("invites", []):
        if inv["email"] == "sales1@rte.com":
            print(f"Found invite id={inv['id']}, resending...")
            r2 = requests.post(f"{BASE}/api/admin/invites/{inv['id']}/resend", headers=h)
            print(f"  Resend: {r2.status_code} - {r2.json()}")
            break
