import os
import sys

# Add the project directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import SessionLocal, engine
from app.models.user import User
from sqlalchemy import text

def wipe_db():
    print("Starting database wipe (PostgreSQL CASCADE Mode)...")
    db = SessionLocal()
    try:
        # 1. Save Platform Admins
        admins = db.query(User).filter(User.role == "admin", User.company_id == None).all()
        admin_data = []
        for a in admins:
            print(f"Saving Admin: {a.email}")
            admin_data.append({
                "email": a.email,
                "full_name": a.full_name,
                "hashed_password": a.hashed_password,
                "role": a.role,
                "status": "active",
                "is_active": True
            })

        # 2. Get all table names from metadata
        # Excluding alembic_version
        from sqlalchemy import inspect
        inspector = inspect(engine)
        tables = [t for t in inspector.get_table_names() if t != 'alembic_version']
        
        # 3. Truncate all tables with CASCADE
        if tables:
            print(f"Truncating tables: {', '.join(tables)}")
            # TRUNCATE CASCADE handles all foreign keys automatically
            truncate_stmt = text(f"TRUNCATE TABLE {', '.join(tables)} RESTART IDENTITY CASCADE;")
            db.execute(truncate_stmt)
            print("Truncate complete.")

        # 4. Restore Admins
        print("Restoring Platform Admins...")
        for data in admin_data:
            new_admin = User(**data)
            db.add(new_admin)
        
        db.commit()
        print("SUCCESS: Database wiped. Platform admins restored.")
        
    except Exception as e:
        db.rollback()
        print(f"CRITICAL ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    wipe_db()
