"""Debug: Check all users and invites, write to file."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal
from app.models.user import User
from app.models.invite import Invite
from app.models.company import Company
from app.models.team import Team
from app.utils.security import verify_password

db = SessionLocal()

lines = []

lines.append("=== COMPANIES ===")
for c in db.query(Company).all():
    lines.append(f"  id={c.id} name={c.name} status={c.status}")

lines.append("\n=== TEAMS ===")
for t in db.query(Team).all():
    lines.append(f"  id={t.id} name={t.name} company_id={t.company_id}")

lines.append("\n=== USERS ===")
for u in db.query(User).all():
    pwd_ok = verify_password("User@1234", u.hashed_password)
    admin_ok = verify_password("Admin@123", u.hashed_password)
    lines.append(f"  id={u.id} email={u.email} role={u.role} status={u.status} company={u.company_id} team={u.team_id} pwd_User={pwd_ok} pwd_Admin={admin_ok}")

lines.append("\n=== INVITES ===")
for i in db.query(Invite).all():
    lines.append(f"  id={i.id} email={i.email} role={i.role} status={i.status}")

db.close()

output = "\n".join(lines)
print(output)
with open("debug_output.txt", "w") as f:
    f.write(output)
