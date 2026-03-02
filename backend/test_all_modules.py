"""Comprehensive CRM test - fixed version."""
import requests, json

BASE = "http://localhost:8000"
RESULTS = []

def log(msg):
    print(msg)
    RESULTS.append(msg)

def login(email, password):
    r = requests.post(f"{BASE}/api/auth/login", data={"username": email, "password": password})
    return r.json()["access_token"] if r.status_code == 200 else None

def h(token):
    return {"Authorization": f"Bearer {token}"}

def safe_total(resp):
    data = resp.json()
    if isinstance(data, list):
        return len(data)
    return data.get("total", data.get("items", data.get("count", "?")))

# Login all users
tokens = {}
for name, email, pwd in [
    ("admin", "admin@rte.com", "Admin@123"),
    ("sales1", "sales1@rte.com", "User@1234"),
    ("sales2", "sales2@rte.com", "User@1234"),
    ("manager1", "manager1@rte.com", "User@1234"),
    ("md", "md@rte.com", "User@1234"),
    ("purchase", "purchase@rte.com", "User@1234"),
    ("manager2", "manager2@rte.com", "User@1234"),
]:
    token = login(email, pwd)
    tokens[name] = token
    log(f"LOGIN {'OK' if token else 'FAIL'}: {name}")

# === LEADS ===
log("\n=== LEADS ===")
lead_ids = []
for ld in [
    {"name": "Alice Johnson", "email": "alice@techcorp.com", "phone": "1112223333", "company": "TechCorp", "source": "website"},
    {"name": "Bob Smith", "email": "bob@datasoft.com", "phone": "4445556666", "company": "DataSoft", "source": "referral"},
    {"name": "Carol Davis", "email": "carol@cloudnet.com", "phone": "7778889999", "company": "CloudNet", "source": "cold_call"},
]:
    r = requests.post(f"{BASE}/api/leads", json=ld, headers=h(tokens["sales1"]))
    log(f"  Create lead '{ld['name']}': {r.status_code}")
    if r.status_code in (200, 201):
        lead_ids.append(r.json().get("id"))

if lead_ids:
    r = requests.put(f"{BASE}/api/leads/{lead_ids[0]}", json={"status": "Qualified"}, headers=h(tokens["sales1"]))
    log(f"  Update lead to Qualified: {r.status_code}")

r = requests.get(f"{BASE}/api/leads", headers=h(tokens["sales1"]))
log(f"  List leads (sales1): {r.status_code} total={safe_total(r)}")

r = requests.get(f"{BASE}/api/leads", headers=h(tokens["manager1"]))
log(f"  List leads (manager1): {r.status_code} total={safe_total(r)}")

# Convert lead
if len(lead_ids) >= 2:
    r = requests.post(f"{BASE}/api/leads/{lead_ids[1]}/convert", headers=h(tokens["sales1"]))
    log(f"  Convert lead to client: {r.status_code}")

# === CLIENTS ===
log("\n=== CLIENTS ===")
client_ids = []
for cd in [
    {"name": "Dan Wilson", "email": "dan@megacorp.com", "phone": "1231231234", "company": "MegaCorp", "address": "123 Main St"},
    {"name": "Eve Lee", "email": "eve@startupxyz.com", "phone": "3213214321", "company": "StartupXYZ", "address": "456 Oak Ave"},
]:
    r = requests.post(f"{BASE}/api/clients", json=cd, headers=h(tokens["sales1"]))
    log(f"  Create client '{cd['name']}': {r.status_code}")
    if r.status_code in (200, 201):
        client_ids.append(r.json().get("id"))

r = requests.get(f"{BASE}/api/clients", headers=h(tokens["sales1"]))
log(f"  List clients (sales1): {r.status_code} total={safe_total(r)}")

# === TASKS ===
log("\n=== TASKS ===")
task_ids = []
for td in [
    {"title": "Follow up with TechCorp", "description": "Schedule a demo call", "due_date": "2026-03-10"},
    {"title": "Prepare proposal for DataSoft", "description": "Create pricing", "due_date": "2026-03-15"},
    {"title": "Review CloudNet requirements", "description": "Analyze needs", "due_date": "2026-03-20"},
]:
    r = requests.post(f"{BASE}/api/tasks", json=td, headers=h(tokens["sales1"]))
    log(f"  Create task '{td['title']}': {r.status_code}")
    if r.status_code in (200, 201):
        task_ids.append(r.json().get("id"))

if task_ids:
    r = requests.put(f"{BASE}/api/tasks/{task_ids[0]}", json={"status": "Completed"}, headers=h(tokens["sales1"]))
    log(f"  Complete task: {r.status_code}")

r = requests.get(f"{BASE}/api/tasks", headers=h(tokens["sales1"]))
log(f"  List tasks (sales1): {r.status_code} total={safe_total(r)}")

# === FOLLOW-UPS ===
log("\n=== FOLLOW-UPS ===")
if lead_ids:
    for fu in [
        {"lead_id": lead_ids[0], "scheduled_date": "2026-03-08", "notes": "Call Alice"},
        {"lead_id": lead_ids[-1], "scheduled_date": "2026-03-12", "notes": "Email pricing"},
    ]:
        r = requests.post(f"{BASE}/api/follow-ups", json=fu, headers=h(tokens["sales1"]))
        log(f"  Create follow-up: {r.status_code}")

r = requests.get(f"{BASE}/api/follow-ups", headers=h(tokens["sales1"]))
log(f"  List follow-ups: {r.status_code} total={safe_total(r)}")

# === LEAVES ===
log("\n=== LEAVES ===")
r = requests.post(f"{BASE}/api/leaves", json={"from_date": "2026-03-10T00:00:00", "to_date": "2026-03-12T00:00:00", "reason": "Personal work"}, headers=h(tokens["sales1"]))
log(f"  Apply leave (sales1): {r.status_code}")
leave_id = r.json().get("id") if r.status_code in (200, 201) else None

r = requests.post(f"{BASE}/api/leaves", json={"from_date": "2026-03-15T00:00:00", "to_date": "2026-03-15T00:00:00", "reason": "Sick"}, headers=h(tokens["sales2"]))
log(f"  Apply leave (sales2): {r.status_code}")

if leave_id:
    r = requests.post(f"{BASE}/api/leaves/{leave_id}/approve", json={"status": "Approved"}, headers=h(tokens["manager1"]))
    log(f"  Approve leave: {r.status_code}")

r = requests.get(f"{BASE}/api/leaves", headers=h(tokens["manager1"]))
log(f"  List leaves (manager1): {r.status_code} total={safe_total(r)}")

# === DASHBOARDS ===
log("\n=== DASHBOARDS ===")
for name, url in [
    ("Sales", f"{BASE}/api/leads/dashboard"),
    ("Manager", f"{BASE}/api/manager/dashboard"),
    ("MD", f"{BASE}/api/md/dashboard"),
    ("Admin", f"{BASE}/api/admin/dashboard"),
]:
    role = name.lower() if name.lower() in tokens else "admin"
    r = requests.get(url, headers=h(tokens.get(role, tokens["admin"])))
    log(f"  {name} dashboard: {r.status_code}")

# === ADMIN ===
log("\n=== ADMIN FEATURES ===")
for name, url in [
    ("Teams", f"{BASE}/api/admin/teams"),
    ("Users", f"{BASE}/api/admin/users"),
    ("Hierarchy", f"{BASE}/api/admin/hierarchy"),
    ("Audit Log", f"{BASE}/api/admin/audit-log"),
    ("Settings", f"{BASE}/api/admin/settings"),
]:
    r = requests.get(url, headers=h(tokens["admin"]))
    log(f"  {name}: {r.status_code}")

output = "\n".join(RESULTS)
with open("test_results.txt", "w") as f:
    f.write(output)
log("\n=== ALL TESTS COMPLETE ===")
