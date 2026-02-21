from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class LedgerEntry(Base):
    __tablename__ = "ledger_entries"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    ledger_slug = Column(String, index=True, nullable=False)
    
    # Store dynamic fields as JSON
    # Structure depends on the ledger_slug schema defined in routers/ledgers.py
    data = Column(JSON, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(Integer, ForeignKey("users.id"))

    company = relationship("Company", backref="ledger_entries")
    creator = relationship("User")
