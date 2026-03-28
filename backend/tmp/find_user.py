import os
import sys

# Add the current directory to sys.path
sys.path.append(os.getcwd())

from app.database import SessionLocal
from app.models.core.user import User

def check_user(email):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if user:
            print(f"User found: {user.full_name}")
            print(f"Email: {user.email}")
            print(f"Role: {user.role}")
            print(f"Status: {user.status}")
            print(f"Company ID: {user.company_id}")
            print(f"Is Active: {user.is_active}")
        else:
            print(f"User with email '{email}' not found.")
            
            # Also list recent users to see if there's a typo
            print("\nRecent 10 users in database:")
            all_users = db.query(User).order_by(User.id.desc()).limit(10).all()
            for u in all_users:
                print(f"- {u.email} ({u.role})")
    finally:
        db.close()

if __name__ == "__main__":
    email_to_check = "mayanksharmarrk23@gmail.com"
    check_user(email_to_check)
