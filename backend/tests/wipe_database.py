#!/usr/bin/env python3
"""
Wipe ALL data from the Neon database. Creates a clean slate.
Run: cd /home/mayank/CRM-/backend && .venv/bin/python tests/wipe_database.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.database import SessionLocal, engine

GREEN = "\033[92m"
RED = "\033[91m"
BOLD = "\033[1m"
RESET = "\033[0m"

print(f"\n{BOLD}{RED}⚠  DATABASE WIPE — ALL DATA WILL BE DELETED ⚠{RESET}\n")

db = SessionLocal()

# Order matters — delete child tables first to respect foreign keys
tables_to_clear = [
    "notifications",
    "audit_logs",
    "otp_codes",
    "leave_requests",
    "notes",
    "invoice_items",
    "invoices",
    "tasks",
    "follow_ups",
    "ledger_entries",
    "clients",
    "leads",
    "invites",
    "users",
    "teams",
    "company_settings",
    "companies",
]

for table in tables_to_clear:
    try:
        result = db.execute(text(f"DELETE FROM {table}"))
        count = result.rowcount
        db.commit()
        if count > 0:
            print(f"  {GREEN}✓{RESET} {table}: {count} rows deleted")
        else:
            print(f"  - {table}: empty")
    except Exception as e:
        db.rollback()
        print(f"  {RED}✗{RESET} {table}: {e}")

# Reset sequences
for table in tables_to_clear:
    try:
        db.execute(text(f"ALTER SEQUENCE IF EXISTS {table}_id_seq RESTART WITH 1"))
        db.commit()
    except:
        db.rollback()

db.close()

print(f"\n{BOLD}{GREEN}✓ Database wiped clean. All tables empty, sequences reset.{RESET}")
print(f"  You can now sign up fresh at http://localhost:3000\n")
