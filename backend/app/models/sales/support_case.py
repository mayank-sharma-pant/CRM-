from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.sql import func

from app.database import Base


class SupportCase(Base):
    __tablename__ = "support_cases"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True, index=True)
    subject = Column(String(200), nullable=False)
    body = Column(Text, nullable=False)
    status = Column(String(16), nullable=False, default="open")
    requester_name = Column(String(255), nullable=True)
    requester_email = Column(String(255), nullable=True)
    source = Column(String(8), nullable=False, default="crm")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class WebToCaseForm(Base):
    __tablename__ = "web_to_case_forms"
    __table_args__ = (UniqueConstraint("company_id", name="uq_web_to_case_forms_company"),)

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    slug = Column(String(64), nullable=False, unique=True, index=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, server_default=func.now())
