from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Date, Time
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class FollowUp(Base):
    __tablename__ = "follow_ups"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Related lead
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False)
    
    # Scheduling
    scheduled_date = Column(Date, nullable=False)
    scheduled_time = Column(Time, nullable=True)
    
    status = Column(String(50), default="Pending")  # Pending, Completed, Cancelled
    outcome = Column(Text, nullable=True)  # Result of the follow-up
    notes = Column(Text, nullable=True)
    
    # Completed
    completed_at = Column(DateTime, nullable=True)
    
    # Owner
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    lead = relationship("Lead", back_populates="follow_ups")
    created_by = relationship("User", back_populates="follow_ups")
