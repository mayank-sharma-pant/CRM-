import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import SessionLocal, engine
from sqlalchemy import text

def wipe_db():
    db = SessionLocal()
    try:
        print("Starting database wipe (preserving crm_admin)...")
        # List of tables to truncate/delete
        tables = [
            "audit_logs",
            "otp_codes",
            "invites",
            "invoice_items",
            "invoices",
            "follow_ups",
            "notes",
            "tasks",
            "clients",
            "leads",
            "company_settings"
        ]
        
        for table in tables:
            print(f"Clearing {table}...")
            db.execute(text(f"DELETE FROM {table}"))
            
        print("Clearing teams and users (except crm_admin)...")
        # Update users to remove manager/team references first to avoid foreign key errors
        db.execute(text("UPDATE users SET manager_id = NULL, team_id = NULL"))
        # Delete non-admin users or users not named crm_admin
        db.execute(text("DELETE FROM users WHERE email != 'mayanksharmarrk01@gmail.com'"))
        
        # Clear teams and companies
        db.execute(text("DELETE FROM teams"))
        # Only delete companies if they are not linked to the admin (wait, platform admin has no company)
        db.execute(text("DELETE FROM companies"))
        
        db.commit()
        print("Database wiped successfully. Only Platform Admin remains.")
    except Exception as e:
        db.rollback()
        print(f"Error wiping database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    wipe_db()
