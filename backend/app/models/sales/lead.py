from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.core.enums import LeadStatus


class Lead(Base):
    __tablename__ = "leads"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    company = Column(String(255), nullable=True)
    
    status = Column(Enum(LeadStatus, values_callable=lambda x: [e.value for e in x], native_enum=False), default=LeadStatus.ACTIVE)
    source = Column(String(100), nullable=True)  # Website, Referral, Cold Call, etc.
    service_type = Column(String(100), nullable=True)
    
    notes = Column(Text, nullable=True)
    
    # Ownership
    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=True)
    
    # Tracking dates
    last_contacted_at = Column(DateTime, nullable=True)
    last_response_at = Column(DateTime, nullable=True)
    next_follow_up = Column(DateTime, nullable=True)
    converted_at = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    tenant = relationship("Company", backref="leads", foreign_keys=[company_id])
    assigned_to = relationship("User", back_populates="leads")
    team = relationship("Team", back_populates="leads")
    tasks = relationship("Task", back_populates="lead", cascade="all, delete-orphan")
    follow_ups = relationship("FollowUp", back_populates="lead", cascade="all, delete-orphan")
    notes_list = relationship("Note", back_populates="lead", cascade="all, delete-orphan")
