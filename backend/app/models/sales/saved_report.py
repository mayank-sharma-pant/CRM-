from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.core.enums import SavedReportType


class SavedReport(Base):
    __tablename__ = "saved_reports"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    report_type = Column(
        Enum(SavedReportType, values_callable=lambda x: [e.value for e in x], native_enum=False),
        nullable=False,
    )
    filters = Column(JSON, nullable=False)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    company = relationship("Company")
    created_by = relationship("User")
