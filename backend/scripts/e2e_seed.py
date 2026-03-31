"""Seed deterministic E2E data for Playwright flows."""

import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from app.database import Base, engine, SessionLocal
import app.models  # noqa: F401 - ensure model metadata is registered
from app.models import Company, User, Client
from app.models.core.team import Team
from app.models.core.team_membership import TeamMembership
from app.utils.security import get_password_hash


def main():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    session = SessionLocal()
    try:
        company = Company(
            name="E2E Automation Company",
            company_code="E2E",
            status="active",
        )
        session.add(company)
        session.flush()

        password = get_password_hash("Passw0rd!")
        purchase = User(
            email="purchase.e2e@crm.local",
            full_name="E2E Purchase",
            hashed_password=password,
            role="purchase",
            company_id=company.id,
            status="active",
            is_active=True,
            employee_num=1,
        )
        sales = User(
            email="sales.e2e@crm.local",
            full_name="E2E Sales",
            hashed_password=password,
            role="sales",
            company_id=company.id,
            status="active",
            is_active=True,
            employee_num=2,
        )
        manager = User(
            email="manager.e2e@crm.local",
            full_name="E2E Manager",
            hashed_password=password,
            role="manager",
            company_id=company.id,
            status="active",
            is_active=True,
            employee_num=3,
        )
        md = User(
            email="md.e2e@crm.local",
            full_name="E2E MD",
            hashed_password=password,
            role="md",
            company_id=company.id,
            status="active",
            is_active=True,
            employee_num=4,
        )

        session.add_all([purchase, sales, manager, md])
        session.flush()

        alpha_team = Team(
            name="Alpha Squad",
            company_id=company.id,
        )
        session.add(alpha_team)
        session.flush()

        memberships = [
            TeamMembership(company_id=company.id, team_id=alpha_team.id, user_id=purchase.id),
            TeamMembership(company_id=company.id, team_id=alpha_team.id, user_id=sales.id),
            TeamMembership(company_id=company.id, team_id=alpha_team.id, user_id=manager.id),
        ]
        session.add_all(memberships)
        session.flush()

        customer = Client(
            company_id=company.id,
            name="E2E Client",
            email="e2e-client@crm.local",
            assigned_to_id=sales.id,
        )
        session.add(customer)
        session.commit()
        print("E2E seed complete.")
    finally:
        session.close()


if __name__ == "__main__":
    main()
