import os
import sys

sys.path.append(os.getcwd())
from app.database import SessionLocal
from app.models.core.user import User

db = SessionLocal()
users = db.query(User).all()
for u in users:
    print(f"Name: {u.full_name}, Role: {u.role}")
