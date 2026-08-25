from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    website = Column(String(500), nullable=True)
    phone = Column(String(50), nullable=True)
    gstin = Column(String(15), nullable=True)
    address = Column(Text, nullable=True)
    industry = Column(String(100), nullable=True)
    linkedin_url = Column(String(500), nullable=True)
    enriched_at = Column(DateTime, nullable=True)
    enrichment_source = Column(String(32), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    contacts = relationship("Client", back_populates="account")
