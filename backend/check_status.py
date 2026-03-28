from app.database import SessionLocal
from app.models.core.user import User
from app.models.core.company import Company

db = SessionLocal()
admin = db.query(User).filter(User.email == 'mayanksharmarrk07@gmail.com').first()
if admin:
    print(f"Admin: {admin.email}, Role: {admin.role}, Status: {admin.status}, Company ID: {admin.company_id}")
    if admin.company_id:
        company = db.query(Company).filter(Company.id == admin.company_id).first()
        if company:
            print(f"Company: {company.name}, Status: {company.status}")
        else:
            print("Company not found")
else:
    print("Admin not found")

manager = db.query(User).filter(User.email == 'mayanksharmarrk30@gmail.com').first()
if manager:
    print(f"Manager: {manager.email}, Role: {manager.role}, Status: {manager.status}, Company ID: {manager.company_id}")
    if manager.company_id:
        company = db.query(Company).filter(Company.id == manager.company_id).first()
        if company:
            print(f"Company: {company.name}, Status: {company.status}")

db.close()
