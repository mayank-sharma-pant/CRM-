from app.database import SessionLocal
from app.models.core.company import Company
from app.models.core.enums import CompanyStatus

db = SessionLocal()
company = db.query(Company).filter(Company.name == 'Chandigarh University').first()
if company:
    print(f"Type: {type(company.status)}")
    print(f"Value: {repr(company.status)}")
    if hasattr(company.status, 'value'):
        print(f"Inner Value: {repr(company.status.value)}")

    status_to_check = company.status
    print(f"Check 'active': {status_to_check == 'active'}")
    print(f"Check CompanyStatus.ACTIVE: {status_to_check == CompanyStatus.ACTIVE}")
    if hasattr(status_to_check, 'value'):
        print(f"Value check 'active': {status_to_check.value == 'active'}")

db.close()

