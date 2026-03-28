from app.database import SessionLocal
from app.models.core.invite import Invite
from app.models.core.user import User

db = SessionLocal()

print("--- INVITES ---")
invites = db.query(Invite).filter(Invite.email == "mayanksharmarrk30@gmail.com").all()
for inv in invites:
    print(f"Token: {inv.token}, Status: {inv.status}, Hashed Password: {bool(inv.hashed_password)}, Expires: {inv.expires_at}")

print("\n--- USERS ---")
users = db.query(User).filter(User.email == "mayanksharmarrk30@gmail.com").all()
for u in users:
    print(f"User ID: {u.id}, Email: {u.email}, Role: {u.role}, Status: {u.status}")

db.close()
