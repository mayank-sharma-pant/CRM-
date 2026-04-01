import sys
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)
resp = client.post("/api/auth/login", data={"username": "md@perioxia.com", "password": "TestUser@123"})
if resp.status_code != 200:
    print("Login failed:", resp.text)
    sys.exit(1)

token = resp.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

print("Testing /api/md/revenue...")
try:
    resp2 = client.get("/api/md/revenue", headers=headers)
    print("REVENUE:", resp2.status_code)
    print(resp2.text[:200])
except Exception as e:
    import traceback
    traceback.print_exc()

print("Testing /api/md/reports/custom?group_by=date...")
try:
    resp3 = client.get("/api/md/reports/custom?group_by=date", headers=headers)
    print("REPORTS:", resp3.status_code)
    print(resp3.text[:200])
except Exception as e:
    import traceback
    traceback.print_exc()
