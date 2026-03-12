import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app.database import SessionLocal
from app.models.invite import Invite
from app.models.user import User

def check_latest_state():
    db = SessionLocal()
    with open("diag_out.txt", "w") as f:
        try:
            invites = db.query(Invite).order_by(Invite.id.desc()).limit(3).all()
            f.write("--- LATEST INVITES ---\n")
            for inv in invites:
                f.write(f"ID: {inv.id}, Email: {inv.email}, Status: {inv.status}, Token: {inv.token[:10]}...\n")

            users = db.query(User).order_by(User.id.desc()).limit(5).all()
            f.write("\n--- LATEST USERS ---\n")
            for u in users:
                f.write(f"ID: {u.id}, Email: {u.email}, Role: {u.role}, Status: {u.status}, Company: {u.company_id}\n")

        except Exception as e:
            f.write(f"Error: {e}\n")
        finally:
            db.close()

if __name__ == "__main__":
    check_latest_state()
