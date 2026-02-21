from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    admin_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    admin_name = Column(String(255), nullable=False, default="System")
    action = Column(String(100), nullable=False, index=True)
    entity_type = Column(String(50), nullable=False)  # user, team, settings, etc.
    entity_id = Column(String(50), nullable=True)
    entity_name = Column(String(255), nullable=True)
    before_value = Column(Text, nullable=True)
    after_value = Column(Text, nullable=True)
    
    # Relationships
    company = relationship("Company", backref="audit_logs")
    admin = relationship("User", foreign_keys=[admin_id])
