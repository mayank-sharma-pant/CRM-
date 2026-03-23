import os
import sys

# Ensure app path is available
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models.company import Company
from app.utils.helpers import generate_company_code

def run_backfill():
    db = SessionLocal()
    try:
        companies = db.query(Company).filter(Company.company_code == None).all()
        for c in companies:
            c.company_code = generate_company_code(db)
            print(f"Company {c.id} ({c.name}) assigned code: {c.company_code}")
        db.commit()
        print(f"Backfilled {len(companies)} companies.")
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run_backfill()
