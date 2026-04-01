import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models.core.company import Company
from app.models.core.user import User
from app.models.core.team import Team
from app.models.sales.lead import Lead
from app.models.sales.client import Client
from app.models.finance.invoice import Invoice

db = SessionLocal()
try:
    print("--- TITAN INDUSTRIES CHECK ---")
    company = db.query(Company).filter(Company.name == "Titan Industries").first()
    if company:
        print(f"Company Found: {company.name} (ID: {company.id})")
        users = db.query(User).filter(User.company_id == company.id).all()
        print(f"Users: {len(users)}")
        for u in users:
            print(f" - {u.full_name} ({u.role})")
        
        teams = db.query(Team).filter(Team.company_id == company.id).all()
        print(f"Teams: {len(teams)}")
        
        leads = db.query(Lead).filter(Lead.company_id == company.id).all()
        print(f"Leads: {len(leads)}")
        
        clients = db.query(Client).filter(Client.company_id == company.id).all()
        print(f"Clients: {len(clients)}")
        
        invoices = db.query(Invoice).filter(Invoice.company_id == company.id).all()
        print(f"Invoices: {len(invoices)}")
        paid = sum(inv.total for inv in invoices if inv.status == "Paid")
        print(f"Total Paid Revenue: Rs. {paid:,.2f}")
    else:
        print("Company 'Titan Industries' not found.")
finally:
    db.close()
