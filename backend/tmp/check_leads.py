import os
import sys

sys.path.append(os.getcwd())
from app.database import SessionLocal
from app.models.sales.lead import Lead

db = SessionLocal()
leads = db.query(Lead).all()
print(f"Total leads: {len(leads)}")
for l in leads[-5:]:
    print(f"ID: {l.id}, Name: {l.name}, Status: '{l.status}'")
