from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, index=True)
    stored_filename = Column(String, unique=True, index=True)
    file_path = Column(String)
    file_size = Column(Integer, nullable=False, default=0)

    # Relationships
    lead_id = Column(Integer, ForeignKey("leads.id", ondelete="CASCADE"), nullable=True)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"))
    uploaded_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # ORM relationships
    lead = relationship("Lead", backref="documents")
    client = relationship("Client", backref="documents")
    company = relationship("Company")
    uploaded_by = relationship("User")
