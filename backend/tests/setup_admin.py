#!/usr/bin/env python3
"""
Setup CRM Platform Admin account.
Run: cd /home/mayank/CRM-/backend && .venv/bin/python tests/setup_admin.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, engine, Base
from app.models import *
from app.utils.security import get_password_hash
from sqlalchemy import text

# Create tables if needed
Base.metadata.create_all(bind=engine)

db = SessionLocal()

EMAIL = "mayanksharmarrk01@gmail.com"
PASSWORD = "Mayank@admin@30"

# Check if already exists
existing = db.query(User).filter(User.email == EMAIL).first()
if existing:
    print(f"⚠  User {EMAIL} already exists (id={existing.id}, role={existing.role})")
    print("   Updating password and ensuring platform admin role...")
    existing.hashed_password = get_password_hash(PASSWORD)
    existing.role = "admin"
    existing.is_active = True
    existing.company_id = None  # Platform admin = no company
    db.commit()
    print(f"✓  Updated successfully")
else:
    user = User(
        full_name="Mayank Sharma",
        email=EMAIL,
        hashed_password=get_password_hash(PASSWORD),
        role="admin",
        is_active=True,
        company_id=None,  # Platform admin = no company_id
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    print(f"✓  Platform Admin created (id={user.id})")

# Fix sequence so next INSERT doesn't collide
try:
    db.execute(text("SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 0) + 1, false)"))
    db.execute(text("SELECT setval('companies_id_seq', COALESCE((SELECT MAX(id) FROM companies), 0) + 1, false)"))
    db.commit()
    print("✓  Sequences synced")
except Exception:
    db.rollback()

print(f"\n   Email:    {EMAIL}")
print(f"   Password: {PASSWORD}")
print(f"   Login at: http://localhost:3000/platform/login")
print()

db.close()
