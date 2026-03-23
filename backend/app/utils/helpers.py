import string
import random
from sqlalchemy.orm import Session
from app.models.company import Company

def generate_company_code(db: Session, length: int = 3) -> str:
    """Generate a unique alphanumeric code for a company."""
    chars = string.ascii_uppercase + string.digits
    
    for _ in range(10):  # Try 10 times to avoid infinite loops
        code = ''.join(random.choices(chars, k=length))
        # Check if the code is unique
        existing = db.query(Company).filter(Company.company_code == code).first()
        if not existing:
            return code
            
    # Fallback if extremely collision-heavy (unlikely with 3 chars but just in case)
    import time
    return (str(int(time.time()))[-2:] + random.choice(chars)).upper()
