from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func

from app.database import Base


class LeadForm(Base):
    __tablename__ = "lead_forms"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, unique=True, index=True)
    slug = Column(String(64), nullable=False, unique=True, index=True)
    name = Column(String(255), nullable=False, default="Website")
    headline = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    default_team_id = Column(Integer, ForeignKey("teams.id"), nullable=True)
    default_source = Column(String(100), default="Website")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
