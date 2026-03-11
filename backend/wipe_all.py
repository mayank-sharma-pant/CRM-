from app.database import SessionLocal
from app.models.company import Company
from app.models.user import User
from app.models.team import Team
from app.models.lead import Lead
from app.models.task import Task
from app.models.client import Client
from app.models.invoice import Invoice
from app.models.leave_request import LeaveRequest
from app.models.ledger import LedgerEntry
from app.models.audit import AuditLog
from app.models.note import Note
from app.models.follow_up import FollowUp
from app.models.invite import Invite
from app.models.company_settings import CompanySettings

def wipe():
    print("Connecting to DB...")
    db = SessionLocal()
    
    print("Wiping tables...")
    try:
        db.query(LeaveRequest).delete(synchronize_session=False)
        db.query(LedgerEntry).delete(synchronize_session=False)
        db.query(AuditLog).delete(synchronize_session=False)
        db.query(Invite).delete(synchronize_session=False)
        db.query(FollowUp).delete(synchronize_session=False)
        db.query(Note).delete(synchronize_session=False)
        db.query(Invoice).delete(synchronize_session=False)
        
        # Avoid foreign key constraint issues
        db.query(User).update({'manager_id': None, 'team_id': None}, synchronize_session=False)
        
        db.query(Task).delete(synchronize_session=False)
        db.query(Client).delete(synchronize_session=False)
        db.query(Lead).delete(synchronize_session=False)
        db.query(Team).delete(synchronize_session=False)
        
        # Delete all users EXCEPT the platform admin (who has no company)
        db.query(User).filter(User.company_id.isnot(None)).delete(synchronize_session=False)
        
        db.query(CompanySettings).delete(synchronize_session=False)
        db.query(Company).delete(synchronize_session=False)
        
        db.commit()
        print("Database wiped successfully. Only the platform admin remains.")
    except Exception as e:
        db.rollback()
        print(f"Error wiping database: {e}")
    finally:
        db.close()

if __name__ == '__main__':
    wipe()
