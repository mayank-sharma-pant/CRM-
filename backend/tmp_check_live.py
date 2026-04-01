import sys
import httpx

client = httpx.Client()
resp = client.post("http://localhost:8000/api/auth/login", data={"username": "md@perioxia.com", "password": "TestUser@123"})
if resp.status_code != 200:
    print("Login failed:", resp.text)
    sys.exit(1)

token = resp.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

resp3 = client.get("http://localhost:8000/api/md/reports/custom?group_by=date", headers=headers)
print("LIVE SERVER REPORTS:", resp3.status_code)
print(resp3.text[:200])
