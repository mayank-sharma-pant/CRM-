"""Verify fixing of Admin bugs running on Neon PostgreSQL."""
import requests

BASE = "http://localhost:8000"

def run_tests():
    # Login as admin
    print("Testing Login...")
    r = requests.post(f"{BASE}/api/auth/login", data={"username": "platform@admin.com", "password": "Admin@123"})
    if r.status_code != 200:
        print(f"Login failed: {r.status_code} - {r.text}")
        return
    token = r.json().get("access_token")
    h = {"Authorization": f"Bearer {token}"}
    print("Login OK\n")

    # Test Audit Log
    print("Testing Audit Log...")
    r_audit = requests.get(f"{BASE}/api/admin/audit-log", headers=h)
    print(f"Audit Log Status: {r_audit.status_code}")
    if r_audit.status_code == 200:
        data = r_audit.json()
        print(f"Audit Logs Returned: {data.get('total', 0)}")
    else:
        print(f"Audit Log Error: {r_audit.text}")

    print("\nTesting Admin Dashboard Stats...")
    r_dash = requests.get(f"{BASE}/api/admin/dashboard/stats", headers=h)
    print(f"Dashboard Stats Status: {r_dash.status_code}")
    if r_dash.status_code == 200:
        data = r_dash.json()
        print(f"Stats Returned: {data.get('stats', [])}")
    else:
        print(f"Dashboard Error: {r_dash.text}")

if __name__ == "__main__":
    run_tests()
