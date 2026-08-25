from sqlalchemy import Column, Integer, String, DateTime, Date, ForeignKey, Enum, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.core.enums import ApiKeyAccess


class ApiKey(Base):
    __tablename__ = "api_keys"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    name = Column(String(80), nullable=False)
    prefix = Column(String(32), unique=True, nullable=False, index=True)
    token_hash = Column(String(64), unique=True, nullable=False, index=True)
    access = Column(
        Enum(ApiKeyAccess, values_callable=lambda x: [e.value for e in x], native_enum=False),
        nullable=False,
    )
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    company = relationship("Company")
    created_by = relationship("User")


class ApiUsageDaily(Base):
    __tablename__ = "api_usage_daily"
    __table_args__ = (UniqueConstraint("company_id", "usage_date", name="uq_api_usage_company_date"),)

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    usage_date = Column(Date, nullable=False)
    request_count = Column(Integer, nullable=False, default=0)

    company = relationship("Company")
