"""Seed a Platform Admin user into the database."""
import sys
import os

# Ensure the backend directory is on the path
sys.path.insert(0, os.path.dirname(__file__))

from app.database import engine, SessionLocal, Base
from app.models import *  # import all models so tables are created
from app.utils.security import get_password_hash

def seed():
    # Create all tables
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # Check if platform admin already exists
        existing = db.query(User).filter(User.email == "platform@admin.com").first()
        if existing:
            print("Platform admin already exists!")
            return

        admin = User(
            email="platform@admin.com",
            full_name="Platform Admin",
            hashed_password=get_password_hash("Admin@123"),
            role="admin",
            company_id=None,  # Platform admin has no company
            status="active",
            is_active=True,
        )
        db.add(admin)
        db.commit()
        print("Platform admin created!")
        print("  Email: platform@admin.com")
        print("  Password: Admin@123")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
