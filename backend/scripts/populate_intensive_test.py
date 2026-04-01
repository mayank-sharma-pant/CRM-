import sys
import os
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session

# Add the backend directory to sys.path to allow imports from 'app'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, engine
from app.models.core.company import Company
from app.models.core.user import User
from app.models.core.team import Team
from app.models.core.team_membership import TeamMembership
from app.models.core.enums import (
    UserRole, UserStatus, CompanyStatus, LeadStatus, 
    InvoiceStatus, TaskStatus, TaskPriority
)
from app.models.sales.lead import Lead
from app.models.sales.client import Client
from app.models.sales.task import Task
from app.models.finance.invoice import Invoice, InvoiceItem
from app.utils.security import get_password_hash

def populate():
    db: Session = SessionLocal()
    try:
        print("Starting Intensive Test Data Population...")
        
        # 1. Create Company
        company = Company(
            name="Titan Industries",
            company_code="TTN",
            status=CompanyStatus.ACTIVE,
            plan="Enterprise"
        )
        db.add(company)
        db.flush()
        print(f"Created Company: {company.name} (ID: {company.id})")

        # 2. Create Users
        password_hash = get_password_hash("admin123")
        
        md = User(
            email="md@titan.com",
            full_name="Mayank MD",
            hashed_password=password_hash,
            role=UserRole.MD,
            status=UserStatus.ACTIVE,
            company_id=company.id
        )
        manager = User(
            email="manager@titan.com",
            full_name="Sarah Manager",
            hashed_password=password_hash,
            role=UserRole.MANAGER,
            status=UserStatus.ACTIVE,
            company_id=company.id
        )
        sales1 = User(
            email="sales1@titan.com",
            full_name="Alex Sales",
            hashed_password=password_hash,
            role=UserRole.SALES,
            status=UserStatus.ACTIVE,
            company_id=company.id
        )
        sales2 = User(
            email="sales2@titan.com",
            full_name="Jordan Sales",
            hashed_password=password_hash,
            role=UserRole.SALES,
            status=UserStatus.ACTIVE,
            company_id=company.id
        )
        
        db.add_all([md, manager, sales1, sales2])
        db.flush()
        print("Created Users: MD, Manager, Sales1, Sales2")

        # 3. Create Team
        team = Team(
            name="Alpha Performance Squad",
            company_id=company.id
        )
        db.add(team)
        db.flush()
        print(f"Created Team: {team.name}")

        # 4. Add Memberships
        for u in [md, manager, sales1, sales2]:
            db.add(TeamMembership(company_id=company.id, team_id=team.id, user_id=u.id))
        
        print("Linked Users to Team")

        # 5. Create Leads (Spread over last 7 days)
        now = datetime.now(timezone.utc)
        leads_data = [
            ("Global Tech Solutions", "John Doe", LeadStatus.CONVERTED, sales1.id, 6),
            ("Precision Engineering", "Jane Smith", LeadStatus.CONVERTED, sales2.id, 5),
            ("Skyline Architects", "Bob Builder", LeadStatus.QUALIFIED, sales1.id, 4),
            ("Nova Retail", "Alice Wonder", LeadStatus.CONTACTED, sales2.id, 3),
            ("Eco Systems", "Charlie Brown", LeadStatus.NEW, sales1.id, 1),
        ]
        
        leads = []
        for corp, contact, status, owner_id, days_ago in leads_data:
            created_at = now - timedelta(days=days_ago)
            lead = Lead(
                company_id=company.id,
                name=contact,
                company=corp,
                status=status,
                assigned_to_id=owner_id,
                team_id=team.id,
                created_at=created_at,
                converted_at=created_at + timedelta(days=2) if status == LeadStatus.CONVERTED else None
            )
            db.add(lead)
            leads.append(lead)
        
        db.flush()
        print(f"Created {len(leads)} Leads with historical dates")

        # 6. Create Clients (for Converted Leads)
        clients = []
        for lead in leads:
            if lead.status == LeadStatus.CONVERTED:
                client = Client(
                    company_id=company.id,
                    name=lead.name,
                    company=lead.company,
                    email=f"{lead.name.lower().replace(' ', '.')}@example.com",
                    assigned_to_id=lead.assigned_to_id,
                    team_id=team.id,
                    converted_from_lead_id=lead.id,
                    created_at=lead.converted_at
                )
                db.add(client)
                clients.append(client)
        
        db.flush()
        print(f"Converted {len(clients)} Leads to Clients")

        # 7. Create Tasks
        for lead in leads:
            db.add(Task(
                company_id=company.id,
                title=f"Follow up with {lead.name}",
                status=TaskStatus.COMPLETED if lead.status == LeadStatus.CONVERTED else TaskStatus.PENDING,
                priority=TaskPriority.HIGH,
                lead_id=lead.id,
                assigned_to_id=lead.assigned_to_id,
                due_date=now + timedelta(days=1)
            ))
        print("Created Tasks for all leads")

        # 8. Create Invoices (Revenue)
        # Client 0 (John Doe): 1 Paid, 1 Pending, 1 Overdue
        inv1 = Invoice(
            company_id=company.id,
            invoice_number="INV-TTN-001",
            client_id=clients[0].id,
            total=50000,
            status=InvoiceStatus.PAID,
            created_by_id=sales1.id,
            created_at=now - timedelta(days=4),
            paid_date=(now - timedelta(days=1)).date()
        )
        inv2 = Invoice(
            company_id=company.id,
            invoice_number="INV-TTN-002",
            client_id=clients[0].id,
            total=25000,
            status=InvoiceStatus.PENDING,
            created_by_id=sales1.id,
            created_at=now - timedelta(days=2),
            due_date=(now + timedelta(days=10)).date()
        )
        inv3 = Invoice(
            company_id=company.id,
            invoice_number="INV-TTN-003",
            client_id=clients[0].id,
            total=15000,
            status=InvoiceStatus.OVERDUE,
            created_by_id=sales1.id,
            created_at=now - timedelta(days=20),
            due_date=(now - timedelta(days=5)).date()
        )
        
        # Client 1 (Jane Smith): 2 Paid
        inv4 = Invoice(
            company_id=company.id,
            invoice_number="INV-TTN-004",
            client_id=clients[1].id,
            total=40000,
            status=InvoiceStatus.PAID,
            created_by_id=sales2.id,
            created_at=now - timedelta(days=3),
            paid_date=(now - timedelta(days=1)).date()
        )
        inv5 = Invoice(
            company_id=company.id,
            invoice_number="INV-TTN-005",
            client_id=clients[1].id,
            total=40000,
            status=InvoiceStatus.PAID,
            created_by_id=sales2.id,
            created_at=now - timedelta(days=1),
            paid_date=now.date()
        )
        
        db.add_all([inv1, inv2, inv3, inv4, inv5])
        db.commit()
        print("Generated Revenue: ₹1,30,000 Paid, ₹25,000 Pending, ₹15,000 Overdue")
        print("--- POPULATION COMPLETE ---")
        print(f"MD Login: md@titan.com / admin123")
        print(f"Manager Login: manager@titan.com / admin123")

    except Exception as e:
        db.rollback()
        print(f"Error during population: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    populate()
