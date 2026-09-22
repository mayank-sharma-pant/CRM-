from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.sql import func

from app.database import Base


class QuotePlan(Base):
    """Tenant-defined quotation plan catalog (name, default price, scope)."""

    __tablename__ = "quote_plans"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    tagline = Column(String(255), nullable=True)
    billing_interval = Column(String(20), nullable=False, default="monthly")
    default_fee = Column(Numeric(12, 2), nullable=False, default=0)
    fee_inclusive = Column(Boolean, nullable=False, default=True)
    scope_text = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
