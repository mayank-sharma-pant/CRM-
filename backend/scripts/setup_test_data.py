"""
Setup test data for the CRM.
Creates company with admin, then: 1 MD, 2 Managers, 2 Teams, 5 Employees (1 in both teams).
"""
import sys
import os
import httpx

sys.path.append(os.path.dirname(os.path.dirname(__file__)))

BASE_URL = "http://localhost:8000/api"
ADMIN_EMAIL = "mayanksharmarrk01@gmail.com"
ADMIN_PASSWORD = "Mayank@admin@30"
COMPANY_NAME = "Perioxia"
TEST_PASSWORD = "TestUser@123"

http = httpx.Client(timeout=30.0)


def step(msg):
    print(f"\n{'-' * 50}")
    print(f"  {msg}")
    print(f"{'-' * 50}")


def signup_admin():
    """Register the admin user + company via signup."""
    resp = http.post(f"{BASE_URL}/auth/signup", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD,
        "full_name": "Mayank Sharma",
        "company_name": COMPANY_NAME,
    })
    if resp.status_code == 400 and "already registered" in resp.text:
        print(f"[SKIP] Admin email already registered")
        return None
    if resp.status_code not in (200, 201):
        print(f"[FAIL] Signup: {resp.status_code} {resp.text}")
        return None
    data = resp.json()
    print(f"[OK] Signed up: {data['user']['full_name']} (company_id={data['user']['company_id']}, status=pending)")
    return data


def approve_company_in_db():
    """Directly approve the company and activate the admin user in the DB."""
    from app.database import SessionLocal
    from app.models.core.user import User
    from app.models.core.company import Company

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == ADMIN_EMAIL).first()
        if not user:
            print(f"[FAIL] User {ADMIN_EMAIL} not found in DB")
            return False

        company = db.query(Company).filter(Company.id == user.company_id).first()
        if not company:
            print(f"[FAIL] Company not found")
            return False

        if str(company.status) != "CompanyStatus.ACTIVE" and company.status != "active":
            company.status = "active"
            print(f"[OK] Company '{company.name}' (id={company.id}) -> ACTIVE")
        else:
            print(f"[SKIP] Company '{company.name}' already active")

        if str(user.status) != "UserStatus.ACTIVE" and user.status != "active":
            user.status = "active"
            user.is_active = True
            print(f"[OK] Admin user -> ACTIVE")
        else:
            print(f"[SKIP] Admin user already active")

        db.commit()
        return True
    finally:
        db.close()


def login_admin():
    """Login as the company admin."""
    resp = http.post(f"{BASE_URL}/auth/login", data={
        "username": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD,
    })
    if resp.status_code != 200:
        print(f"[FAIL] Login: {resp.status_code} {resp.text}")
        sys.exit(1)
    data = resp.json()
    token = data["access_token"]
    http.headers["Authorization"] = f"Bearer {token}"
    http.cookies.set("access_token", token)
    print(f"[OK] Logged in as: {data['user']['full_name']} (role={data['user']['role']})")
    return data


def create_team(name):
    """Create a team."""
    resp = http.post(f"{BASE_URL}/admin/teams", json={"name": name})
    if resp.status_code == 400 and "already exists" in resp.text:
        teams = http.get(f"{BASE_URL}/admin/teams").json().get("teams", [])
        for t in teams:
            if t["name"] == name:
                print(f"[SKIP] Team '{name}' exists (id={t['id']})")
                return t["id"]
    if resp.status_code not in (200, 201):
        print(f"[FAIL] Create team '{name}': {resp.status_code} {resp.text}")
        return None
    data = resp.json()
    print(f"[OK] Team '{name}' created (id={data['id']})")
    return data["id"]


def invite_and_accept(email, full_name, role, team_id=None):
    """Invite a user then accept the invite immediately."""
    # Invite
    payload = {"email": email, "full_name": full_name, "role": role, "phone": "+1234567890"}
    if team_id:
        payload["team_id"] = team_id

    resp = http.post(f"{BASE_URL}/admin/invites", json=payload)
    if resp.status_code == 400 and "already exists" in resp.text:
        print(f"[SKIP] {email} already exists")
        return find_user_id(email)
    if resp.status_code not in (200, 201):
        print(f"[FAIL] Invite {email}: {resp.status_code} {resp.text}")
        return None
    print(f"[OK] Invited {full_name} ({email}) as {role}")

    # Get invite token from DB
    from app.database import SessionLocal
    from app.models.core.invite import Invite, InviteStatus

    db = SessionLocal()
    try:
        invite = db.query(Invite).filter(
            Invite.email == email, Invite.status == InviteStatus.PENDING
        ).first()
        if not invite:
            print(f"[FAIL] No pending invite found for {email}")
            return None
        token = invite.token
    finally:
        db.close()

    # Accept
    resp2 = httpx.post(f"{BASE_URL}/auth/accept-invite/{token}",
                       json={"password": TEST_PASSWORD}, timeout=30.0)
    if resp2.status_code not in (200, 201):
        print(f"[FAIL] Accept {email}: {resp2.status_code} {resp2.text}")
        return None
    user_data = resp2.json()["user"]
    print(f"[OK] Account created: {full_name} (id={user_data['id']}, role={user_data['role']})")
    return user_data["id"]


def add_to_team(team_id, user_id):
    """Add user to a team."""
    resp = http.post(f"{BASE_URL}/admin/teams/{team_id}/members",
                     json={"user_id": user_id})
    msg = resp.json().get("message", resp.text)
    if resp.status_code in (200, 201):
        print(f"[OK] {msg}")
    else:
        print(f"[FAIL] {msg}")


def find_user_id(email):
    """Find user ID from admin users list."""
    resp = http.get(f"{BASE_URL}/admin/users")
    if resp.status_code == 200:
        for u in resp.json().get("users", []):
            if u["email"] == email:
                return u["user_id"]
    return None


def verify_setup():
    """Print final state."""
    teams = http.get(f"{BASE_URL}/admin/teams").json().get("teams", [])
    users = http.get(f"{BASE_URL}/admin/users").json().get("users", [])

    print(f"\n  Teams ({len(teams)}):")
    for t in teams:
        mgr_name = t["manager"]["name"] if t.get("manager") else "-"
        print(f"    * {t['name']} | {t['member_count']} members | Manager: {mgr_name}")

    print(f"\n  Users ({len(users)}):")
    for u in sorted(users, key=lambda x: x["role"]):
        print(f"    [{u['role']:>10}]  {u['name']:<20}  {u['email']:<30}  team={u.get('team') or '-'}")

    # Check team details for shared member
    for t in teams:
        detail = http.get(f"{BASE_URL}/admin/teams/{t['id']}").json()
        members = [m["name"] for m in detail.get("members", [])]
        print(f"\n  {t['name']} members: {', '.join(members)}")


def main():
    print("=" * 60)
    print("  CRM Test Data Setup")
    print("=" * 60)

    # 1. Signup
    step("1. Register Admin Account")
    signup_admin()

    # 2. Approve company
    step("2. Approve Company & Activate Admin")
    approve_company_in_db()

    # 3. Login
    step("3. Login as Admin")
    login_admin()

    # 4. Create teams
    step("4. Create Teams")
    t1 = create_team("Alpha Squad")
    t2 = create_team("Bravo Force")
    if not t1 or not t2:
        print("[FATAL] Teams failed"); sys.exit(1)

    # 5. Create users
    step("5. Create Users (invite + accept)")

    md_id = invite_and_accept("md@perioxia.com", "Rajesh Kumar", "md")
    mgr1_id = invite_and_accept("mgr1@perioxia.com", "Priya Sharma", "manager", t1)
    mgr2_id = invite_and_accept("mgr2@perioxia.com", "Amit Patel", "manager", t2)
    emp1_id = invite_and_accept("emp1@perioxia.com", "Neha Gupta", "sales", t1)
    emp2_id = invite_and_accept("emp2@perioxia.com", "Vikram Singh", "sales", t1)
    emp3_id = invite_and_accept("emp3@perioxia.com", "Ananya Reddy", "sales", t2)
    emp4_id = invite_and_accept("emp4@perioxia.com", "Rohit Mehra", "sales", t2)
    emp5_id = invite_and_accept("emp5@perioxia.com", "Kavya Nair", "sales", t1)

    # 6. Add Kavya to team 2 as well
    step("6. Add Kavya Nair to BOTH teams")
    if emp5_id:
        add_to_team(t2, emp5_id)

    # 7. Verify
    step("7. Verification")
    verify_setup()

    # Summary
    print("\n" + "=" * 60)
    print("  [OK] SETUP COMPLETE")
    print("=" * 60)
    print(f"""
  Admin:    {ADMIN_EMAIL} / {ADMIN_PASSWORD}
  MD:       md@perioxia.com / {TEST_PASSWORD}
  Manager1: mgr1@perioxia.com / {TEST_PASSWORD}  (Alpha Squad)
  Manager2: mgr2@perioxia.com / {TEST_PASSWORD}  (Bravo Force)

  Emp1: emp1@perioxia.com  (Alpha Squad)
  Emp2: emp2@perioxia.com  (Alpha Squad)
  Emp3: emp3@perioxia.com  (Bravo Force)
  Emp4: emp4@perioxia.com  (Bravo Force)
  Emp5: emp5@perioxia.com  (Alpha + Bravo) <- shared

  All test user password: {TEST_PASSWORD}
""")


if __name__ == "__main__":
    main()
