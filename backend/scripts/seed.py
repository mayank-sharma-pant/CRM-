"""
Database Seed Script
Creates initial sample data for the CRM application.
Run with: python -m scripts.seed
"""
import sys
sys.path.insert(0, '.')

from datetime import datetime, timedelta
from app.database import SessionLocal, engine, Base
from app.models import (
    User, Team, Lead, Client, Task, FollowUp, Invoice, InvoiceItem, 
    Note, AuditLog, CompanySettings
)
from app.utils.security import get_password_hash


DEFAULT_COMPANY_ID = 1


def hash_password(password: str) -> str:
    return get_password_hash(password)


def seed_database():
    # Create tables (optional; use applied SQL schema for PostgreSQL)
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    try:
        # Check if already seeded
        existing_user = db.query(User).first()
        if existing_user:
            print("Database already seeded. Skipping...")
            return
        
        print("Seeding database...")
        
        # =====================
        # 1. Create Teams
        # =====================
        print("Creating teams...")
        teams = [
            Team(name="Sales Alpha", company_id=DEFAULT_COMPANY_ID),
            Team(name="Sales Bravo", company_id=DEFAULT_COMPANY_ID),
            Team(name="Sales Charlie", company_id=DEFAULT_COMPANY_ID),
            Team(name="Enterprise", company_id=DEFAULT_COMPANY_ID)
        ]
        db.add_all(teams)
        db.commit()
        
        for team in teams:
            db.refresh(team)
        
        # =====================
        # 2. Create Users
        # =====================
        print("Creating users...")
        
        # Admin user (company_id=None for Platform Admin)
        admin = User(
            email="admin@company.com",
            full_name="System Admin",
            hashed_password=hash_password("admin123"),
            role="admin",
            status="active"
        )
        db.add(admin)
        
        # MD user
        md = User(
            email="md@company.com",
            full_name="John Director",
            hashed_password=hash_password("md123"),
            role="md",
            status="active",
            company_id=DEFAULT_COMPANY_ID
        )
        db.add(md)
        
        # Purchase user
        purchase = User(
            email="purchase@company.com",
            full_name="Lisa Purchase",
            hashed_password=hash_password("purchase123"),
            role="purchase",
            status="active",
            company_id=DEFAULT_COMPANY_ID
        )
        db.add(purchase)
        
        # Managers
        manager1 = User(
            email="mike.b@company.com",
            full_name="Mike Brown",
            hashed_password=hash_password("manager123"),
            role="manager",
            status="active",
            team_id=teams[0].id,
            company_id=DEFAULT_COMPANY_ID
        )
        manager2 = User(
            email="james.w@company.com",
            full_name="James Wilson",
            hashed_password=hash_password("manager123"),
            role="manager",
            status="active",
            team_id=teams[1].id,
            company_id=DEFAULT_COMPANY_ID
        )
        db.add_all([manager1, manager2])
        db.commit()
        
        # Sales executives
        sales_users = [
            User(
                email="alex.j@company.com",
                full_name="Alex Johnson",
                hashed_password=hash_password("sales123"),
                role="sales",
                status="active",
                team_id=teams[0].id,
                manager_id=manager1.id,
                company_id=DEFAULT_COMPANY_ID
            ),
            User(
                email="sarah.s@company.com",
                full_name="Sarah Smith",
                hashed_password=hash_password("sales123"),
                role="sales",
                status="active",
                team_id=teams[0].id,
                manager_id=manager1.id,
                company_id=DEFAULT_COMPANY_ID
            ),
            User(
                email="emily.b@company.com",
                full_name="Emily Brown",
                hashed_password=hash_password("sales123"),
                role="sales",
                status="active",
                team_id=teams[1].id,
                manager_id=manager2.id,
                company_id=DEFAULT_COMPANY_ID
            )
        ]
        db.add_all(sales_users)
        db.commit()
        
        for user in sales_users:
            db.refresh(user)
        
        # =====================
        # 3. Create Leads
        # =====================
        print("Creating leads...")
        leads = [
            Lead(
                name="John Smith",
                email="john@acmecorp.com",
                phone="+1 555-0101",
                company="Acme Corp",
                status="New",
                source="Website",
                service_type="Consulting",
                assigned_to_id=sales_users[0].id,
                team_id=teams[0].id,
                company_id=DEFAULT_COMPANY_ID
            ),
            Lead(
                name="Sarah Johnson",
                email="sarah@techstart.io",
                phone="+1 555-0102",
                company="TechStart Inc",
                status="Contacted",
                source="Referral",
                last_contacted_at=datetime.now() - timedelta(days=2),
                assigned_to_id=sales_users[0].id,
                team_id=teams[0].id,
                company_id=DEFAULT_COMPANY_ID
            ),
            Lead(
                name="Mike Williams",
                email="mike@designco.com",
                phone="+1 555-0103",
                company="Design Co",
                status="Qualified",
                source="LinkedIn",
                last_response_at=datetime.now() - timedelta(days=1),
                assigned_to_id=sales_users[1].id,
                team_id=teams[0].id,
                company_id=DEFAULT_COMPANY_ID
            ),
            Lead(
                name="Emily Davis",
                email="emily@startup.io",
                phone="+1 555-0104",
                company="Startup IO",
                status="New",
                source="Cold Call",
                assigned_to_id=sales_users[2].id,
                team_id=teams[1].id,
                company_id=DEFAULT_COMPANY_ID
            ),
            Lead(
                name="David Lee",
                email="david@enterprise.com",
                phone="+1 555-0105",
                company="Enterprise Solutions",
                status="Proposal",
                source="Trade Show",
                assigned_to_id=sales_users[0].id,
                team_id=teams[0].id,
                company_id=DEFAULT_COMPANY_ID
            )
        ]
        db.add_all(leads)
        db.commit()
        
        for lead in leads:
            db.refresh(lead)
        
        # =====================
        # 4. Create Clients
        # =====================
        print("Creating clients...")
        clients = [
            Client(
                name="Global Tech",
                email="contact@globaltech.com",
                phone="+1 555-0201",
                company="Global Tech Industries",
                address="123 Tech Blvd, San Francisco, CA",
                assigned_to_id=sales_users[0].id,
                team_id=teams[0].id,
                company_id=DEFAULT_COMPANY_ID
            ),
            Client(
                name="Retail Giants",
                email="sales@retailgiants.com",
                phone="+1 555-0202",
                company="Retail Giants Corp",
                address="456 Commerce St, New York, NY",
                assigned_to_id=sales_users[1].id,
                team_id=teams[0].id,
                company_id=DEFAULT_COMPANY_ID
            )
        ]
        db.add_all(clients)
        db.commit()
        
        for client in clients:
            db.refresh(client)
        
        # =====================
        # 5. Create Tasks
        # =====================
        print("Creating tasks...")
        tasks = [
            Task(
                title="Send proposal to Acme Corp",
                description="Prepare and send the Q1 proposal",
                status="Pending",
                priority="high",
                due_date=datetime.now() - timedelta(days=1),  # Overdue
                lead_id=leads[0].id,
                assigned_to_id=sales_users[0].id,
                is_manager_assigned=True,
                company_id=DEFAULT_COMPANY_ID
            ),
            Task(
                title="Call TechStart about requirements",
                status="Pending",
                priority="medium",
                due_date=datetime.now() + timedelta(hours=2),  # Today
                lead_id=leads[1].id,
                assigned_to_id=sales_users[0].id,
                company_id=DEFAULT_COMPANY_ID
            ),
            Task(
                title="Prepare demo for Design Co",
                status="Pending",
                priority="medium",
                due_date=datetime.now() + timedelta(days=1),  # Tomorrow
                lead_id=leads[2].id,
                assigned_to_id=sales_users[1].id,
                company_id=DEFAULT_COMPANY_ID
            ),
            Task(
                title="Quarterly review with Global Tech",
                status="Pending",
                priority="high",
                due_date=datetime.now() + timedelta(days=2),
                client_id=clients[0].id,
                assigned_to_id=sales_users[0].id,
                company_id=DEFAULT_COMPANY_ID
            )
        ]
        db.add_all(tasks)
        db.commit()
        
        # =====================
        # 6. Create Follow-ups
        # =====================
        print("Creating follow-ups...")
        follow_ups = [
            FollowUp(
                lead_id=leads[0].id,
                scheduled_date=datetime.now().date(),
                notes="Discuss pricing options",
                created_by_id=sales_users[0].id,
                company_id=DEFAULT_COMPANY_ID
            ),
            FollowUp(
                lead_id=leads[1].id,
                scheduled_date=(datetime.now() - timedelta(days=1)).date(),
                notes="Send updated proposal",
                status="Pending",
                created_by_id=sales_users[0].id,
                company_id=DEFAULT_COMPANY_ID
            )
        ]
        db.add_all(follow_ups)
        db.commit()
        
        # =====================
        # 7. Create Invoices
        # =====================
        print("Creating invoices...")
        invoice1 = Invoice(
            invoice_number="INV-2024-001",
            client_id=clients[0].id,
            subtotal=10000.0,
            tax=0,
            total=10000.0,
            status="Paid",
            issued_date=datetime.now().date() - timedelta(days=15),
            due_date=datetime.now().date() - timedelta(days=5),
            paid_date=datetime.now().date() - timedelta(days=3),
            created_by_id=sales_users[0].id,
            company_id=DEFAULT_COMPANY_ID
        )
        invoice2 = Invoice(
            invoice_number="INV-2024-002",
            client_id=clients[1].id,
            subtotal=8500.0,
            tax=0,
            total=8500.0,
            status="Pending",
            issued_date=datetime.now().date() - timedelta(days=5),
            due_date=datetime.now().date() + timedelta(days=25),
            created_by_id=sales_users[1].id,
            company_id=DEFAULT_COMPANY_ID
        )
        db.add_all([invoice1, invoice2])
        db.commit()
        
        # Add invoice items
        items = [
            InvoiceItem(invoice_id=invoice1.id, description="CRM Pro License", quantity=1, unit_price=10000, total=10000),
            InvoiceItem(invoice_id=invoice2.id, description="Analytics Suite", quantity=1, unit_price=8500, total=8500)
        ]
        db.add_all(items)
        db.commit()
        
        # =====================
        # 8. Create Company Settings
        # =====================
        print("Creating company settings...")
        settings = CompanySettings(
            company_id=DEFAULT_COMPANY_ID,
            company_name="Demo CRM Company",
            address="123 Business Ave, Suite 100",
            invoice_prefix="INV",
            tax_rate=18.0,
            payment_terms="Net 30 days"
        )
        db.add(settings)
        db.commit()
        
        print("=" * 50)
        print("Database seeded successfully!")
        print("=" * 50)
        print("\nTest Credentials:")
        print("-" * 50)
        print("Admin:    admin@company.com / admin123")
        print("MD:       md@company.com / md123")
        print("Purchase: purchase@company.com / purchase123")
        print("Manager:  mike.b@company.com / manager123")
        print("Sales:    alex.j@company.com / sales123")
        print("-" * 50)
        
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
