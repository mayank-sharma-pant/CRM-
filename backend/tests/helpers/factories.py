"""Small test factories for common business entities."""

from app.models import Company, Client


def create_company(db, *, name: str, company_code: str, status: str = "active") -> Company:
    company = Company(name=name, company_code=company_code, status=status)
    db.add(company)
    db.commit()
    db.refresh(company)
    return company


def create_client(db, *, company_id: int, name: str, assigned_to_id: int | None = None, **extra) -> Client:
    client = Client(company_id=company_id, name=name, assigned_to_id=assigned_to_id, **extra)
    db.add(client)
    db.commit()
    db.refresh(client)
    return client
