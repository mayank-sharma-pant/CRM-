from app.database import SessionLocal
from app.models.core.user import User
from app.models.core.team_membership import TeamMembership
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def fix_memberships():
    db = SessionLocal()
    try:
        # Find all users who have a team_id but no entry in team_memberships for that team
        users = db.query(User).filter(User.team_id != None).all()
        
        repaired_count = 0
        for user in users:
            # Check if membership already exists
            membership = db.query(TeamMembership).filter(
                TeamMembership.user_id == user.id,
                TeamMembership.team_id == user.team_id
            ).first()
            
            if not membership:
                logger.info(f"Creating missing TeamMembership for user {user.email} (ID: {user.id}) in team {user.team_id}")
                new_membership = TeamMembership(
                    company_id=user.company_id,
                    team_id=user.team_id,
                    user_id=user.id
                )
                db.add(new_membership)
                repaired_count += 1
        
        db.commit()
        logger.info(f"Successfully repaired {repaired_count} memberships.")
    except Exception as e:
        logger.error(f"Error during repair: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    fix_memberships()
