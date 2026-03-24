import sys
sys.path.append(r'd:\SunEdge\CRM\CRM-\backend')
from app.database import SessionLocal
from app.routers.md import get_md_dashboard, get_revenue_analytics, get_company_sales
from app.models.user import User

print("Starting test...")
db = SessionLocal()
try:
    md = db.query(User).filter(User.role == 'md').first()
    admin = db.query(User).filter(User.role == 'admin').first()
    user = md or admin or db.query(User).first()
    print(f"Testing with User: {getattr(user, 'email', None)} (Role: {getattr(user, 'role', None)})")
    
    if user:
        print("Testing Dashboard...")
        dash = get_md_dashboard(period='30d', db=db, current_user=user)
        print("Dashboard Success")
        
        print("Testing Revenue...")
        rev = get_revenue_analytics(period='30d', db=db, current_user=user)
        print("Revenue Success")
        
        print("Testing Sales...")
        sales = get_company_sales(period='30d', db=db, current_user=user)
        print("Sales Success")
        
except Exception as e:
    import traceback
    with open('out.txt', 'w', encoding='utf-8') as f:
        traceback.print_exc(file=f)
finally:
    db.close()
    print("Done test.")
