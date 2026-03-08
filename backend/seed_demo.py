import sys
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from passlib.context import CryptContext

# Adjust this path based on your database url
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.database import Base, SessionLocal
from app.utils.security import get_password_hash
from app.models.user import User
from app.models.company import Company
from app.models.client import Client
from app.models.lead import Lead

def run():
    db = SessionLocal()

    print("Cleaning database...")
    # Clean previous demo records to prevent constraints
    db.query(User).filter(User.email.like('%@demo.com')).delete(synchronize_session=False)
    db.query(Company).filter(Company.name == "Demo Corp").delete(synchronize_session=False)
    db.commit()

    print("Creating Demo Company...")
    company = Company(
        name="Demo Corp",
        plan="enterprise",
        status="active"
    )
    db.add(company)
    db.commit()
    db.refresh(company)

    print("Creating MD (Managing Director)...")
    md = User(
        email="md@demo.com",
        full_name="Managing Director",
        hashed_password=get_password_hash("password123"),
        role="md",
        status="active",
        company_id=company.id
    )
    db.add(md)
    db.commit()

    print("Creating Demo Manager...")
    manager = User(
        email="manager@demo.com",
        full_name="Sales Manager",
        hashed_password=get_password_hash("password123"),
        role="manager",
        status="active",
        company_id=company.id
    )
    db.add(manager)
    db.commit()
    db.refresh(manager)

    print("Creating Demo Sales...")
    sales = User(
        email="sales@demo.com",
        full_name="Sales Agent",
        hashed_password=get_password_hash("password123"),
        role="sales",
        status="active",
        company_id=company.id,
        manager_id=manager.id
    )
    db.add(sales)
    db.commit()
    db.refresh(sales)

    print("Creating Demo Purchase...")
    purchase = User(
        email="purchase@demo.com",
        full_name="Purchase Rep",
        hashed_password=get_password_hash("password123"),
        role="purchase",
        status="active",
        company_id=company.id
    )
    db.add(purchase)
    db.commit()

    print("Creating Initial Leads...")
    lead = Lead(
        name="Demo Lead",
        email="lead@external.com",
        company="External Corp",
        status="New",
        company_id=company.id,
        assigned_to_id=sales.id
    )
    db.add(lead)
    db.commit()

    print(f"Company ID: {company.id}")
    print("Passwords are 'password123' for:")
    print(" - md@demo.com")
    print(" - manager@demo.com")
    print(" - sales@demo.com")
    print(" - purchase@demo.com")

if __name__ == "__main__":
    run()
