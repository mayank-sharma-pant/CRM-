import os
import sys

# Add the current directory to sys.path
sys.path.append(os.getcwd())

from app.database import SessionLocal
from app.models.core.invite import Invite
from app.models.core.user import User
from app.utils.security import verify_password
import json

def check_invite(email):
    db = SessionLocal()
    try:
        invite = db.query(Invite).filter(Invite.email == email).first()
        if invite:
            print(f"Invite found for {email}:")
            print(f"- Status: {invite.status}")
            print(f"- Role: {invite.role}")
            print(f"- Token: {invite.token}")
            
            # Check if there is an associated User
            user = db.query(User).filter(User.email == email).first()
            if user:
                print(f"\nUser already exists for this email with ID {user.id}")
            else:
                print("\nUser does NOT exist yet. The invite needs to be accepted.")
                print("To accept the invite, the user must navigate to:")
                print(f"http://localhost:3000/accept-invite?token={invite.token}")
        else:
            print(f"No invite found for email '{email}'")
    finally:
        db.close()

if __name__ == "__main__":
    email_to_check = "mayanksharmarrk23@gmail.com"
    check_invite(email_to_check)
