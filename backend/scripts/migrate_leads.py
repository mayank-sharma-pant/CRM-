from app.database import SessionLocal
from app.models.sales.lead import Lead

def migrate_lead_statuses():
    db = SessionLocal()
    try:
        # Mapping for streamlining statuses
        # Active: New, Contacted, Qualified, Proposal
        # Lost: Lost, Lost Client
        
        # 1. Update Active statuses
        active_count = db.query(Lead).filter(Lead.status.in_(["New", "Contacted", "Qualified", "Proposal"])).update(
            {Lead.status: "Active"}, synchronize_session=False
        )
        
        # 2. Update Lost statuses
        lost_count = db.query(Lead).filter(Lead.status.in_(["Lost Client"])).update(
            {Lead.status: "Lost"}, synchronize_session=False
        )
        
        db.commit()
        print(f"Migration completed:")
        print(f" - {active_count} leads migrated to 'Active'")
        print(f" - {lost_count} leads migrated to 'Lost'")
    except Exception as e:
        db.rollback()
        print(f"Error during migration: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    migrate_lead_statuses()
