import os
import sys

# Add the current directory to sys.path
sys.path.append(os.getcwd())

from app.database import SessionLocal
from app.models.core.invite import Invite

def check_invite_to_file(email):
    db = SessionLocal()
    try:
        invite = db.query(Invite).filter(Invite.email == email).first()
        with open("tmp/invite_info.txt", "w") as f:
            if invite:
                f.write(f"Invite found for {email}:\n")
                f.write(f"- Status: {invite.status}\n")
                f.write(f"- Role: {invite.role}\n")
                f.write(f"- Token: {invite.token}\n")
                f.write("\nUser does NOT exist yet. The invite needs to be accepted.\n")
                f.write(f"Link: http://localhost:3000/accept-invite?token={invite.token}\n")
            else:
                f.write(f"No invite found for email '{email}'\n")
    finally:
        db.close()

if __name__ == "__main__":
    email_to_check = "mayanksharmarrk23@gmail.com"
    check_invite_to_file(email_to_check)
